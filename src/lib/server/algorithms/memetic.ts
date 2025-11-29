import type { Solver, SolverResult, ScheduleEntry, Class, Room } from './types';

// --- Helpers (Duplicated for now to keep file self-contained) ---
function calculateEndTime(startTime: string, durationHours: number): string {
	const [hour, minute] = startTime.split(':').map(Number);
	const totalMinutes = hour * 60 + minute + durationHours * 60;
	const endHour = Math.floor(totalMinutes / 60);
	const endMinute = totalMinutes % 60;
	return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
}

function isOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
	return start1 < end2 && start2 < end1;
}

// --- Memetic Algorithm Constants ---
const POPULATION_SIZE = 50;
const GENERATIONS = 50;
const MUTATION_RATE = 0.1;
const ELITISM_COUNT = 2;

// --- Types ---
interface Gene {
	taskId: string;
	roomId: number;
	day: string;
	startTimeIndex: number;
}

interface Individual {
	genes: Gene[];
	fitness: number;
}

interface Task {
	id: string;
	classData: any;
	type: 'Lecture' | 'Lab';
	hours: number;
	slotsNeeded: number;
	possibleRooms: Room[];
	possibleDays: string[];
}

export const solveMemetic: Solver = (classes, rooms, timeSlots, constraints) => {
	const SLOT_DURATION_HOURS = 0.5;
	const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

	// 1. Preprocess Tasks
	const tasks: Task[] = [];
	classes.forEach((cls) => {
		// Parse lecture_days with robust handling for double-encoding
		let lectureDays = cls.lecture_days;
		if (typeof lectureDays === 'string') {
			try {
				const parsed = JSON.parse(lectureDays);
				if (Array.isArray(parsed)) {
					lectureDays = parsed;
				} else if (typeof parsed === 'string') {
					// Handle potential double-encoding
					try {
						const doubleParsed = JSON.parse(parsed);
						if (Array.isArray(doubleParsed)) {
							lectureDays = doubleParsed;
						}
					} catch (e) {
						// Ignore second parse error
					}
				}
			} catch (e) {
				console.error(`Failed to parse lecture_days for class ${cls.id}:`, e);
				lectureDays = [];
			}
		}

		// Ensure it is an array
		if (!Array.isArray(lectureDays)) {
			lectureDays = [];
		}

		let possibleDays: string[];

		if (lectureDays.length > 0) {
			// If specific days are requested, use them (bypass exclusion rules)
			possibleDays = lectureDays;
		} else {
			// Otherwise, use all days minus excluded days
			possibleDays = DAYS.filter((d) => !constraints.excludedDays?.includes(d));
		}

		if (cls.subjects.lecture_hours > 0) {
			if (cls.split_lecture) {
				const splitHours = Number(cls.subjects.lecture_hours) / 2;
				tasks.push({
					id: `${cls.id}_Lecture_1`,
					classData: cls,
					type: 'Lecture',
					hours: splitHours,
					slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
					possibleRooms: rooms.filter(
						(r) =>
							(!constraints.enforceRoomType || r.type === 'Lecture') &&
							(!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students)
					),
					possibleDays: possibleDays
				});
				tasks.push({
					id: `${cls.id}_Lecture_2`,
					classData: cls,
					type: 'Lecture',
					hours: splitHours,
					slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
					possibleRooms: rooms.filter(
						(r) =>
							(!constraints.enforceRoomType || r.type === 'Lecture') &&
							(!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students)
					),
					possibleDays: possibleDays
				});
			} else {
				tasks.push({
					id: `${cls.id}_Lecture`,
					classData: cls,
					type: 'Lecture',
					hours: Number(cls.subjects.lecture_hours),
					slotsNeeded: Math.ceil(Number(cls.subjects.lecture_hours) / SLOT_DURATION_HOURS),
					possibleRooms: rooms.filter(
						(r) =>
							(!constraints.enforceRoomType || r.type === 'Lecture') &&
							(!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students)
					),
					possibleDays: possibleDays
				});
			}
		}
		if (cls.subjects.lab_hours > 0) {
			tasks.push({
				id: `${cls.id}_Lab`,
				classData: cls,
				type: 'Lab',
				hours: Number(cls.subjects.lab_hours),
				slotsNeeded: Math.ceil(Number(cls.subjects.lab_hours) / SLOT_DURATION_HOURS),
				possibleRooms: rooms.filter((r) => {
					const capOk = !constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
					const typeOk = constraints.roomTypeConstraint === 'strict' ? r.type === 'Lab' : true;
					return capOk && typeOk;
				}),
				possibleDays: DAYS
			});
		}
	});

	// --- Helper: Random Gene ---
	function createRandomGene(task: Task): Gene {
		const room =
			task.possibleRooms[Math.floor(Math.random() * task.possibleRooms.length)] || rooms[0]; // Fallback if no valid rooms (shouldn't happen if data is good)
		const day = task.possibleDays[Math.floor(Math.random() * task.possibleDays.length)];
		const maxStartIndex = Math.max(0, timeSlots.length - task.slotsNeeded);
		const startTimeIndex = Math.floor(Math.random() * (maxStartIndex + 1));

		return {
			taskId: task.id,
			roomId: room.id,
			day,
			startTimeIndex
		};
	}

	// --- Fitness Function ---
	function calculateFitness(genes: Gene[]): number {
		let score = 1000; // Start with a base score
		let conflicts = 0;

		// Convert genes to a more queryable format for conflict checking
		// We'll just iterate O(N^2) for now, N is small enough (classes per program)
		for (let i = 0; i < genes.length; i++) {
			const geneA = genes[i];
			const taskA = tasks.find((t) => t.id === geneA.taskId)!;
			const startA = timeSlots[geneA.startTimeIndex];
			const endA = calculateEndTime(startA, taskA.hours);

			// Check validity of the gene itself (e.g. room capacity)
			// We filtered possibleRooms, so room type/capacity should be OK if createRandomGene respects it.
			// But mutation might break it if we are not careful.
			// For now, assume genes are always valid regarding "static" constraints (room type, capacity)
			// because we only pick from `possibleRooms`.

			// Soft Constraint: Room Type
			if (constraints.roomTypeConstraint === 'soft') {
				const roomA = rooms.find((r) => r.id === geneA.roomId);
				if (roomA && roomA.type !== taskA.type) {
					// Penalty for using wrong room type
					score -= 10; 
				}
			}

			for (let j = i + 1; j < genes.length; j++) {
				const geneB = genes[j];
				const taskB = tasks.find((t) => t.id === geneB.taskId)!;
				const startB = timeSlots[geneB.startTimeIndex];
				const endB = calculateEndTime(startB, taskB.hours);

				// Check overlap
				if (geneA.day === geneB.day) {
					if (isOverlap(startA, endA, startB, endB)) {
						// Room Conflict
						if (geneA.roomId === geneB.roomId) {
							conflicts++;
							score -= 100;
						}
						// Instructor Conflict
						if (
							constraints.enforceInstructor &&
							taskA.classData.instructor_id &&
							taskA.classData.instructor_id === taskB.classData.instructor_id
						) {
							conflicts++;
							score -= 100;
						}
						// Block Conflict
						if (
							constraints.enforceBlock &&
							taskA.classData.block_id === taskB.classData.block_id
						) {
							conflicts++;
							score -= 100;
						}
					}
				}
			}
		}

		// Soft Constraints (Optional)
		// e.g. Preference for earlier classes, compact schedules, etc.
		// For now, let's just focus on hard constraints (0 conflicts).

		return score;
	}

	// --- Initialization ---
	let population: Individual[] = [];
	for (let i = 0; i < POPULATION_SIZE; i++) {
		const genes = tasks.map((task) => createRandomGene(task));
		population.push({ genes, fitness: calculateFitness(genes) });
	}

	// --- Evolution Loop ---
	for (let generation = 0; generation < GENERATIONS; generation++) {
		// Sort by fitness (descending)
		population.sort((a, b) => b.fitness - a.fitness);

		// Check for perfect solution
		if (population[0].fitness === 1000) break; // Assuming 1000 is max score (0 conflicts)

		const newPopulation: Individual[] = [];

		// Elitism
		for (let i = 0; i < ELITISM_COUNT; i++) {
			newPopulation.push(population[i]);
		}

		// Crossover & Mutation
		while (newPopulation.length < POPULATION_SIZE) {
			// Tournament Selection
			const parent1 = population[Math.floor(Math.random() * POPULATION_SIZE)];
			const parent2 = population[Math.floor(Math.random() * POPULATION_SIZE)];

			// Uniform Crossover
			const childGenes: Gene[] = [];
			for (let i = 0; i < tasks.length; i++) {
				childGenes.push(Math.random() < 0.5 ? parent1.genes[i] : parent2.genes[i]);
			}

			// Mutation
			if (Math.random() < MUTATION_RATE) {
				const indexToMutate = Math.floor(Math.random() * tasks.length);
				childGenes[indexToMutate] = createRandomGene(tasks[indexToMutate]);
			}

			newPopulation.push({ genes: childGenes, fitness: calculateFitness(childGenes) });
		}

		population = newPopulation;
		
		// Local Search (Memetic part) - Apply to top individuals
		// Simple Hill Climbing: Try to move a random gene to a better spot
		for(let i=0; i<5; i++) { // Top 5
			const individual = population[i];
			const originalFitness = individual.fitness;
			
			// Try mutating one gene to see if it improves
			const indexToMutate = Math.floor(Math.random() * tasks.length);
			const originalGene = individual.genes[indexToMutate];
			const newGene = createRandomGene(tasks[indexToMutate]);
			
			individual.genes[indexToMutate] = newGene;
			const newFitness = calculateFitness(individual.genes);
			
			if (newFitness > originalFitness) {
				individual.fitness = newFitness;
			} else {
				individual.genes[indexToMutate] = originalGene; // Revert
			}
		}
	}

	// --- Result ---
	population.sort((a, b) => b.fitness - a.fitness);
	const bestSolution = population[0];

	// Convert genes to ScheduleEntries
	const scheduledEntries: ScheduleEntry[] = [];
	const failedClasses: { class: string; reason: string }[] = [];

	const acceptedGenes: Gene[] = [];
	
	for (const gene of bestSolution.genes) {
		const task = tasks.find((t) => t.id === gene.taskId)!;
		const start = timeSlots[gene.startTimeIndex];
		const end = calculateEndTime(start, task.hours);
		
		let isConflict = false;
		for (const accepted of acceptedGenes) {
			const acceptedTask = tasks.find((t) => t.id === accepted.taskId)!;
			const acceptedStart = timeSlots[accepted.startTimeIndex];
			const acceptedEnd = calculateEndTime(acceptedStart, acceptedTask.hours);

			if (gene.day === accepted.day) {
				if (isOverlap(start, end, acceptedStart, acceptedEnd)) {
					// Check specific conflicts
					if (gene.roomId === accepted.roomId) isConflict = true;
					if (constraints.enforceInstructor && task.classData.instructor_id && task.classData.instructor_id === acceptedTask.classData.instructor_id) isConflict = true;
					if (constraints.enforceBlock && task.classData.block_id === acceptedTask.classData.block_id) isConflict = true;
				}
			}
			if(isConflict) break;
		}

		if (!isConflict) {
			acceptedGenes.push(gene);
			// Create a single entry for the entire duration
			scheduledEntries.push({
				class_id: task.classData.id,
				room_id: gene.roomId,
				day_of_week: gene.day,
				start_time: start + ':00',
				end_time: end + ':00',
				course_type: task.type
			});
		} else {
			failedClasses.push({
				class: `${task.classData.subjects.subject_code} (${task.type})`,
				reason: 'Conflict detected in best solution.'
			});
		}
	}

	return {
		success: failedClasses.length === 0,
		scheduledEntries,
		failedClasses
	};
};

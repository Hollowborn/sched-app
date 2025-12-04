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
							(constraints.roomTypeConstraint !== 'strict' || r.type === 'Lecture') &&
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
							(constraints.roomTypeConstraint !== 'strict' || r.type === 'Lecture') &&
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
							(constraints.roomTypeConstraint !== 'strict' || r.type === 'Lecture') &&
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
				possibleDays: possibleDays
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
		let hardConflictCount = 0;
		let softConflictCount = 0;

		// Build lookup for classes and their types (Lecture, Lab, split parts)
		// This helps efficiently check Lecture/Lab same-day constraint.
		const classToGenesMap = new Map<number, { gene: Gene; task: Task }[]>();
		for (const gene of genes) {
			const task = tasks.find((t) => t.id === gene.taskId)!;
			if (!classToGenesMap.has(task.classData.id)) {
				classToGenesMap.set(task.classData.id, []);
			}
			classToGenesMap.get(task.classData.id)?.push({ gene, task });
		}

		// First pass: Check single-gene constraints (Break Time, Split Lecture, Lec/Lab)
		for (const gene of genes) {
			const task = tasks.find((t) => t.id === gene.taskId)!;
			const start = timeSlots[gene.startTimeIndex];
			const end = calculateEndTime(start, task.hours);

			// --- Hard Constraint: Break Time Overlap ---
			if (constraints.breakTime && constraints.breakTime !== 'none') {
				const breakStart = constraints.breakTime.split('-')[0] + ':00';
				const breakEnd = constraints.breakTime.split('-')[1] + ':00';
				if (isOverlap(start + ':00', end + ':00', breakStart, breakEnd)) {
					hardConflictCount++;
				}
			}

			// --- Hard Constraint: Split Lecture Same Day ---
			if (task.id.includes('_Lecture_')) {
				const parts = task.id.split('_');
				const classId = Number(parts[0]);
				const splitPart = parts[2];

				if (splitPart === '1' || splitPart === '2') {
					const siblingSplitPart = splitPart === '1' ? '2' : '1';
					const siblingTaskId = `${classId}_Lecture_${siblingSplitPart}`;
					const siblingGene = genes.find((g) => g.taskId === siblingTaskId);

					if (siblingGene && gene.day === siblingGene.day) {
						hardConflictCount++;
					}
				}
			}

			// --- Hard Constraint: Lecture/Lab Same Day ---
			// Check if this gene's class has a sibling (Lecture/Lab) on the same day
			const siblingsOfSameClass = classToGenesMap.get(task.classData.id) || [];
			for (const sibling of siblingsOfSameClass) {
				if (
					sibling.gene.taskId !== gene.taskId && // Not the same gene
					sibling.task.type !== task.type && // Must be different types (Lecture vs Lab)
					sibling.gene.day === gene.day && // Must be on the same day
					// Ensure we only count this conflict once (e.g., from Lecture side, not also from Lab side)
					task.type === 'Lecture' &&
					sibling.task.type === 'Lab'
				) {
					hardConflictCount++;
				}
			}

			// Soft Constraint: Room Type
			if (constraints.roomTypeConstraint === 'soft') {
				const roomA = rooms.find((r) => r.id === gene.roomId);
				if (roomA && roomA.type !== task.type) {
					softConflictCount++;
				}
			}
		}

		// Second pass: Check inter-gene hard conflicts (Room, Instructor, Block)
		for (let i = 0; i < genes.length; i++) {
			const geneA = genes[i];
			const taskA = tasks.find((t) => t.id === geneA.taskId)!;
			const startA = timeSlots[geneA.startTimeIndex];
			const endA = calculateEndTime(startA, taskA.hours);

			for (let j = i + 1; j < genes.length; j++) {
				const geneB = genes[j];
				const taskB = tasks.find((t) => t.id === geneB.taskId)!;
				const startB = timeSlots[geneB.startTimeIndex];
				const endB = calculateEndTime(startB, taskB.hours);

				if (
					geneA.day === geneB.day &&
					isOverlap(startA + ':00', endA + ':00', startB + ':00', endB + ':00')
				) {
					// Room Conflict
					if (geneA.roomId === geneB.roomId) hardConflictCount++;
					// Instructor Conflict
					if (
						constraints.enforceInstructor &&
						taskA.classData.instructor_id &&
						taskA.classData.instructor_id === taskB.classData.instructor_id
					) {
						hardConflictCount++;
					}
					// Block Conflict
					if (constraints.enforceBlock && taskA.classData.block_id === taskB.classData.block_id) {
						hardConflictCount++;
					}
				}
			}
		}

		// Fitness function: Prioritize no hard conflicts.
		// A higher score is better. If hard conflicts exist, score is very negative.
		// If no hard conflicts, score is higher for fewer soft conflicts.
		if (hardConflictCount > 0) {
			return -hardConflictCount * 1_000_000;
		} else {
			let score = genes.length * 1000; // Base score
			score -= softConflictCount * 50; // Penalize soft conflicts (e.g. room type mismatch)

			// --- NEW: Preferred Room Bonus ---
			for (const gene of genes) {
				const task = tasks.find((t) => t.id === gene.taskId)!;
				if (task.classData.pref_room_id && task.classData.pref_room_id === gene.roomId) {
					score += 20; // Bonus for using preferred room
				}
			}

			// --- NEW: Block Schedule Optimization (Gap Minimization & Grouping) ---
			// Group genes by block_id
			const blockSchedule = new Map<number, { day: string; start: number; end: number }[]>();
			
			for (const gene of genes) {
				const task = tasks.find((t) => t.id === gene.taskId)!;
				const blockId = task.classData.block_id;
				
				if (!blockSchedule.has(blockId)) {
					blockSchedule.set(blockId, []);
				}
				
				const start = gene.startTimeIndex; // Using index as proxy for time (assuming linear slots)
				const durationSlots = task.slotsNeeded;
				const end = start + durationSlots;
				
				blockSchedule.get(blockId)?.push({ day: gene.day, start, end });
			}

			// Analyze each block's schedule
			for (const [blockId, entries] of blockSchedule.entries()) {
				// Group by day
				const dayEntries = new Map<string, { start: number; end: number }[]>();
				for (const entry of entries) {
					if (!dayEntries.has(entry.day)) {
						dayEntries.set(entry.day, []);
					}
					dayEntries.get(entry.day)?.push(entry);
				}

				for (const [day, daySlots] of dayEntries.entries()) {
					// Sort by start time
					daySlots.sort((a, b) => a.start - b.start);

					for (let i = 0; i < daySlots.length - 1; i++) {
						const current = daySlots[i];
						const next = daySlots[i + 1];
						const gap = next.start - current.end;

						if (gap === 0) {
							score += 10; // Bonus for back-to-back classes
						} else if (gap > 0) {
							// Penalty for gaps. 
							// Assuming 30min slots. 
							// 1 slot gap (30 mins) -> small penalty
							// Large gaps -> larger penalty
							// However, we might want to allow a lunch break (e.g. around 12:00).
							// For simplicity, just penalize all gaps for now to encourage compaction.
							score -= gap * 5; 
						}
					}
				}
			}

			return score;
		}
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

		// Check for perfect solution (i.e., no hard conflicts)
		if (population[0].fitness >= 0) break; // If fitness is non-negative, it means no hard conflicts (due to how score is calculated)

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
		for (let i = 0; i < 5; i++) {
			// Top 5
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

		let isHardConflict = false; // Flag for conflicts that should cause gene to be rejected

		// --- Post-processing Hard Conflict Checks (Must match calculateFitness) ---

		// 1. Break Time Overlap
		if (constraints.breakTime && constraints.breakTime !== 'none') {
			const breakStart = constraints.breakTime.split('-')[0] + ':00';
			const breakEnd = constraints.breakTime.split('-')[1] + ':00';
			if (isOverlap(start + ':00', end + ':00', breakStart, breakEnd)) {
				isHardConflict = true;
			}
		}

		// 2. Split Lecture Same Day (check against already accepted genes)
		if (!isHardConflict && task.id.includes('_Lecture_')) {
			const parts = task.id.split('_');
			const classId = Number(parts[0]);
			const splitPart = parts[2];

			if (splitPart === '1' || splitPart === '2') {
				const siblingSplitPart = splitPart === '1' ? '2' : '1';
				const siblingTaskId = `${classId}_Lecture_${siblingSplitPart}`;
				const siblingGene = acceptedGenes.find((g) => g.taskId === siblingTaskId); // Check accepted

				if (siblingGene && gene.day === siblingGene.day) {
					isHardConflict = true;
				}
			}
		}

		// 3. Lecture/Lab Same Day (check against already accepted genes)
		if (!isHardConflict && (task.type === 'Lecture' || task.type === 'Lab')) {
			const taskClassId = task.classData.id;
			const siblingType = task.type === 'Lecture' ? 'Lab' : 'Lecture';
			const siblingGene = acceptedGenes.find((g) =>
				g.taskId.startsWith(`${taskClassId}_${siblingType}`)
			);
			if (siblingGene && gene.day === siblingGene.day) {
				isHardConflict = true;
			}
		}

		// 4. Overlap with previously accepted genes (Room, Instructor, Block)
		if (!isHardConflict) {
			// Only if not already in conflict
			for (const accepted of acceptedGenes) {
				const acceptedTask = tasks.find((t) => t.id === accepted.taskId)!;
				const acceptedStart = timeSlots[accepted.startTimeIndex];
				const acceptedEnd = calculateEndTime(acceptedStart, acceptedTask.hours);

				if (gene.day === accepted.day) {
					if (isOverlap(start + ':00', end + ':00', acceptedStart + ':00', acceptedEnd + ':00')) {
						// Room Conflict
						if (gene.roomId === accepted.roomId) isHardConflict = true;
						// Instructor Conflict
						if (
							constraints.enforceInstructor &&
							task.classData.instructor_id &&
							task.classData.instructor_id === acceptedTask.classData.instructor_id
						) {
							isHardConflict = true;
						}
						// Block Conflict
						if (
							constraints.enforceBlock &&
							task.classData.block_id === acceptedTask.classData.block_id
						) {
							isHardConflict = true;
						}
					}
				}
				if (isHardConflict) break; // Break from acceptedGenes loop if conflict found
			}
		}

		if (!isHardConflict) {
			acceptedGenes.push(gene);
			scheduledEntries.push({
				class_id: task.classData.id,
				room_id: gene.roomId,
				day_of_week: gene.day,
				start_time: start + ':00',
				end_time: end + ':00',
				course_type: task.type
			});
		} else {
			// This gene had a hard conflict and was not accepted
			failedClasses.push({
				class: `${task.classData.subjects.subject_code} (${task.type})`,
				reason: 'Conflict detected in best solution after post-processing.'
			});
		}
	}

	return {
		success: failedClasses.length === 0,
		scheduledEntries,
		failedClasses
	};
};

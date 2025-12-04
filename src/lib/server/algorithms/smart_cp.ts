import type { Solver, SolverResult, ScheduleEntry, Class, Room } from './types';

// Helper to calculate end time
function calculateEndTime(startTime: string, durationHours: number): string {
	const [hour, minute] = startTime.split(':').map(Number);
	const totalMinutes = hour * 60 + minute + durationHours * 60;
	const endHour = Math.floor(totalMinutes / 60);
	const endMinute = totalMinutes % 60;
	return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
}

// Helper to check if two time ranges overlap
function isOverlap(start1: string, end1: string, start2: string, end2: string): boolean {
	return start1 < end2 && start2 < end1;
}

export const solveSmartCP: Solver = (classes, rooms, timeSlots, constraints) => {
	const scheduledEntries: ScheduleEntry[] = [];
	const failedClasses: { class: string; reason: string }[] = [];

	// 1. Preprocess Tasks (Split lectures, etc.)
	interface Task {
		id: string; // Unique ID for the task (e.g., "classId_type_splitIndex")
		classData: any;
		type: 'Lecture' | 'Lab';
		hours: number;
		slotsNeeded: number;
		possibleRooms: Room[];
		possibleDays: string[];
	}

	const tasks: Task[] = [];
	const SLOT_DURATION_HOURS = 0.5;
	const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];

	classes.forEach((cls) => {
		// Parse lecture_days if it's a string
		let lectureDays = cls.lecture_days;
		if (typeof lectureDays === 'string') {
			try {
				const parsed = JSON.parse(lectureDays);
				if (Array.isArray(parsed)) {
					lectureDays = parsed;
				} else if (typeof parsed === 'string') {
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

		if (!Array.isArray(lectureDays)) {
			lectureDays = [];
		}

		let possibleDays: string[];

		if (lectureDays.length > 0) {
			possibleDays = lectureDays;
		} else {
			possibleDays = DAYS.filter((d) => !constraints.excludedDays?.includes(d));
		}

		// Lecture
		if (cls.subjects.lecture_hours > 0) {
			if (cls.split_lecture) {
				const splitHours = Number(cls.subjects.lecture_hours) / 2;
				tasks.push({
					id: `${cls.id}_Lecture_1`,
					classData: cls,
					type: 'Lecture',
					hours: splitHours,
					slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
					possibleRooms: rooms.filter((r) => {
						const capOk =
							!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
						const typeOk =
							constraints.roomTypeConstraint === 'strict' ? r.type === 'Lecture' : true;
						return capOk && typeOk;
					}),
					possibleDays: possibleDays
				});
				tasks.push({
					id: `${cls.id}_Lecture_2`,
					classData: cls,
					type: 'Lecture',
					hours: splitHours,
					slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
					possibleRooms: rooms.filter((r) => {
						const capOk =
							!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
						const typeOk =
							constraints.roomTypeConstraint === 'strict' ? r.type === 'Lecture' : true;
						return capOk && typeOk;
					}),
					possibleDays: possibleDays
				});
			} else {
				tasks.push({
					id: `${cls.id}_Lecture`,
					classData: cls,
					type: 'Lecture',
					hours: Number(cls.subjects.lecture_hours),
					slotsNeeded: Math.ceil(Number(cls.subjects.lecture_hours) / SLOT_DURATION_HOURS),
					possibleRooms: rooms.filter((r) => {
						const capOk =
							!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
						const typeOk =
							constraints.roomTypeConstraint === 'strict' ? r.type === 'Lecture' : true;
						return capOk && typeOk;
					}),
					possibleDays: possibleDays
				});
			}
		}
		// Lab
		if (cls.subjects.lab_hours > 0) {
			tasks.push({
				id: `${cls.id}_Lab`,
				classData: cls,
				type: 'Lab',
				hours: Number(cls.subjects.lab_hours),
				slotsNeeded: Math.ceil(Number(cls.subjects.lab_hours) / SLOT_DURATION_HOURS),
				possibleRooms: rooms.filter((r) => {
					const capOk =
						!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
					const typeOk = constraints.roomTypeConstraint === 'strict' ? r.type === 'Lab' : true;
					return capOk && typeOk;
				}),
				possibleDays: DAYS.filter((d) => !constraints.excludedDays?.includes(d))
			});
		}
	});

	// Sort tasks by difficulty (Most Constrained Variable heuristic)
	tasks.sort((a, b) => {
		const aScore = a.possibleRooms.length / a.slotsNeeded;
		const bScore = b.possibleRooms.length / b.slotsNeeded;
		return aScore - bScore;
	});

	// 2. Backtracking Solver
	const assignments: Record<string, ScheduleEntry[]> = {}; // Map task ID to entries

	function isConsistent(task: Task, room: Room, day: string, startTimeIndex: number): boolean {
		const start = timeSlots[startTimeIndex];
		const end = calculateEndTime(start, task.hours);

		// Break Time Constraint
		if (constraints.breakTime && constraints.breakTime !== 'none') {
			const breakStart = constraints.breakTime.split('-')[0] + ':00';
			const breakEnd = constraints.breakTime.split('-')[1] + ':00';
			if (isOverlap(start + ':00', end + ':00', breakStart, breakEnd)) {
				return false;
			}
		}

		// Split Lecture Day Constraint
		if (task.id.includes('_Lecture_')) {
			const parts = task.id.split('_');
			const classId = parts[0];
			const splitPart = parts[2];

			if (splitPart === '1' || splitPart === '2') {
				const siblingSplitPart = splitPart === '1' ? '2' : '1';
				const siblingTaskId = `${classId}_Lecture_${siblingSplitPart}`;
				const siblingAssignment = assignments[siblingTaskId];

				if (siblingAssignment && siblingAssignment.length > 0) {
					const siblingDay = siblingAssignment[0].day_of_week;
					if (day === siblingDay) {
						return false;
					}
				}
			}
		}

		// Check against all currently assigned tasks
		for (const assignedTaskId in assignments) {
			const assignedEntries = assignments[assignedTaskId];
			for (const entry of assignedEntries) {
				// Same Room Conflict
				if (entry.room_id === room.id && entry.day_of_week === day) {
					if (isOverlap(start + ':00', end + ':00', entry.start_time, entry.end_time)) return false;
				}

				const assignedTask = tasks.find((t) => t.id === assignedTaskId);
				if (!assignedTask) continue;

				// Prevent Lecture/Lab on same day
				if (
					task.classData.id === assignedTask.classData.id &&
					task.type !== assignedTask.type &&
					day === entry.day_of_week
				) {
					return false;
				}

				// Same Instructor Conflict
				if (
					constraints.enforceInstructor &&
					task.classData.instructor_id &&
					assignedTask.classData.instructor_id === task.classData.instructor_id &&
					entry.day_of_week === day
				) {
					if (isOverlap(start + ':00', end + ':00', entry.start_time, entry.end_time)) return false;
				}

				// Same Block Conflict
				if (
					constraints.enforceBlock &&
					assignedTask.classData.block_id === task.classData.block_id &&
					entry.day_of_week === day
				) {
					if (isOverlap(start + ':00', end + ':00', entry.start_time, entry.end_time)) return false;
				}
			}
		}
		return true;
	}

	// Track best partial solution
	let bestAssignments: Record<string, ScheduleEntry[]> = {};
	let maxAssignedCount = 0;

	function backtrack(taskIndex: number): boolean {
		if (performance.now() - startTime > TIMEOUT_MS) {
			console.warn('Smart CP solver timed out after', TIMEOUT_MS / 1000, 'seconds.');
			return false;
		}

		if (taskIndex > maxAssignedCount) {
			maxAssignedCount = taskIndex;
			bestAssignments = JSON.parse(JSON.stringify(assignments));
		}

		if (taskIndex === tasks.length) {
			return true;
		}

		const task = tasks[taskIndex];

		// --- Value Ordering Heuristic ---
		// Generate all valid moves and score them
		interface Move {
			room: Room;
			day: string;
			timeIndex: number;
			score: number;
		}

		const moves: Move[] = [];

		for (const room of task.possibleRooms) {
			for (const day of task.possibleDays) {
				for (let i = 0; i <= timeSlots.length - task.slotsNeeded; i++) {
					if (isConsistent(task, room, day, i)) {
						let score = 0;

						// 1. Preferred Room Bonus
						if (task.classData.pref_room_id && task.classData.pref_room_id === room.id) {
							score += 100;
						}
						// Soft Room Type Bonus
						if (constraints.roomTypeConstraint === 'soft' && room.type === task.type) {
							score += 50;
						}

						// 2. Gap Minimization & Grouping
						// Check existing assignments for the same block on the same day
						let minGap = Infinity;
						let hasClassesOnDay = false;

						const start = timeSlots[i];
						const end = calculateEndTime(start, task.hours);
						const startMinutes = i * 30; // Assuming 30 min slots
						const endMinutes = startMinutes + task.slotsNeeded * 30;

						for (const assignedTaskId in assignments) {
							const assignedTask = tasks.find((t) => t.id === assignedTaskId);
							if (
								assignedTask &&
								assignedTask.classData.block_id === task.classData.block_id
							) {
								const assignedEntries = assignments[assignedTaskId];
								for (const entry of assignedEntries) {
									if (entry.day_of_week === day) {
										hasClassesOnDay = true;
										// Calculate gap
										const entryStartMinutes = timeSlots.indexOf(entry.start_time.substring(0, 5)) * 30;
										const entryEndMinutes = timeSlots.indexOf(entry.end_time.substring(0, 5)) * 30;

										// Gap = distance between intervals
										// If overlap (shouldn't happen due to isConsistent), gap is 0
										const gap = Math.max(0, startMinutes - entryEndMinutes, entryStartMinutes - endMinutes);
										if (gap < minGap) {
											minGap = gap;
										}
									}
								}
							}
						}

						if (hasClassesOnDay) {
							if (minGap === 0) {
								score += 50; // Perfect grouping (back-to-back)
							} else {
								// Penalize gap (e.g., -1 point per minute of gap)
								score -= minGap;
							}
						} else {
							// No classes on this day yet. 
							// Maybe prefer earlier slots? Or just neutral.
							// Let's slightly prefer earlier slots to compact the day
							score -= i; 
						}

						moves.push({ room, day, timeIndex: i, score });
					}
				}
			}
		}

		// Sort moves by score descending
		moves.sort((a, b) => b.score - a.score);

		// Iterate through sorted moves
		for (const move of moves) {
			const start = timeSlots[move.timeIndex];
			const end = calculateEndTime(start, task.hours);

			const newEntries: ScheduleEntry[] = [
				{
					class_id: task.classData.id,
					room_id: move.room.id,
					day_of_week: move.day,
					start_time: start + ':00',
					end_time: end + ':00',
					course_type: task.type
				}
			];

			assignments[task.id] = newEntries;
			if (backtrack(taskIndex + 1)) {
				return true;
			}
			delete assignments[task.id]; // Backtrack
		}

		return false;
	}

	const TIMEOUT_MS = 15000; // Increased timeout for smarter solver
	const startTime = performance.now();
	const success = backtrack(0);

	if (success) {
		const allEntries = Object.values(assignments).flat();
		return {
			success: true,
			scheduledEntries: allEntries,
			failedClasses: []
		};
	} else {
		const allEntries = Object.values(bestAssignments).flat();
		const scheduledTaskIds = new Set(Object.keys(bestAssignments));
		const failed = tasks
			.filter((t) => !scheduledTaskIds.has(t.id))
			.map((t) => ({
				class: `${t.classData.subjects.subject_code} (${t.type})`,
				reason: 'Could not find a valid slot during backtracking.'
			}));

		return {
			success: false,
			scheduledEntries: allEntries,
			failedClasses: failed
		};
	}
};

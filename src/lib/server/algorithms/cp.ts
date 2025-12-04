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

export const solveCP: Solver = (classes, rooms, timeSlots, constraints) => {
	const scheduledEntries: ScheduleEntry[] = [];
	const failedClasses: { class: string; reason: string }[] = [];

	// 1. Preprocess Tasks (Split lectures, etc.)
	// This mirrors the logic in the original file to create "schedulable units"
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
					possibleRooms: rooms
						.filter((r) => {
							const capOk =
								!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
							const typeOk =
								constraints.roomTypeConstraint === 'strict' ? r.type === 'Lecture' : true;
							return capOk && typeOk;
						})
						.sort((a, b) => {
							// 1. Preferred Room
							if (cls.pref_room_id) {
								if (a.id === cls.pref_room_id && b.id !== cls.pref_room_id) return -1;
								if (a.id !== cls.pref_room_id && b.id === cls.pref_room_id) return 1;
							}
							// 2. Soft Room Type
							if (constraints.roomTypeConstraint === 'soft') {
								if (a.type === 'Lecture' && b.type !== 'Lecture') return -1;
								if (a.type !== 'Lecture' && b.type === 'Lecture') return 1;
							}
							return 0;
						}),
					possibleDays: possibleDays
				});
				tasks.push({
					id: `${cls.id}_Lecture_2`,
					classData: cls,
					type: 'Lecture',
					hours: splitHours,
					slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
					possibleRooms: rooms
						.filter((r) => {
							const capOk =
								!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
							const typeOk =
								constraints.roomTypeConstraint === 'strict' ? r.type === 'Lecture' : true;
							return capOk && typeOk;
						})
						.sort((a, b) => {
							// 1. Preferred Room
							if (cls.pref_room_id) {
								if (a.id === cls.pref_room_id && b.id !== cls.pref_room_id) return -1;
								if (a.id !== cls.pref_room_id && b.id === cls.pref_room_id) return 1;
							}
							// 2. Soft Room Type
							if (constraints.roomTypeConstraint === 'soft') {
								if (a.type === 'Lecture' && b.type !== 'Lecture') return -1;
								if (a.type !== 'Lecture' && b.type === 'Lecture') return 1;
							}
							return 0;
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
					possibleRooms: rooms
						.filter((r) => {
							const capOk =
								!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
							const typeOk =
								constraints.roomTypeConstraint === 'strict' ? r.type === 'Lecture' : true;
							return capOk && typeOk;
						})
						.sort((a, b) => {
							// 1. Preferred Room
							if (cls.pref_room_id) {
								if (a.id === cls.pref_room_id && b.id !== cls.pref_room_id) return -1;
								if (a.id !== cls.pref_room_id && b.id === cls.pref_room_id) return 1;
							}
							// 2. Soft Room Type
							if (constraints.roomTypeConstraint === 'soft') {
								if (a.type === 'Lecture' && b.type !== 'Lecture') return -1;
								if (a.type !== 'Lecture' && b.type === 'Lecture') return 1;
							}
							return 0;
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
				possibleRooms: rooms
					.filter((r) => {
						const capOk =
							!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students;
						const typeOk = constraints.roomTypeConstraint === 'strict' ? r.type === 'Lab' : true;
						return capOk && typeOk;
					})
					.sort((a, b) => {
						// 1. Preferred Room
						if (cls.pref_room_id) {
							if (a.id === cls.pref_room_id && b.id !== cls.pref_room_id) return -1;
							if (a.id !== cls.pref_room_id && b.id === cls.pref_room_id) return 1;
						}
						// 2. Soft Room Type
						if (constraints.roomTypeConstraint === 'soft') {
							if (a.type === 'Lab' && b.type !== 'Lab') return -1;
							if (a.type !== 'Lab' && b.type === 'Lab') return 1;
						}
						return 0;
					}),
				possibleDays: DAYS.filter((d) => !constraints.excludedDays?.includes(d)) // Labs respect excluded days
			});
		}
	});

	// Sort tasks by difficulty (Most Constrained Variable heuristic)
	// Factors: fewer possible rooms, more slots needed
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

		// --- NEW: Break Time Constraint ---
		if (constraints.breakTime && constraints.breakTime !== 'none') {
			const breakStart = constraints.breakTime.split('-')[0] + ':00';
			const breakEnd = constraints.breakTime.split('-')[1] + ':00';
			if (isOverlap(start + ':00', end + ':00', breakStart, breakEnd)) {
				return false;
			}
		}

		// --- NEW: Split Lecture Day Constraint ---
		// This ensures the two halves of a split lecture are on different days.
		if (task.id.includes('_Lecture_')) {
			const parts = task.id.split('_');
			const classId = parts[0];
			const splitPart = parts[2]; // '1' or '2'

			if (splitPart === '1' || splitPart === '2') {
				// Determine the sibling task ID
				const siblingSplitPart = splitPart === '1' ? '2' : '1';
				const siblingTaskId = `${classId}_Lecture_${siblingSplitPart}`;
				const siblingAssignment = assignments[siblingTaskId];

				// If the sibling task is already placed...
				if (siblingAssignment && siblingAssignment.length > 0) {
					const siblingDay = siblingAssignment[0].day_of_week;
					// ...it cannot be on the same day as the current task.
					if (day === siblingDay) {
						return false; // CONFLICT: Split lectures on same day.
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

				// --- NEW: Prevent Lecture/Lab on same day for the same class ---
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
		// Check for timeout
		if (performance.now() - startTime > TIMEOUT_MS) {
			console.warn('CP solver timed out after', TIMEOUT_MS / 1000, 'seconds.');
			return false; // Force termination, will return best partial solution found
		}

		// Update best solution found so far
		if (taskIndex > maxAssignedCount) {
			maxAssignedCount = taskIndex;
			// Deep copy assignments
			bestAssignments = JSON.parse(JSON.stringify(assignments));
		}

		if (taskIndex === tasks.length) {
			return true; // All tasks assigned
		}

		const task = tasks[taskIndex];

		// Try all valid rooms
		for (const room of task.possibleRooms) {
			// Try all valid days
			for (const day of task.possibleDays) {
				// Try all valid time slots
				for (let i = 0; i <= timeSlots.length - task.slotsNeeded; i++) {
					if (isConsistent(task, room, day, i)) {
						const start = timeSlots[i];
						const end = calculateEndTime(start, task.hours);

						const newEntries: ScheduleEntry[] = [
							{
								class_id: task.classData.id,
								room_id: room.id,
								day_of_week: day,
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
				}
			}
		}

		return false; // No valid assignment found for this task
	}

	// Start the solver
	const TIMEOUT_MS = 10000; // 10 seconds
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
		// Return best partial solution
		const allEntries = Object.values(bestAssignments).flat();

		// Identify failed classes
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

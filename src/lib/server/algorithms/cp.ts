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
function isOverlap(
	start1: string,
	end1: string,
	start2: string,
	end2: string
): boolean {
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

		const possibleDays = lectureDays.length > 0 ? lectureDays : DAYS;

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
					possibleDays: cls.lecture_days && cls.lecture_days.length > 0 ? cls.lecture_days : DAYS
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
					possibleDays: cls.lecture_days && cls.lecture_days.length > 0 ? cls.lecture_days : DAYS
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
				possibleRooms: rooms.filter(
					(r) =>
						(!constraints.enforceRoomType || r.type === 'Lab') &&
						(!constraints.enforceCapacity || r.capacity >= cls.blocks.estimated_students)
				),
				possibleDays: DAYS // Labs usually don't have specific day constraints in this system yet, or default to all
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
		const end = calculateEndTime(start, task.hours); // Use actual hours for end time calculation

		// Check against all currently assigned tasks
		for (const assignedTaskId in assignments) {
			const assignedEntries = assignments[assignedTaskId];
			for (const entry of assignedEntries) {
				// Same Room Conflict
				if (entry.room_id === room.id && entry.day_of_week === day) {
					if (isOverlap(start, end, entry.start_time, entry.end_time)) return false;
				}

				const assignedTask = tasks.find((t) => t.id === assignedTaskId);
				if (!assignedTask) continue;

				// Same Instructor Conflict
				if (
					constraints.enforceInstructor &&
					task.classData.instructor_id &&
					assignedTask.classData.instructor_id === task.classData.instructor_id &&
					entry.day_of_week === day
				) {
					if (isOverlap(start, end, entry.start_time, entry.end_time)) return false;
				}

				// Same Block Conflict
				if (
					constraints.enforceBlock &&
					assignedTask.classData.block_id === task.classData.block_id &&
					entry.day_of_week === day
				) {
					if (isOverlap(start, end, entry.start_time, entry.end_time)) return false;
				}
			}
		}
		return true;
	}

	function backtrack(taskIndex: number): boolean {
		if (taskIndex === tasks.length) {
			return true; // All tasks assigned
		}

		const task = tasks[taskIndex];

		// Try all valid rooms
		for (const room of task.possibleRooms) {
			// Try all valid days
			for (const day of task.possibleDays) {
				// Try all valid time slots
				// Ensure we have enough contiguous slots
				for (let i = 0; i <= timeSlots.length - task.slotsNeeded; i++) {
					// Check if the sequence of slots is valid (e.g. not crossing breaks if breaks were gaps in timeSlots)
					// For now, assuming timeSlots are just start times.
					// We need to verify if the computed end time is valid, but isConsistent handles overlap.
					// A stricter check would be to ensure all intermediate slots exist in timeSlots, but let's trust the input for now.

					if (isConsistent(task, room, day, i)) {
						// Create the entry
						const start = timeSlots[i];
						// We create multiple entries if it spans multiple slots?
						// The database schema seems to store one entry per class-session.
						// The greedy solver pushed multiple 30-min blocks?
						// Looking at original code:
						// "scheduledEntries.push({ ... })" inside a loop of slotsNeeded.
						// It seems it pushes ONE entry per 30-min slot?
						// Let's re-read the original code.
						// "for (let j = 0; j < task.slotsNeeded; j++) { ... scheduledEntries.push(...) }"
						// Yes, it pushes multiple entries.

						const newEntries: ScheduleEntry[] = [];
						for (let j = 0; j < task.slotsNeeded; j++) {
							const sTime = timeSlots[i + j];
							// If we run out of slots (e.g. end of day), this loop might fail if we didn't check bounds properly.
							// The outer loop `i <= timeSlots.length - task.slotsNeeded` ensures we have enough indices.
							// But we must ensure `timeSlots[i+j]` is not undefined (e.g. if array has gaps? No, array is dense).
							
							if (!sTime) break; // Should not happen

							const eTime = calculateEndTime(sTime, SLOT_DURATION_HOURS);
							newEntries.push({
								class_id: task.classData.id,
								room_id: room.id,
								day_of_week: day,
								start_time: sTime + ':00', // Format HH:MM:SS
								end_time: eTime + ':00',
								course_type: task.type
							});
						}

						if (newEntries.length === task.slotsNeeded) {
							assignments[task.id] = newEntries;
							if (backtrack(taskIndex + 1)) {
								return true;
							}
							delete assignments[task.id]; // Backtrack
						}
					}
				}
			}
		}

		return false; // No valid assignment found for this task
	}

	// Start the solver
	// To prevent infinite hanging on impossible problems, we might want a timeout or iteration limit.
	// For this synchronous implementation, we'll just let it run.
	const success = backtrack(0);

	if (success) {
		const allEntries = Object.values(assignments).flat();
		return {
			success: true,
			scheduledEntries: allEntries,
			failedClasses: []
		};
	} else {
		// If complete failure, we might want to return partial results or just fail.
		// CP is usually all-or-nothing.
		// Let's try to identify which ones failed?
		// In a pure backtracking, if it returns false, it means NO solution exists for the whole set.
		// We could try to schedule as many as possible?
		// For now, return failure.
		return {
			success: false,
			scheduledEntries: [],
			failedClasses: [{ class: 'ALL', reason: 'Could not find a solution that satisfies all constraints.' }]
		};
	}
};

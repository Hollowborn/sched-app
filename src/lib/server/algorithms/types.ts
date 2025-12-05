export interface Class {
	id: number;
	subject_code: string;
	lecture_hours: number;
	lab_hours: number;
	instructor_id: number | null;
	block_id: number;
	estimated_students: number;
	split_lecture: boolean;
	lecture_days: string[] | null;
	room_preferences: { priority: number | null; options: number[] } | null;
	college_id?: number;
}

export interface Room {
	id: number;
	room_name: string;
	capacity: number;
	type: string;
	owner_college_id: number | null;
	is_general_use: boolean;
}

export interface TimeSlot {
	day: string;
	time: string; // HH:MM
}

export interface ScheduleEntry {
	class_id: number;
	room_id: number;
	day_of_week: string;
	start_time: string;
	end_time: string;
	course_type: 'Lecture' | 'Lab';
}

export interface SolverResult {
	success: boolean;
	scheduledEntries: ScheduleEntry[];
	failedClasses: { class: string; reason: string }[];
}

export interface SolverConstraints {
	enforceCapacity: boolean;
	roomTypeConstraint: 'strict' | 'soft' | 'none';
	enforceInstructor: boolean;
	enforceBlock: boolean;
	excludedDays: string[];
	breakTime?: string;
}

export type Solver = (
	classes: any[], // Using any[] for now to match the Supabase return type structure, or we can map it
	rooms: Room[],
	timeSlots: string[], // Just start times
	constraints: SolverConstraints
) => SolverResult;

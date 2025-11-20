import { fail, error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/supabaseClients'; // Needed for creating timetables potentially

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// Helper function to format time (HH:MM:SS) - Supabase needs this format
function formatTime(timeString: string): string {
	if (!timeString || !timeString.includes(':')) return '00:00:00';
	const parts = timeString.split(':');
	const hour = parts[0].padStart(2, '0');
	const minute = parts[1].padStart(2, '0');
	return `${hour}:${minute}:00`;
}

// Helper to calculate end time string HH:MM
function calculateEndTimeString(startTime: string, durationHours: number): string {
	if (!startTime || durationHours <= 0) return startTime;
	try {
		const [hours, minutes] = startTime.split(':').map(Number);
		const totalMinutes = hours * 60 + minutes + durationHours * 60;
		const endHour = Math.floor(totalMinutes / 60) % 24;
		const endMinute = totalMinutes % 60;
		return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
	} catch (e) {
		console.error('Error calculating end time:', e);
		return startTime; // fallback
	}
}

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url, depends }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access the scheduler.');
	}
	depends('app:scheduler'); // Dependency for manual invalidation

	// --- 1. Get Filters ---
	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	// Ensure semester type matches ENUM
	const semesterParam = url.searchParams.get('semester');
	const semester = ['1st Semester', '2nd Semester', 'Summer'].includes(semesterParam ?? '')
		? (semesterParam as '1st Semester' | '2nd Semester' | 'Summer')
		: '1st Semester';
	const timetable_id_str = url.searchParams.get('timetableId');
	let selectedTimetableId: number | null = timetable_id_str ? parseInt(timetable_id_str) : null;

	// New filters
	const room_id_filter = url.searchParams.get('room_id');
	const block_id_filter = url.searchParams.get('block_id');
	const instructor_id_filter = url.searchParams.get('instructor_id');

	// --- 2. Fetch Available Timetables for the selected term ---
	let timetableQuery = locals.supabase
		.from('timetables')
		.select('id, name, status')
		.eq('academic_year', academic_year)
		.eq('semester', semester)
		.order('created_at', { ascending: false });

	if (userRole === 'Dean' && locals.profile?.college_id) {
		timetableQuery = timetableQuery.eq('college_id', locals.profile.college_id);
	}

	const { data: availableTimetables, error: timetablesError } = await timetableQuery;

	if (timetablesError) {
		console.error('Timetables Error:', timetablesError);
		throw error(500, 'Could not load timetables.');
	}

	// If no timetable ID is selected via URL, try to default to the first one
	if (!selectedTimetableId && availableTimetables && availableTimetables.length > 0) {
		selectedTimetableId = availableTimetables[0].id;
	}

	const selectedTimetable = availableTimetables?.find((t) => t.id === selectedTimetableId) || null;

	// --- 3. Fetch Data based on Filters (only if a timetable is selected/exists) ---
	let classes: any[] = [];
	let scheduleData: any[] = [];
	let unscheduledClasses: any[] = [];

	// Fetch all rooms, instructors, and blocks for filter dropdowns
	const [{ data: allRooms }, { data: allInstructors }, { data: allBlocks }] = await Promise.all([
		locals.supabase.from('rooms').select('id, room_name, capacity, type, features'),
		locals.supabase.from('instructors').select('id, name'),
		locals.supabase.from('blocks').select('id, block_name, program_id, year_level')
	]);

	if (selectedTimetableId) {
		// Fetch ALL classes for the term (+ college filter for Dean)
		let classesQuery = locals.supabase
			.from('classes')
			.select(
				`
                id, semester, academic_year, instructor_id, block_id,
                subjects!inner (id, subject_code, subject_name, lecture_hours, lab_hours, college_id),
                instructors (id, name),
                blocks!inner (id, block_name, program_id, year_level)
            `
			)
			.eq('academic_year', academic_year)
			.eq('semester', semester);

		const { data: fetchedClasses, error: classesError } = await classesQuery;
		if (classesError) {
			console.error('Classes Error:', classesError);
			throw error(500, 'Could not load classes.');
		}
		classes = fetchedClasses || [];

		// Fetch schedule entries ONLY for the selected timetable
		const { data: fetchedScheduleData, error: scheduleError } = await locals.supabase
			.from('schedules')
			.select(
				`
                id, day_of_week, start_time, end_time, course_type, room_id,
                classes!inner (
                    id,
                    subjects!inner (subject_code, subject_name),
                    instructors (name),
                    blocks!inner (block_name),
                    instructor_id,
                    block_id
                ),
                rooms (room_name)
            `
			)
			.eq('timetable_id', selectedTimetableId);

		if (scheduleError) {
			console.error('Schedule Data Error:', scheduleError);
			throw error(500, 'Could not load schedule data.');
		}

		// Transform Supabase's 'classes' (plural) to 'class' (singular) to match frontend expectations
		const transformedScheduleData = (fetchedScheduleData || []).map((entry: any) => {
			const { classes, ...rest } = entry;
			return {
				...rest,
				class: classes // Rename 'classes' to 'class'
			};
		});

		// Apply filters to schedule data (client-side filtering)
		let filteredScheduleData = transformedScheduleData;
		if (room_id_filter) {
			filteredScheduleData = filteredScheduleData.filter(
				(entry) => entry.room_id === parseInt(room_id_filter)
			);
		}
		if (block_id_filter) {
			filteredScheduleData = filteredScheduleData.filter(
				(entry) => entry.class?.block_id === parseInt(block_id_filter)
			);
		}
		if (instructor_id_filter) {
			filteredScheduleData = filteredScheduleData.filter(
				(entry) => entry.class?.instructor_id === parseInt(instructor_id_filter)
			);
		}
		scheduleData = filteredScheduleData;

		// --- 4. Calculate Unscheduled Classes ---
		const scheduledClassEntries = new Map<number, { lecture: boolean; lab: boolean }>();
		scheduleData.forEach((entry) => {
			const classKey = entry.class?.id; // Use 'class' (singular) after transformation
			if (!classKey) return; // Skip if class data is missing

			// Use original class ID for tracking scheduled status
			const key = classKey;
			if (!scheduledClassEntries.has(key)) {
				scheduledClassEntries.set(key, { lecture: false, lab: false });
			}
			if (entry.course_type === 'Lecture') scheduledClassEntries.get(key)!.lecture = true;
			if (entry.course_type === 'Lab') scheduledClassEntries.get(key)!.lab = true;
		});

		// Filter classes based on Dean's college *before* calculating unscheduled
		let filteredClasses =
			userRole === 'Dean' && locals.profile?.college_id
				? classes.filter((cls) => cls.subjects?.college_id === locals.profile?.college_id)
				: classes;

		// Apply additional filters from URL search params
		if (room_id_filter) {
			// This filter is tricky for unscheduled classes as they don't have a room yet.
			// We'll apply it to classes that *could* be scheduled in that room type.
			// For now, we'll skip filtering unscheduled by room_id directly.
			// A more complex solution would involve checking room types vs. class types (Lecture/Lab)
		}
		if (block_id_filter) {
			filteredClasses = filteredClasses.filter((cls) => cls.block_id === parseInt(block_id_filter));
		}
		if (instructor_id_filter) {
			filteredClasses = filteredClasses.filter(
				(cls) => cls.instructor_id === parseInt(instructor_id_filter)
			);
		}

		unscheduledClasses = filteredClasses.flatMap((cls) => {
			// Ensure cls.subjects exists before accessing its properties
			if (!cls.subjects) return [];

			const needsLec = Number(cls.subjects.lecture_hours) > 0;
			const needsLab = Number(cls.subjects.lab_hours) > 0;
			const scheduledLec = scheduledClassEntries.get(cls.id)?.lecture ?? false;
			const scheduledLab = scheduledClassEntries.get(cls.id)?.lab ?? false;

			const items = [];
			if (needsLec && !scheduledLec) {
				items.push({ ...cls, course_type: 'Lecture', hours: Number(cls.subjects.lecture_hours) });
			}
			if (needsLab && !scheduledLab) {
				items.push({ ...cls, course_type: 'Lab', hours: Number(cls.subjects.lab_hours) });
			}
			return items;
		});
	}

	return {
		availableTimetables: availableTimetables || [],
		selectedTimetable,
		unscheduledClasses,
		scheduleData,
		allRooms: allRooms || [],
		allInstructors: allInstructors || [],
		allBlocks: allBlocks || [],
		profile: locals.profile,
		filters: {
			academic_year,
			semester,
			timetableId: selectedTimetableId,
			room_id: room_id_filter || undefined,
			block_id: block_id_filter || undefined,
			instructor_id: instructor_id_filter || undefined
		}
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createTimetable: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const academic_year = formData.get('academic_year')?.toString();
		const semesterValue = formData.get('semester')?.toString();
		// Validate semester against ENUM
		const semester = ['1st Semester', '2nd Semester', 'Summer'].includes(semesterValue ?? '')
			? (semesterValue as '1st Semester' | '2nd Semester' | 'Summer')
			: null;

		const college_id = userRole === 'Dean' ? locals.profile?.college_id : null; // Auto-assign college for Deans

		if (!name || !academic_year || !semester) {
			return fail(400, { createError: 'Name, Academic Year, and Semester are required.' });
		}

		const { data: newTimetable, error: insertError } = await locals.supabase
			.from('timetables')
			.insert({
				name,
				academic_year,
				semester,
				college_id,
				created_by: locals.user?.id,
				status: 'Draft' // Ensure this matches ENUM ('Draft', 'Published', 'Archived')
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error creating timetable:', insertError);
			// Check for unique constraint violation explicitly
			if (insertError.code === '23505') {
				return fail(409, {
					createError: 'A timetable with this name already exists for this term/college.'
				});
			}
			return fail(500, { createError: 'Could not create timetable.' });
		}

		// Redirect to the scheduler page with the new timetable selected
		const params = new URLSearchParams();
		params.set('year', academic_year);
		params.set('semester', semester);
		params.set('timetableId', newTimetable.id.toString());
		throw redirect(303, `/menu/timetables/scheduler?${params.toString()}`);
	},

	addScheduleEntry: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { scheduleError: 'Forbidden' });
		}

		const formData = await request.formData();
		const timetable_id = Number(formData.get('timetable_id'));
		const class_id = Number(formData.get('class_id'));
		const room_id = Number(formData.get('room_id'));
		const day_of_week = formData.get('day_of_week')?.toString();
		const start_time_str = formData.get('start_time')?.toString(); // e.g., "08:00"
		const end_time_str = formData.get('end_time')?.toString(); // e.g., "10:00" - Calculated on client
		const course_type = formData.get('course_type')?.toString() as 'Lecture' | 'Lab';

		// Basic Validation
		if (
			!timetable_id ||
			!class_id ||
			!room_id ||
			!day_of_week ||
			!start_time_str ||
			!end_time_str ||
			!course_type
		) {
			return fail(400, { scheduleError: 'Missing required fields for scheduling.' });
		}

		const start_time = formatTime(start_time_str); // Format as HH:MM:SS
		const end_time = formatTime(end_time_str); // Format as HH:MM:SS

		// --- Server-Side Conflict Checks ---
		// Fetch class details for instructor and block IDs
		const { data: classDetails, error: classDetailsError } = await locals.supabase
			.from('classes')
			.select('instructor_id, block_id')
			.eq('id', class_id)
			.single();

		if (classDetailsError || !classDetails) {
			return fail(404, { scheduleError: 'Class details not found for conflict checking.' });
		}

		// Check for conflicts using an RPC function for atomicity might be better,
		// but sequential checks are easier to start with.
		const checks = [
			// 1. Room Conflict
			locals.supabase
				.rpc('check_room_conflict', {
					p_timetable_id: timetable_id,
					p_room_id: room_id,
					p_day_of_week: day_of_week,
					p_start_time: start_time,
					p_end_time: end_time
				})
				.then(({ data, error }) => {
					if (error) throw new Error(`DB Error (Room Check): ${error.message}`);
					if (data) throw new Error('Conflict: Room is already booked at this time.');
				}),
			// 2. Instructor Conflict (if assigned)
			classDetails.instructor_id
				? locals.supabase
						.rpc('check_instructor_conflict', {
							p_timetable_id: timetable_id,
							p_instructor_id: classDetails.instructor_id,
							p_day_of_week: day_of_week,
							p_start_time: start_time,
							p_end_time: end_time
						})
						.then(({ data, error }) => {
							if (error) throw new Error(`DB Error (Instructor Check): ${error.message}`);
							if (data) throw new Error('Conflict: Instructor is already scheduled at this time.');
						})
				: Promise.resolve(), // Resolve immediately if no instructor
			// 3. Block Conflict
			locals.supabase
				.rpc('check_block_conflict', {
					p_timetable_id: timetable_id,
					p_block_id: classDetails.block_id,
					p_day_of_week: day_of_week,
					p_start_time: start_time,
					p_end_time: end_time
				})
				.then(({ data, error }) => {
					if (error) throw new Error(`DB Error (Block Check): ${error.message}`);
					if (data) throw new Error('Conflict: Block section already has a class at this time.');
				})
		];

		try {
			await Promise.all(checks);
		} catch (conflictError: any) {
			return fail(409, { scheduleError: conflictError.message });
		}

		// --- Insert if no conflicts ---
		const { error: insertError } = await locals.supabase.from('schedules').insert({
			timetable_id,
			class_id,
			room_id,
			day_of_week,
			start_time,
			end_time,
			course_type
		});

		if (insertError) {
			console.error('Error adding schedule entry:', insertError);
			// Catch potential DB unique constraint violations missed by RPC checks (though less likely)
			if (insertError.code === '23505') {
				return fail(409, { scheduleError: 'Conflict detected during save operation.' });
			}
			return fail(500, { scheduleError: 'Could not save schedule entry.' });
		}

		return { message: 'Class scheduled successfully.' };
	},

	deleteScheduleEntry: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { scheduleError: 'Forbidden' });
		}

		const formData = await request.formData();
		const scheduleId = Number(formData.get('scheduleId'));

		if (!scheduleId) {
			return fail(400, { scheduleError: 'Invalid schedule entry ID.' });
		}

		const { error: deleteError } = await locals.supabase
			.from('schedules')
			.delete()
			.eq('id', scheduleId);

		if (deleteError) {
			console.error('Error deleting schedule entry:', deleteError);
			return fail(500, { scheduleError: 'Could not unschedule class.' });
		}

		return { message: 'Class unscheduled successfully.' };
	},

	publishTimetable: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'Forbidden' });
		}
		const formData = await request.formData();
		const timetableId = Number(formData.get('timetableId'));
		if (!timetableId) return fail(400, { message: 'Invalid Timetable ID.' });

		// Potentially add checks here: Ensure all classes are scheduled? Ensure no conflicts?

		const { error: updateError } = await locals.supabase
			.from('timetables')
			.update({ status: 'Published' }) // Ensure this matches ENUM
			.eq('id', timetableId);

		if (updateError) {
			console.error('Error publishing timetable:', updateError);
			return fail(500, { message: 'Failed to publish timetable.' });
		}
		return { message: 'Timetable published successfully!' };
	}
};

// --- Optional: Add RPC functions for conflict checks ---
/*
-- Run these in Supabase SQL Editor once:

CREATE OR REPLACE FUNCTION check_room_conflict(
    p_timetable_id INT,
    p_room_id INT,
    p_day_of_week VARCHAR,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schedules
        WHERE timetable_id = p_timetable_id
          AND room_id = p_room_id
          AND day_of_week = p_day_of_week
          AND (start_time, end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_instructor_conflict(
    p_timetable_id INT,
    p_instructor_id INT,
    p_day_of_week VARCHAR,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schedules s
        JOIN public.classes c ON s.class_id = c.id
        WHERE s.timetable_id = p_timetable_id
          AND c.instructor_id = p_instructor_id
          AND s.day_of_week = p_day_of_week
          AND (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE FUNCTION check_block_conflict(
    p_timetable_id INT,
    p_block_id INT,
    p_day_of_week VARCHAR,
    p_start_time TIME,
    p_end_time TIME
)
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM public.schedules s
        JOIN public.classes c ON s.class_id = c.id
        WHERE s.timetable_id = p_timetable_id
          AND c.block_id = p_block_id
          AND s.day_of_week = p_day_of_week
          AND (s.start_time, s.end_time) OVERLAPS (p_start_time, p_end_time)
    );
END;
$$ LANGUAGE plpgsql;

*/

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

// Helper to calculate end time
function calculateEndTime(startTime: string, durationHours: number): string {
	if (!startTime || durationHours <= 0) return startTime;
	try {
		const [hours, minutes] = startTime.split(':').map(Number);
		const totalMinutes = hours * 60 + minutes + durationHours * 60;
		const endHour = Math.floor(totalMinutes / 60) % 24;
		const endMinute = totalMinutes % 60;
		return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}:00`;
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
	const semester = url.searchParams.get('semester') || ('1st Semester' as const);
	const timetable_id_str = url.searchParams.get('timetableId');
	let selectedTimetableId: number | null = timetable_id_str ? parseInt(timetable_id_str) : null;

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

	if (timetablesError) throw error(500, 'Could not load timetables.');

	// If no timetable ID is selected via URL, default to the first one (usually latest draft)
	if (!selectedTimetableId && availableTimetables && availableTimetables.length > 0) {
		selectedTimetableId = availableTimetables[0].id;
	}

	const selectedTimetable = availableTimetables?.find((t) => t.id === selectedTimetableId) || null;

	// --- 3. Fetch Data based on Filters (only if a timetable is selected/exists) ---
	let classes: any[] = [];
	let scheduleData: any[] = [];
	let rooms: any[] = [];
	let instructors: any[] = [];
	let blocks: any[] = [];
	let unscheduledClasses: any[] = [];

	if (selectedTimetableId) {
		// Fetch ALL classes for the term (+ college filter for Dean)
		let classesQuery = locals.supabase
			.from('classes')
			.select(
				`
                *,
                subjects (*, colleges(college_name)),
                instructors (id, name),
                blocks (*)
            `
			)
			.eq('academic_year', academic_year)
			.eq('semester', semester);
		if (userRole === 'Dean' && locals.profile?.college_id) {
			classesQuery = classesQuery.eq('subjects.college_id', locals.profile.college_id);
		}
		const { data: fetchedClasses, error: classesError } = await classesQuery;
		if (classesError) throw error(500, 'Could not load classes.');
		classes = fetchedClasses || [];

		// Fetch schedule entries ONLY for the selected timetable
		const { data: fetchedScheduleData, error: scheduleError } = await locals.supabase
			.from('schedules')
			.select(
				`
                *,
                classes (
                    *,
                    subjects (subject_code, subject_name),
                    instructors (name),
                    blocks (block_name)
                ),
                rooms (room_name)
            `
			)
			.eq('timetable_id', selectedTimetableId);
		if (scheduleError) throw error(500, 'Could not load schedule data.');
		scheduleData = fetchedScheduleData || [];

		// Fetch supporting data for dropdowns and display
		const [{ data: fetchedRooms }, { data: fetchedInstructors }, { data: fetchedBlocks }] =
			await Promise.all([
				locals.supabase.from('rooms').select('*'),
				locals.supabase.from('instructors').select('id, name'),
				locals.supabase.from('blocks').select('id, block_name, program_id, year_level') // Fetch all blocks for potential scheduling
			]);
		rooms = fetchedRooms || [];
		instructors = fetchedInstructors || [];
		blocks = fetchedBlocks || [];

		// --- 4. Calculate Unscheduled Classes ---
		const scheduledClassEntries = new Map<string, { lecture: boolean; lab: boolean }>();
		scheduleData.forEach((entry) => {
			const key = `${entry.class_id}-${entry.course_type}`;
			if (!scheduledClassEntries.has(key)) {
				scheduledClassEntries.set(key, { lecture: false, lab: false });
			}
			if (entry.course_type === 'Lecture') scheduledClassEntries.get(key)!.lecture = true;
			if (entry.course_type === 'Lab') scheduledClassEntries.get(key)!.lab = true;
		});

		unscheduledClasses = classes.flatMap((cls) => {
			const needsLec = cls.subjects.lecture_hours > 0;
			const needsLab = cls.subjects.lab_hours > 0;
			const scheduledLec = scheduledClassEntries.get(`${cls.id}-Lecture`)?.lecture ?? false;
			const scheduledLab = scheduledClassEntries.get(`${cls.id}-Lab`)?.lab ?? false;

			const items = [];
			if (needsLec && !scheduledLec) {
				items.push({ ...cls, course_type: 'Lecture', hours: cls.subjects.lecture_hours });
			}
			if (needsLab && !scheduledLab) {
				items.push({ ...cls, course_type: 'Lab', hours: cls.subjects.lab_hours });
			}
			return items;
		});
	}

	return {
		availableTimetables: availableTimetables || [],
		selectedTimetable,
		unscheduledClasses,
		scheduleData,
		rooms,
		instructors,
		blocks,
		profile: locals.profile,
		filters: { academic_year, semester, timetableId: selectedTimetableId }
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
		const semester = formData.get('semester')?.toString();
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
				status: 'draft'
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error creating timetable:', insertError);
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
		// Role check
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { scheduleError: 'Forbidden' });
		}

		const formData = await request.formData();
		const timetable_id = Number(formData.get('timetable_id'));
		const class_id = Number(formData.get('class_id'));
		const room_id = Number(formData.get('room_id'));
		const day_of_week = formData.get('day_of_week')?.toString();
		const start_time_str = formData.get('start_time')?.toString(); // e.g., "08:30"
		const end_time_str = formData.get('end_time')?.toString(); // e.g., "10:00"
		const course_type = formData.get('course_type')?.toString();

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

		const start_time = formatTime(start_time_str);
		const end_time = formatTime(end_time_str);

		// --- Server-Side Conflict Checks ---
		// 1. Room Conflict (Uses DB UNIQUE constraint, but good to double check)
		const { data: roomConflict, error: roomCheckError } = await locals.supabase
			.from('schedules')
			.select('id')
			.eq('timetable_id', timetable_id)
			.eq('room_id', room_id)
			.eq('day_of_week', day_of_week)
			.lt('start_time', end_time) // Starts before this one ends
			.gt('end_time', start_time) // Ends after this one starts
			.maybeSingle();

		if (roomCheckError)
			return fail(500, { scheduleError: 'Database error checking room conflict.' });
		if (roomConflict)
			return fail(409, { scheduleError: 'Conflict: Room is already booked at this time.' });

		// Fetch class details for other checks
		const { data: classDetails, error: classDetailsError } = await locals.supabase
			.from('classes')
			.select('instructor_id, block_id')
			.eq('id', class_id)
			.single();

		if (classDetailsError || !classDetails)
			return fail(404, { scheduleError: 'Class details not found.' });

		// 2. Instructor Conflict
		if (classDetails.instructor_id) {
			const { data: instructorConflict, error: instructorCheckError } = await locals.supabase
				.from('schedules')
				.select('id, classes!inner(instructor_id)')
				.eq('timetable_id', timetable_id)
				.eq('classes.instructor_id', classDetails.instructor_id)
				.eq('day_of_week', day_of_week)
				.lt('start_time', end_time)
				.gt('end_time', start_time)
				.maybeSingle();

			if (instructorCheckError)
				return fail(500, { scheduleError: 'Database error checking instructor conflict.' });
			if (instructorConflict)
				return fail(409, {
					scheduleError: 'Conflict: Instructor is already scheduled at this time.'
				});
		}

		// 3. Block Conflict
		const { data: blockConflict, error: blockCheckError } = await locals.supabase
			.from('schedules')
			.select('id, classes!inner(block_id)')
			.eq('timetable_id', timetable_id)
			.eq('classes.block_id', classDetails.block_id)
			.eq('day_of_week', day_of_week)
			.lt('start_time', end_time)
			.gt('end_time', start_time)
			.maybeSingle();

		if (blockCheckError)
			return fail(500, { scheduleError: 'Database error checking block conflict.' });
		if (blockConflict)
			return fail(409, {
				scheduleError: 'Conflict: Block section is already scheduled at this time.'
			});

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
			// The UNIQUE constraint on (timetable_id, room_id, day_of_week, start_time) might trigger this
			if (insertError.code === '23505') {
				return fail(409, { scheduleError: 'Conflict: This exact room slot is already taken.' });
			}
			return fail(500, { scheduleError: 'Could not save schedule entry.' });
		}

		return { message: 'Class scheduled successfully.' };
	},

	deleteScheduleEntry: async ({ request, locals }) => {
		// Role check
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
		// Role check
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'Forbidden' });
		}
		const formData = await request.formData();
		const timetableId = Number(formData.get('timetableId'));
		if (!timetableId) return fail(400, { message: 'Invalid Timetable ID.' });

		const { error: updateError } = await locals.supabase
			.from('timetables')
			.update({ status: 'published' })
			.eq('id', timetableId);

		if (updateError) {
			return fail(500, { message: 'Failed to publish timetable.' });
		}
		return { message: 'Timetable published successfully!' };
	}
};

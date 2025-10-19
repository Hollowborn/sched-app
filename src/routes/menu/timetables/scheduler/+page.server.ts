import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access the scheduler.');
	}

	// --- Primary Filters from URL ---
	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || ('1st Semester' as const);
	const view_by = url.searchParams.get('view_by') || 'block';
	const view_id = url.searchParams.get('id');

	// --- Fetch All Data for the Selected Term ---
	const [
		{ data: classes, error: classesError },
		{ data: schedules, error: schedulesError },
		{ data: rooms, error: roomsError },
		{ data: blocks, error: blocksError },
		{ data: instructors, error: instructorsError }
	] = await Promise.all([
		locals.supabase
			.from('classes')
			.select('*, subjects(*), instructors(*), blocks(*)')
			.eq('academic_year', academic_year)
			.eq('semester', semester),
		locals.supabase
			.from('schedules')
			.select('*, classes!inner(academic_year, semester)')
			.eq('classes.academic_year', academic_year)
			.eq('classes.semester', semester),
		locals.supabase.from('rooms').select('*'),
		locals.supabase.from('blocks').select('*'),
		locals.supabase.from('instructors').select('*')
	]);

	if (classesError || schedulesError || roomsError) {
		console.error('Error fetching scheduler data:', classesError || schedulesError || roomsError);
		throw error(500, 'Failed to load scheduler data.');
	}

	// --- Calculate Unscheduled Classes ---
	const scheduledClassIds = new Set(schedules.map((s) => s.class_id));
	const unscheduledClasses = classes.filter((c) => !scheduledClassIds.has(c.id));

	// --- Populate Main View Data ---
	let mainViewSchedule = [];
	if (view_id) {
		mainViewSchedule = schedules
			.map((s) => {
				const associatedClass = classes.find((c) => c.id === s.class_id);
				if (!associatedClass) return null;
				return { ...s, class: associatedClass };
			})
			.filter((s) => {
				if (!s) return false;
				if (view_by === 'block') return s.class.block_id === Number(view_id);
				if (view_by === 'room') return s.room_id === Number(view_id);
				if (view_by === 'instructor') return s.class.instructor_id === Number(view_id);
				return false;
			});
	}

	return {
		profile: locals.profile,
		filters: { academic_year, semester, view_by, view_id },
		unscheduledClasses,
		scheduleData: mainViewSchedule,
		rooms: rooms || [],
		blocks: blocks || [],
		instructors: instructors || []
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createSchedule: async ({ request, locals }) => {
		// ... Security checks ...
		const formData = await request.formData();
		// ... Get form data ...

		// --- Conflict Detection Logic ---
		// 1. Check if room is booked at that time.
		// 2. Check if instructor is booked at that time.
		// 3. Check if block is booked at that time.
		// If conflict, return fail(409, { message: 'Conflict detected: ...' })

		// If no conflict, insert into schedules table
		// ...

		return { message: 'Class scheduled successfully.' };
	},

	updateSchedule: async ({ request, locals }) => {
		// ... Logic to update time/room of an existing schedule entry ...
	},

	deleteSchedule: async ({ request, locals }) => {
		// ... Logic to delete a schedule entry ...
	}
};

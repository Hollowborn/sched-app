import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './[timetableId]/$types';

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, params }) => {
	const userRole = locals.profile?.role;
	// Any authenticated user can view a schedule
	if (!userRole) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const timetableId = Number(params.timetableId);
	if (isNaN(timetableId)) {
		throw error(400, 'Invalid Timetable ID');
	}

	// 1. Fetch the main timetable details
	const { data: timetable, error: timetableError } = await locals.supabase
		.from('timetables')
		.select('*, colleges(college_name)')
		.eq('id', timetableId)
		.single();

	if (timetableError) {
		console.error('Error fetching timetable:', timetableError);
		throw error(404, 'Timetable not found.');
	}

	// Optional: Add RLS or server-side check to ensure a Dean can only see their own college's timetables
	if (userRole === 'Dean' && timetable.college_id !== locals.profile.college_id) {
		throw error(403, 'Forbidden: You do not have permission to view this timetable.');
	}

	// 2. Fetch all schedule entries for this timetable with deep joins
	const { data: schedules, error: schedulesError } = await locals.supabase
		.from('schedules')
		.select(
			`
            id,
            day_of_week,
            start_time,
            end_time,
            course_type,
            room_id,
            rooms (
                room_name,
                building,
                type
            ),
            classes!inner (
                id,
                instructor_id,
                block_id,
                subjects!inner (
                    subject_code,
                    subject_name,
                    college_id
                ),
                instructors (
                    id, 
                    name, 
                    max_load,
                    colleges ( college_name )
                ),
                blocks!inner (
                    id,
                    block_name,
                    year_level,
                    programs ( program_name )
                )
            )
        `
		)
		.eq('timetable_id', timetableId);

	if (schedulesError) {
		console.error('Error fetching schedule data:', schedulesError);
		throw error(500, 'Failed to load schedule data.');
	}

	// 3. Process the schedule data to get unique lists for the "Prev/Next" buttons
	const roomMap = new Map();
	const instructorMap = new Map();
	const blockMap = new Map();

	(schedules || []).forEach((s) => {
		if (s.rooms) roomMap.set(s.room_id, s.rooms);
		if (s.classes.instructors) instructorMap.set(s.classes.instructor_id, s.classes.instructors);
		if (s.classes.blocks) blockMap.set(s.classes.block_id, s.classes.blocks);
	});

	// Sort lists alphabetically for a consistent order
	const uniqueRooms = Array.from(roomMap.values()).sort((a, b) =>
		a.room_name.localeCompare(b.room_name)
	);
	const uniqueInstructors = Array.from(instructorMap.values()).sort((a, b) =>
		a.name.localeCompare(b.name)
	);
	const uniqueBlocks = Array.from(blockMap.values()).sort((a, b) =>
		a.block_name.localeCompare(b.block_name)
	);

	return {
		timetable,
		schedules: schedules || [],
		uniqueRooms,
		uniqueInstructors,
		uniqueBlocks
	};
};

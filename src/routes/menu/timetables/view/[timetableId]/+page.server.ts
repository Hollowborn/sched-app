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
                    subject_name
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

	// 3. Fetch unique entities for filtering and navigation
	const [{ data: uniqueRoomsData }, { data: uniqueInstructorsData }, { data: uniqueBlocksData }] =
		await Promise.all([
			locals.supabase.from('rooms').select('id, room_name, building, type').order('room_name'),
			locals.supabase
				.from('instructors')
				.select('id, name, max_load, colleges(college_name)')
				.order('name'),
			locals.supabase
				.from('blocks')
				.select('id, block_name, year_level, programs(program_name)')
				.order('block_name')
		]);

	return {
		timetable,
		schedules: schedules || [],
		uniqueRooms: uniqueRoomsData || [],
		uniqueInstructors: uniqueInstructorsData || [],
		uniqueBlocks: uniqueBlocksData || []
	};
};

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
					lecture_hours,
					lab_hours
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
	// 3. Fetch unique entities for filtering and navigation, scoped to the timetable's context
	let blocksQuery = locals.supabase
		.from('blocks')
		.select('id, block_name, year_level, programs!inner(program_name, college_id)')
		.order('block_name');

	if (timetable.program_id) {
		blocksQuery = blocksQuery.eq('program_id', timetable.program_id);
	} else if (timetable.college_id) {
		blocksQuery = blocksQuery.eq('programs.college_id', timetable.college_id);
	}

	// Extract unique instructors from the schedules to ensure we see everyone actually assigned
	// regardless of their college affiliation.
	const uniqueInstructorsMap = new Map();
	if (schedules) {
		for (const s of schedules) {
			const inst = s.classes?.instructors;
			if (inst) {
				uniqueInstructorsMap.set(inst.id, inst);
			}
		}
	}
	const uniqueInstructorsData = Array.from(uniqueInstructorsMap.values()).sort((a: any, b: any) =>
		a.name.localeCompare(b.name)
	);

	const [{ data: uniqueRoomsData }, { data: uniqueBlocksData }] = await Promise.all([
		locals.supabase
			.from('rooms')
			.select('id, room_name, building, type')
			.or(`owner_college_id.eq.${timetable.college_id},is_general_use.eq.true`)
			.order('room_name'),
		blocksQuery
	]);

	return {
		timetable,
		schedules: schedules || [],
		uniqueRooms: uniqueRoomsData || [],
		uniqueInstructors: uniqueInstructorsData || [],
		uniqueBlocks: uniqueBlocksData || []
	};
};

export const actions = {
	publishTimetable: async ({ request, locals }) => {
		const formData = await request.formData();
		const timetableId = formData.get('timetableId');

		if (!timetableId) {
			return error(400, 'Timetable ID is required.');
		}

		// 1. Fetch the timetable to get its context (semester, year, college, program)
		const { data: timetable, error: fetchError } = await locals.supabase
			.from('timetables')
			.select('*')
			.eq('id', timetableId)
			.single();

		if (fetchError || !timetable) {
			console.error('Error fetching timetable for publish:', fetchError);
			return error(404, 'Timetable not found.');
		}

		// 2. Archive any currently published timetables for the SAME context
		let archiveQuery = locals.supabase
			.from('timetables')
			.update({ status: 'archived' })
			.eq('status', 'published')
			.eq('academic_year', timetable.academic_year)
			.eq('semester', timetable.semester);

		if (timetable.college_id) {
			archiveQuery = archiveQuery.eq('college_id', timetable.college_id);
		}
		if (timetable.program_id) {
			archiveQuery = archiveQuery.eq('program_id', timetable.program_id);
		}

		const { error: archiveError } = await archiveQuery;
		if (archiveError) {
			console.error('Error archiving previous timetables:', archiveError);
			return error(500, 'Failed to archive previous timetables.');
		}

		// 3. Publish the target timetable
		const { error: publishError } = await locals.supabase
			.from('timetables')
			.update({ status: 'published' })
			.eq('id', timetableId);

		if (publishError) {
			console.error('Error publishing timetable:', publishError);
			return error(500, 'Failed to publish timetable.');
		}

		return { success: true, message: 'Timetable published successfully!' };
	}
};

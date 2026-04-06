import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, params }) => {
	const timetableId = Number(params.timetableId);
	if (isNaN(timetableId)) {
		throw error(400, 'Invalid Timetable ID');
	}

	// 1. Fetch the main timetable details
	// The RLS policy we created will automatically block this if status is 'Draft'
	const { data: timetable, error: timetableError } = await locals.supabase
		.from('timetables')
		.select('*, colleges(college_name)')
		.eq('id', timetableId)
		.single();

	if (timetableError || !timetable) {
		console.error('Error fetching timetable:', timetableError);
		throw error(404, 'Timetable not found or is not published yet.');
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
	let blocksQuery = locals.supabase
		.from('blocks')
		.select('id, block_name, year_level, programs!inner(program_name, college_id)')
		.order('block_name');

	if (timetable.program_id) {
		blocksQuery = blocksQuery.eq('program_id', timetable.program_id);
	} else if (timetable.college_id) {
		blocksQuery = blocksQuery.eq('programs.college_id', timetable.college_id);
	}

	// Extract unique instructors from the schedules
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

	// Determine the relevant room IDs to display
	let validRoomIds: number[] = [];
	
	// First try to extract the exact rooms configured during generation
	const genParamsRoomIds = timetable.metadata?.generation_params?.room_ids;
	if (Array.isArray(genParamsRoomIds) && genParamsRoomIds.length > 0) {
		validRoomIds = genParamsRoomIds;
	} else if (schedules && schedules.length > 0) {
		// Fallback: extract the unique rooms that were actually assigned classes
		const assignedRoomIds = new Set<number>();
		for (const s of schedules) {
			if (s.room_id) assignedRoomIds.add(s.room_id);
		}
		validRoomIds = Array.from(assignedRoomIds);
	}

	let roomsQuery = locals.supabase
		.from('rooms')
		.select('id, room_name, building, type, owner_college_id, colleges(college_name)')
		.order('room_name');

	if (validRoomIds.length > 0) {
		roomsQuery = roomsQuery.in('id', validRoomIds);
	} else {
		// Ultimate fallback if it's completely empty
		roomsQuery = roomsQuery.or(`owner_college_id.eq.${timetable.college_id},is_general_use.eq.true`);
	}

	const [{ data: uniqueRoomsData }, { data: uniqueBlocksData }] = await Promise.all([
		roomsQuery,
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

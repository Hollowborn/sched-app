import { json, type RequestHandler } from '@sveltejs/kit';
import type { PostgrestError } from '@supabase/supabase-js';

// Helper to handle and log errors from individual search promises
const handleSearch = async <T>(
	promise: Promise<{ data: T[] | null; error: PostgrestError | null }>
): Promise<T[]> => {
	const { data, error } = await promise;
	if (error) {
		console.error('Search API error:', error.message);
		return []; // Return empty array on error to not fail the entire search
	}
	return data || [];
};

export const GET: RequestHandler = async ({ url, locals }) => {
	const { supabase, profile } = locals;

	// Security: If no user or profile, or query is too short, return no results
	const query = url.searchParams.get('q');
	if (!profile || !query || query.length < 2) {
		return json({ results: {} });
	}

	const searchQuery = `%${query}%`;
	const searchLimit = 5;

	// --- Prepare Role-Based Queries ---

	// Base query for instructors
	let instructorsQuery = supabase
		.from('instructors')
		.select('id, name')
		.ilike('name', searchQuery)
		.limit(searchLimit);

	// Base query for subjects
	let subjectsQuery = supabase
		.from('subjects')
		.select('id, code, name')
		.or(`subject_code.ilike.${searchQuery},subject_name.ilike.${searchQuery}`)
		.limit(searchLimit);

	// Base query for rooms
	let roomsQuery = supabase
		.from('rooms')
		.select('id, room_name, building')
		.or(`room_name.ilike.${searchQuery},building.ilike.${searchQuery}`)
		.limit(searchLimit);

	// --- Apply Security Based on Role ---

	if (profile.role === 'Dean' || profile.role === 'Chairperson') {
		if (profile.college_id) {
			instructorsQuery = instructorsQuery.eq('college_id', profile.college_id);
			subjectsQuery = subjectsQuery.eq('college_id', profile.college_id);
			// Rooms are special: a Dean can see their own rooms OR general use rooms
			roomsQuery = roomsQuery.or(
				`owner_college_id.eq.${profile.college_id},is_general_use.eq.true`
			);
		}
	}
	// For 'Admin', no extra filters are applied, they can see everything.

	// --- Execute Queries in Parallel ---

	const [instructors, subjects, rooms] = await Promise.all([
		handleSearch(instructorsQuery),
		handleSearch(subjectsQuery),
		handleSearch(roomsQuery)
		// Add other entity searches here, e.g., programs, blocks
	]);

	return json({
		results: {
			instructors,
			subjects,
			rooms
		}
	});
};

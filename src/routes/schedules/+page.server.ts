import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// Note: We deliberately do NOT check for locals.profile here,
	// so unauthenticated users can access it.

	// RLS must be configured in Supabase to allow public SELECT on timetables with status IN ('Published', 'Archived')
	const { data: timetables, error: timetablesError } = await locals.supabase
		.from('timetables')
		.select(
			`
			*,
			colleges(college_name),
			programs(program_name)
		`
		)
		.in('status', ['published']) // Only active and history
		.order('created_at', { ascending: false });

	if (timetablesError) {
		console.error('Error fetching public timetables:', timetablesError);
		// Don't leak the exact Db error to the public, just return an empty array or generic error
		return { timetables: [] };
	}

	return {
		timetables: timetables || []
	};
};

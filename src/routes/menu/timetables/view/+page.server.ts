import { fail, error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './[timetableId]/$types';

// Allow all authenticated roles to view timetables
const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	// Get filters from URL, providing sensible defaults
	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = (url.searchParams.get('semester') || '1st Semester') as
		| '1st Semester'
		| '2nd Semester'
		| 'Summer';
	const status = url.searchParams.get('status') || 'All';

	// Build the query for timetables
	let query = locals.supabase
		.from('timetables')
		.select('*, colleges(college_name)')
		.eq('academic_year', academic_year)
		.eq('semester', semester)
		.order('created_at', { ascending: false });

	// Apply status filter
	if (status !== 'All') {
		query = query.eq('status', status);
	}

	// Apply role-based filter for Deans
	if (userRole === 'Dean' && locals.profile.college_id) {
		query = query.eq('college_id', locals.profile.college_id);
	}

	const { data: timetables, error: timetablesError } = await query;

	if (timetablesError) {
		console.error('Error fetching timetables:', timetablesError);
		throw error(500, 'Failed to load timetables.');
	}

	return {
		timetables: timetables || [],
		profile: locals.profile,
		filters: { academic_year, semester, status }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	archiveTimetable: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		// Only Admins or Registrars should be able to archive
		if (!userRole || !['Admin', 'Registrar'].includes(userRole)) {
			return fail(403, { message: 'Forbidden: You do not have permission to archive this.' });
		}

		const formData = await request.formData();
		const timetableId = Number(formData.get('timetableId'));

		if (!timetableId) {
			return fail(400, { message: 'Invalid Timetable ID.' });
		}

		const { error: updateError } = await locals.supabase
			.from('timetables')
			.update({ status: 'Archived' })
			.eq('id', timetableId);

		if (updateError) {
			console.error('Error archiving timetable:', updateError);
			return fail(500, { message: 'Failed to archive timetable.' });
		}

		return { status: 200, message: 'Timetable archived successfully.' };
	}
};

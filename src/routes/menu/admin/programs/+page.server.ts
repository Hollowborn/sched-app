import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Registrar'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const [programsRes, collegesRes] = await Promise.all([
		locals.supabase
			.from('programs')
			.select(`*, colleges ( college_name )`)
			.order('college_id')
			.order('program_name'),
		locals.supabase.from('colleges').select('*').order('college_name')
	]);

	if (programsRes.error || collegesRes.error) {
		console.error(
			'Error fetching data:',
			programsRes.error || collegesRes.error
		);
		throw error(500, 'Failed to load necessary resources from the database.');
	}

	return {
		programs: programsRes.data,
		colleges: collegesRes.data,
		profile: locals.profile
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	// --- PROGRAM ACTIONS ---
	createProgram: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can create programs.' });
		}
		const formData = await request.formData();
		const program_name = formData.get('program_name')?.toString()?.trim();
		const college_id = Number(formData.get('college_id'));

		if (!program_name || !college_id) {
			return fail(400, { message: 'Program name and college are required.' });
		}

		const { error: insertError } = await locals.supabase
			.from('programs')
			.insert({ program_name, college_id });

		if (insertError) {
			return fail(500, { message: 'Failed to create program.' });
		}
		return { status: 201, message: 'Program created successfully.', action: 'createProgram' };
	},

	updateProgram: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can update programs.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const program_name = formData.get('program_name')?.toString()?.trim();
		const college_id = Number(formData.get('college_id'));

		if (!id || !program_name || !college_id) {
			return fail(400, { message: 'All fields are required.' });
		}

		const { error: updateError } = await locals.supabase
			.from('programs')
			.update({ program_name, college_id })
			.eq('id', id);

		if (updateError) {
			return fail(500, { message: 'Failed to update program.' });
		}
		return { status: 200, message: 'Program updated successfully.', action: 'updateProgram' };
	},

	deleteProgram: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can delete programs.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, { message: 'Invalid program ID.' });
		}

		const { error: deleteError } = await locals.supabase.from('programs').delete().eq('id', id);

		if (deleteError) {
			return fail(500, {
				message: 'Failed to delete program. It might have blocks associated with it.'
			});
		}
		return { status: 200, message: 'Program deleted successfully.', action: 'deleteProgram' };
	}
};
import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// Define the roles that are allowed to view and manage this page.
const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
// Fetches the initial data needed to render the subjects page.
export const load: PageServerLoad = async ({ locals }) => {
	// Security: Ensure the user has the correct role to access this page.
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	// Fetch all subjects and join with the colleges table to get the college name.
	const { data: subjects, error: subjectsError } = await locals.supabase
		.from('subjects')
		.select(`*, colleges ( college_name )`)
		.order('subject_code', { ascending: true });

	// Fetch all colleges for the dropdown menus in the forms.
	const { data: colleges, error: collegesError } = await locals.supabase
		.from('colleges')
		.select('*')
		.order('college_name', { ascending: true });

	if (subjectsError || collegesError) {
		console.error('Error fetching subjects or colleges:', subjectsError || collegesError);
		throw error(500, 'Failed to load data from the database. Please try again later.');
	}

	// Pass the logged-in user's profile to the client for role-based UI rendering.
	// console.log(subjects);
	return {
		subjects,
		colleges,
		profile: locals.profile
	};
};

// --- ACTIONS ---
// Handles form submissions for creating, updating, and deleting subjects.
export const actions: Actions = {
	// CREATE ACTION
	createSubject: async ({ request, locals }) => {
		// Security: Only Admins should be able to create new subjects.
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to create subjects.' });
		}

		const formData = await request.formData();
		const subject_code = formData.get('subject_code')?.toString()?.trim();
		const subject_name = formData.get('subject_name')?.toString()?.trim();
		const lecture_hours = Number(formData.get('lecture_hours'));
		const lab_hours = Number(formData.get('lab_hours'));
		const college_ids = formData.getAll('college_id').map((id) => Number(id));

		// Basic Validation
		if (!subject_code || !subject_name || !college_ids) {
			return fail(400, { message: 'Subject code, name, and college are required.' });
		}

		// Create an array of subject entries for each college
		const subjectEntries = college_ids.map((college_id) => ({
			subject_code,
			subject_name,
			lecture_hours,
			lab_hours,
			college_id
		}));

		// Insert multiple entries at once
		const { error: insertError } = await locals.supabase.from('subjects').insert(subjectEntries);

		if (insertError) {
			console.error('Error creating subjects:', insertError);
			return fail(500, { message: 'Failed to create subjects. Please try again.' });
		}

		return {
			status: 201,
			message: `Subject created successfully for ${college_ids.length} college(s).`,
			action: 'createSubject'
		};
	},

	// UPDATE ACTION
	updateSubject: async ({ request, locals }) => {
		// Security: Only Admins should be able to update subjects.
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to update subjects.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const subject_code = formData.get('subject_code')?.toString()?.trim();
		const subject_name = formData.get('subject_name')?.toString()?.trim();
		const lecture_hours = Number(formData.get('lecture_hours'));
		const lab_hours = Number(formData.get('lab_hours'));
		const college_id = Number(formData.get('college_id'));

		// Validation
		if (!id || !subject_code || !subject_name || !college_id) {
			return fail(400, { message: 'All fields are required to update a subject.' });
		}

		const { error: updateError } = await locals.supabase
			.from('subjects')
			.update({
				subject_code,
				subject_name,
				lecture_hours,
				lab_hours,
				college_id
			})
			.eq('id', id);

		if (updateError) {
			console.error('Error updating subject:', updateError);
			return fail(500, { message: 'Failed to update subject. Please try again.' });
		}

		return { status: 200, message: 'Subject updated successfully.', action: 'updateSubject' };
	},

	// DELETE ACTION
	deleteSubject: async ({ request, locals }) => {
		// Security: Only Admins should be able to delete subjects.
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to delete subjects.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const ids = formData.get('ids')?.toString().split(',').map(Number);

		if (!id && !ids) {
			return fail(400, { message: 'Invalid subject ID(s).' });
		}

		const { error: deleteError } = await locals.supabase
			.from('subjects')
			.delete()
			.in('id', ids || [id]);

		if (deleteError) {
			console.error('Error deleting subjects:', deleteError);
			return fail(500, {
				message: 'Failed to delete subjects. They might be in use in a schedule.'
			});
		}

		return {
			status: 200,
			message: `Successfully deleted ${ids ? ids.length : 1} subject(s).`,
			action: 'deleteSubject'
		};
	}
};

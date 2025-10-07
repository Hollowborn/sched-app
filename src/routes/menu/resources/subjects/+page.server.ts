import { fail, error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// Define the roles that have permission to manage subjects
const PERMITTED_ROLES = ['Admin', 'Dean', 'Registrar'];

export const load: PageServerLoad = async ({ locals }) => {
	// --- Security Check ---
	// First, ensure the user has a profile and an authorized role.
	if (!locals.profile || !PERMITTED_ROLES.includes(locals.profile.role)) {
		// You can either throw an error to show a 403 Forbidden page,
		// or redirect them to a safe page like the dashboard.
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	// Fetch all subjects and join with the colleges table to get the college name
	const { data: subjects, error: subjectsError } = await locals.supabase.from('subjects').select(
		`
            id,
            subject_code,
            subject_name,
            lecture_hours,
            lab_hours,
            college_id,
            colleges (
                college_name
            )
        `
	);

	if (subjectsError) {
		console.error('Error fetching subjects:', subjectsError);
		return fail(500, { message: 'Failed to load subjects.' });
	}

	// Fetch all colleges to populate the select dropdown in the form
	const { data: colleges, error: collegesError } = await locals.supabase
		.from('colleges')
		.select('id, college_name');

	if (collegesError) {
		console.error('Error fetching colleges:', collegesError);
		return fail(500, { message: 'Failed to load colleges for form.' });
	}

	return {
		subjects,
		colleges
	};
};

export const actions: Actions = {
	createSubject: async ({ request, locals }) => {
		// --- Security Check ---
		if (!locals.profile || !PERMITTED_ROLES.includes(locals.profile.role)) {
			throw error(403, 'Forbidden: You do not have permission to create subjects.');
		}

		const formData = await request.formData();
		const subject_code = formData.get('subject_code')?.toString();
		const subject_name = formData.get('subject_name')?.toString();
		const lecture_hours = Number(formData.get('lecture_hours'));
		const lab_hours = Number(formData.get('lab_hours'));
		const college_id = Number(formData.get('college_id'));

		if (!subject_code || subject_code.length < 3) {
			return fail(400, { message: 'Subject code must be at least 3 characters.', error: true });
		}
		if (!subject_name) {
			return fail(400, { message: 'Subject name is required.', error: true });
		}
		if (isNaN(college_id)) {
			return fail(400, { message: 'Please select a college.', error: true });
		}

		const { error: insertError } = await locals.supabase.from('subjects').insert({
			subject_code,
			subject_name,
			lecture_hours,
			lab_hours,
			college_id
		});

		if (insertError) {
			console.error('Error creating subject:', insertError);
			if (insertError.code === '23505') {
				return fail(409, {
					message: `Subject code "${subject_code}" already exists.`,
					error: true
				});
			}
			return fail(500, { message: 'Failed to create subject.', error: true });
		}

		return { success: true, message: 'Subject created successfully.' };
	},

	updateSubject: async ({ request, locals }) => {
		// --- Security Check ---
		if (!locals.profile || !PERMITTED_ROLES.includes(locals.profile.role)) {
			throw error(403, 'Forbidden: You do not have permission to update subjects.');
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const subject_code = formData.get('subject_code')?.toString();
		const subject_name = formData.get('subject_name')?.toString();
		const lecture_hours = Number(formData.get('lecture_hours'));
		const lab_hours = Number(formData.get('lab_hours'));
		const college_id = Number(formData.get('college_id'));

		if (isNaN(id)) {
			return fail(400, { message: 'Invalid subject ID.', error: true });
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
			return fail(500, { message: 'Failed to update subject.', error: true });
		}

		return { success: true, message: 'Subject updated successfully.' };
	},

	deleteSubject: async ({ request, locals }) => {
		// --- Security Check (More granular for deletion) ---
		// For a destructive action like delete, you might want only Admins to do it.
		if (!locals.profile || locals.profile.role !== 'Admin') {
			throw error(403, 'Forbidden: Only administrators can delete subjects.');
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (isNaN(id)) {
			return fail(400, { message: 'Invalid subject ID.', error: true });
		}

		const { error: deleteError } = await locals.supabase.from('subjects').delete().eq('id', id);

		if (deleteError) {
			console.error('Error deleting subject:', deleteError);
			return fail(500, { message: 'Failed to delete subject.', error: true });
		}

		return { success: true, message: 'Subject deleted successfully.' };
	}
};

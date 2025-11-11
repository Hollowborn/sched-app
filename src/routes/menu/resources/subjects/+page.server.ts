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

	// Fetch all subjects and join with the colleges table via the new subject_colleges link table.
	// Supabase automatically resolves the many-to-many relationship.
	const { data: subjects, error: subjectsError } = await locals.supabase
		.from('subjects')
		.select(`*, colleges ( id, college_name )`)
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
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to create subjects.' });
		}

		const formData = await request.formData();
		const subject_code = formData.get('subject_code')?.toString()?.trim();
		const subject_name = formData.get('subject_name')?.toString()?.trim();
		const lecture_hours = Number(formData.get('lecture_hours'));
		const lab_hours = Number(formData.get('lab_hours'));
		const college_ids = formData.getAll('college_ids').map((id) => Number(id));

		if (!subject_code || !subject_name || college_ids.length === 0) {
			return fail(400, { message: 'Subject code, name, and at least one college are required.' });
		}

		// Step 1: Insert the new subject into the 'subjects' table.
		const { data: newSubject, error: subjectInsertError } = await locals.supabase
			.from('subjects')
			.insert({ subject_code, subject_name, lecture_hours, lab_hours })
			.select('id')
			.single();

		if (subjectInsertError) {
			console.error('Error creating subject:', subjectInsertError);
			if (subjectInsertError.code === '23505') {
				// Unique constraint violation
				return fail(409, { message: `Subject with code '${subject_code}' already exists.` });
			}
			return fail(500, { message: 'Failed to create subject.' });
		}

		// Step 2: Insert the associations into the 'subject_colleges' linking table.
		const subjectCollegeLinks = college_ids.map((college_id) => ({
			subject_id: newSubject.id,
			college_id: college_id
		}));

		const { error: linkInsertError } = await locals.supabase
			.from('subject_colleges')
			.insert(subjectCollegeLinks);

		if (linkInsertError) {
			console.error('Error linking subject to colleges:', linkInsertError);
			// Attempt to clean up the orphaned subject if linking fails
			await locals.supabase.from('subjects').delete().eq('id', newSubject.id);
			return fail(500, { message: 'Failed to link subject to colleges.' });
		}

		return {
			status: 201,
			message: `Subject '${subject_code}' created successfully.`
		};
	},

	// UPDATE ACTION
	updateSubject: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to update subjects.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const subject_code = formData.get('subject_code')?.toString()?.trim();
		const subject_name = formData.get('subject_name')?.toString()?.trim();
		const lecture_hours = Number(formData.get('lecture_hours'));
		const lab_hours = Number(formData.get('lab_hours'));
		const college_ids = formData.getAll('college_ids').map((id) => Number(id));

		if (!id || !subject_code || !subject_name || college_ids.length === 0) {
			return fail(400, { message: 'All fields and at least one college are required.' });
		}

		// Step 1: Update the subject's details in the 'subjects' table.
		const { error: updateError } = await locals.supabase
			.from('subjects')
			.update({ subject_code, subject_name, lecture_hours, lab_hours })
			.eq('id', id);

		if (updateError) {
			console.error('Error updating subject:', updateError);
			return fail(500, { message: 'Failed to update subject details.' });
		}

		// Step 2: Sync the college associations.
		// Easiest way is to delete all existing links and re-insert the new ones.
		const { error: deleteLinkError } = await locals.supabase
			.from('subject_colleges')
			.delete()
			.eq('subject_id', id);

		if (deleteLinkError) {
			console.error('Error clearing subject college links:', deleteLinkError);
			return fail(500, { message: 'Failed to update college associations (delete step).' });
		}

		const subjectCollegeLinks = college_ids.map((college_id) => ({
			subject_id: id,
			college_id: college_id
		}));

		const { error: linkInsertError } = await locals.supabase
			.from('subject_colleges')
			.insert(subjectCollegeLinks);

		if (linkInsertError) {
			console.error('Error re-linking subject to colleges:', linkInsertError);
			return fail(500, { message: 'Failed to update college associations (insert step).' });
		}

		return { status: 200, message: 'Subject updated successfully.' };
	},

	// DELETE ACTION
	deleteSubject: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to delete subjects.' });
		}
		const formData = await request.formData();
		const id = formData.get('id') ? Number(formData.get('id')) : null;
		const idsString = formData.get('ids')?.toString();
		const ids = idsString ? idsString.split(',').map(Number) : id ? [id] : [];

		if (ids.length === 0) {
			return fail(400, { message: 'Invalid subject ID(s).' });
		}

		// Deleting from 'subjects' will cascade and delete entries from 'subject_colleges'
		// due to the ON DELETE CASCADE constraint in the database schema.
		const { error: deleteError } = await locals.supabase.from('subjects').delete().in('id', ids);

		if (deleteError) {
			console.error('Error deleting subjects:', deleteError);
			return fail(500, {
				message: 'Failed to delete subjects. They might be in use in a schedule.'
			});
		}

		return {
			status: 200,
			message: `Successfully deleted ${ids.length} subject(s).`
		};
	}
};
import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	// Get filters from URL, providing sensible defaults for the current academic year.
	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';

	// Fetch class offerings for the selected term, joining all necessary related data.
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select(
			`
            id,
            semester,
            academic_year,
            subjects (id, subject_code, subject_name, college_id),
            instructors (id, name),
            blocks (id, block_name)
        `
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	if (classesError) {
		console.error('Error fetching class offerings:', classesError);
		throw error(500, 'Failed to load class offerings.');
	}

	// Fetch all necessary data for the "Create" modal dropdowns.
	const [{ data: subjects }, { data: instructors }, { data: blocks }, { data: colleges }] =
		await Promise.all([
			locals.supabase.from('subjects').select('id, subject_code, subject_name, college_id'),
			locals.supabase.from('instructors').select('id, name'),
			locals.supabase.from('blocks').select('id, block_name'),
			locals.supabase.from('colleges').select('id, college_name')
		]);

	return {
		classes: classes || [],
		subjects: subjects || [],
		instructors: instructors || [],
		blocks: blocks || [],
		colleges: colleges || [],
		profile: locals.profile,
		filters: { academic_year, semester }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !['Admin', 'Dean', 'Registrar'].includes(userRole)) {
			return fail(403, { message: 'Forbidden: You do not have permission to create classes.' });
		}

		const formData = await request.formData();
		const subject_id = Number(formData.get('subject_id'));
		const block_id = Number(formData.get('block_id'));
		const instructor_id_val = formData.get('instructor_id');
		const instructor_id =
			instructor_id_val && Number(instructor_id_val) > 0 ? Number(instructor_id_val) : null;
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString();

		if (!subject_id || !block_id || !academic_year || !semester) {
			return fail(400, { message: 'Subject, Block, Academic Year, and Semester are required.' });
		}

		const { error: insertError } = await locals.supabase.from('classes').insert({
			subject_id,
			block_id,
			instructor_id,
			academic_year,
			semester
		});

		if (insertError) {
			console.error('Error creating class offering:', insertError);
			// Check for unique constraint violation
			if (insertError.code === '23505') {
				return fail(409, {
					message: 'This class offering already exists for the selected block and semester.'
				});
			}
			return fail(500, { message: 'Failed to create class offering.' });
		}

		return { status: 201, message: 'Class offering created successfully.' };
	},

	deleteClass: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (userRole !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can delete class offerings.' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, { message: 'Invalid class offering ID.' });
		}

		const { error: deleteError } = await locals.supabase.from('classes').delete().eq('id', id);

		if (deleteError) {
			console.error('Error deleting class offering:', deleteError);
			return fail(500, {
				message: 'Failed to delete class offering. It might be in use in a schedule.'
			});
		}

		return { status: 200, message: 'Class offering deleted successfully.' };
	}
};

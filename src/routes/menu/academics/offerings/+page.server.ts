import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
// Fetches all the necessary data for creating and viewing class offerings.
export const load: PageServerLoad = async ({ locals, url }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	// Default filters from URL or set to current academic period
	const now = new Date();
	const currentYear = now.getFullYear();
	const currentMonth = now.getMonth(); // 0-11

	// Simple logic: Jun-Oct is 1st Sem, Nov-Mar is 2nd Sem, Apr-May is Summer
	let defaultSemester: '1st Semester' | '2nd Semester' | 'Summer' = '1st Semester';
	if (currentMonth >= 10 || currentMonth <= 2) {
		defaultSemester = '2nd Semester';
	}
	if (currentMonth >= 3 && currentMonth <= 4) {
		defaultSemester = 'Summer';
	}

	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || defaultSemester;

	// Fetch all data in parallel for efficiency
	const [classesRes, subjectsRes, instructorsRes, blocksRes, collegesRes] = await Promise.all([
		locals.supabase
			.from('classes')
			.select(
				`
                id,
                semester,
                academic_year,
                subjects ( id, subject_code, subject_name, college_id ),
                instructors ( id, name ),
                blocks ( id, block_name )
            `
			)
			.eq('academic_year', academic_year)
			.eq('semester', semester),
		locals.supabase.from('subjects').select('id, subject_code, subject_name, college_id'),
		locals.supabase.from('instructors').select('id, name'),
		locals.supabase.from('blocks').select('id, block_name'),
		locals.supabase.from('colleges').select('id, college_name')
	]);

	if (
		classesRes.error ||
		subjectsRes.error ||
		instructorsRes.error ||
		blocksRes.error ||
		collegesRes.error
	) {
		const dbError =
			classesRes.error ||
			subjectsRes.error ||
			instructorsRes.error ||
			blocksRes.error ||
			collegesRes.error;
		console.error('Error fetching class offerings data:', dbError);
		throw error(500, 'Failed to load necessary data from the database.');
	}

	return {
		profile: locals.profile,
		classes: classesRes.data,
		subjects: subjectsRes.data,
		instructors: instructorsRes.data,
		blocks: blocksRes.data,
		colleges: collegesRes.data,
		filters: {
			academic_year,
			semester
		}
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin' && locals.profile?.role !== 'Dean') {
			return fail(403, { message: 'Forbidden: You do not have permission to create classes.' });
		}

		const formData = await request.formData();
		const subject_id = Number(formData.get('subject_id'));
		const instructor_id = Number(formData.get('instructor_id')) || null;
		const block_id = Number(formData.get('block_id'));
		const semester = formData.get('semester')?.toString();
		const academic_year = formData.get('academic_year')?.toString();

		if (!subject_id || !block_id || !semester || !academic_year) {
			return fail(400, { message: 'Missing required fields for creating a class offering.' });
		}

		const { error: insertError } = await locals.supabase.from('classes').insert({
			subject_id,
			instructor_id: instructor_id === 0 ? null : instructor_id, // Handle 'Unassigned' case
			block_id,
			semester,
			academic_year
		});

		if (insertError) {
			console.error('Error creating class offering:', insertError);
			if (insertError.code === '23505') {
				// Unique constraint violation
				return fail(409, {
					message: 'This class offering (subject + block) already exists for this semester.'
				});
			}
			return fail(500, { message: 'Failed to create class offering.' });
		}

		return { status: 201, message: 'Class offering created successfully.', action: 'createClass' };
	},

	deleteClass: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin' && locals.profile?.role !== 'Dean') {
			return fail(403, { message: 'Forbidden: You do not have permission to delete classes.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, { message: 'Invalid class ID.' });
		}

		const { error: deleteError } = await locals.supabase.from('classes').delete().eq('id', id);

		if (deleteError) {
			console.error('Error deleting class offering:', deleteError);
			return fail(500, {
				message: 'Failed to delete class offering. It might have schedules assigned to it.'
			});
		}

		return { status: 200, message: 'Class offering deleted successfully.', action: 'deleteClass' };
	}
};

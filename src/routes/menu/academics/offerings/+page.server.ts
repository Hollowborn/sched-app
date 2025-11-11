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
	const college_id = url.searchParams.get('college');
	const createSubjectId = url.searchParams.get('createSubjectId');

	// Fetch class offerings for the selected term, joining all necessary related data.
	let query = locals.supabase
		.from('classes')
		.select(
			`
            id,
            semester,
            academic_year,
            subjects!inner (id, subject_code, subject_name, college_id),
            instructors (id, name),
            blocks (id, block_name)
        `
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	if (college_id) {
		query = query.eq('subjects.college_id', college_id);
	}

	const { data: classes, error: classesError } = await query;

	if (classesError) {
		console.error('Error fetching class offerings:', classesError);
		throw error(500, 'Failed to load class offerings.');
	}

		// Fetch all necessary data for the "Create" modal dropdowns.
		const [
			{ data: subjects, error: subjectsError },
			{ data: instructors },
			{ data: blocks },
			{ data: colleges },
			{ data: programs },
			{ data: rooms } // Added rooms
		] = await Promise.all([
			locals.supabase
				.from('subjects')
				.select('id, subject_code, subject_name, college_id')
				.order('subject_code'),
			locals.supabase.from('instructors').select('id, name'),
			locals.supabase
				.from('blocks')
				.select(
					`
						id,
						block_name,
						program_id,
						year_level
						`
				)
				.order('block_name'),
			locals.supabase.from('colleges').select('id, college_name').order('college_name'),
			locals.supabase.from('programs').select('id, program_name, college_id').order('program_name'),
			locals.supabase.from('rooms').select('id, room_name, building').order('room_name') // New query for rooms
		]);
	
		if (subjectsError) {
			console.error('Error fetching subjects:', subjectsError);
			throw error(500, 'Failed to load subjects.');
		}
	
		return {
			classes: classes || [],
			subjects: subjects || [],
			instructors: instructors || [],
			blocks: blocks || [],
			colleges: colleges || [],
			programs: programs || [],
			rooms: rooms || [], // Added rooms to return object
			profile: locals.profile,
			filters: { academic_year, semester, college: college_id, createSubjectId: createSubjectId || null }
		};};

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
		const pref_room_id_val = formData.get('pref_room_id'); // New: Get pref_room_id
		const pref_room_id =
			pref_room_id_val && Number(pref_room_id_val) > 0 ? Number(pref_room_id_val) : null; // New: Convert to number or null
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString();

		if (!subject_id || !block_id || !academic_year || !semester) {
			return fail(400, { message: 'Subject, Block, Academic Year, and Semester are required.' });
		}

		const { error: insertError } = await locals.supabase.from('classes').insert({
			subject_id,
			block_id,
			instructor_id,
			pref_room_id, // New: Include pref_room_id
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
		const idParam = formData.get('id');
		const idsParam = formData.get('ids');

		// Handle both single and bulk delete
		const ids = idsParam
			? idsParam.toString().split(',').map(Number)
			: idParam
				? [Number(idParam)]
				: [];

		if (ids.length === 0) {
			return fail(400, { message: 'No class offerings selected for deletion.' });
		}

		const { error: deleteError } = await locals.supabase.from('classes').delete().in('id', ids);

		if (deleteError) {
			console.error('Error deleting class offering:', deleteError);
			return fail(500, {
				message: 'Failed to delete class offering. It might be in use in a schedule.'
			});
		}

		return { status: 200, message: 'Class offering deleted successfully.' };
	}
};

import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';
	const college_id = url.searchParams.get('college');

	// Fetch class offerings, filtering by the college associated with the block/program
	let query = locals.supabase
		.from('classes')
		.select(
			`
            id,
            semester,
            academic_year,
            pref_room_id,
            split_lecture,
            lecture_days,
            subjects!inner (id, subject_code, subject_name),
            instructors (id, name),
            blocks!inner (
                id,
                block_name,
                programs!inner (
                    college_id
                )
            )
        `
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	if (college_id) {
		query = query.eq('blocks.programs.college_id', college_id);
	}

	const { data: classes, error: classesError } = await query;

	if (classesError) {
		console.error('Error fetching class offerings:', classesError);
		throw error(500, 'Failed to load class offerings.');
	}

	// Post-process the data to ensure lecture_days is always an array
	const processedClasses = classes.map((c) => {
		if (c.lecture_days && typeof c.lecture_days === 'string') {
			try {
				return { ...c, lecture_days: JSON.parse(c.lecture_days) };
			} catch (e) {
				// Fallback for malformed JSON or other string formats
				return { ...c, lecture_days: [] };
			}
		}
		return c;
	});

	// Fetch all necessary data for the "Create" modal dropdowns
	const [
		{ data: subjects, error: subjectsError },
		{ data: instructors },
		{ data: blocks },
		{ data: colleges },
		{ data: programs },
		{ data: rooms }
	] = await Promise.all([
		locals.supabase.from('subjects').select('*, colleges(id, college_name)').order('subject_code'),
		locals.supabase
			.from('instructors')
			.select('id, name, instructor_subjects(subject_id)')
			.order('name'),
		locals.supabase
			.from('blocks')
			.select('id, block_name, year_level, programs!inner(college_id)')
			.order('block_name'),
		locals.supabase.from('colleges').select('id, college_name').order('college_name'),
		locals.supabase.from('programs').select('id, program_name, college_id').order('program_name'),
		locals.supabase.from('rooms').select('id, room_name, building').order('room_name')
	]);

	if (subjectsError) {
		console.error('Error fetching subjects:', subjectsError);
		throw error(500, 'Failed to load subjects.');
	}

	return {
		classes: processedClasses || [],
		subjects: subjects || [],
		instructors: instructors || [],
		blocks: blocks || [],
		colleges: colleges || [],
		programs: programs || [],
		rooms: rooms || [],
		profile: locals.profile,
		filters: { academic_year, semester, college: college_id }
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
		const pref_room_id_val = formData.get('pref_room_id');
		const pref_room_id =
			pref_room_id_val && Number(pref_room_id_val) > 0 ? Number(pref_room_id_val) : null;
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString();
		const split_lecture_str = formData.get('split_lecture')?.toString();
		const split_lecture = split_lecture_str === 'true'; // Convert string to boolean
		const lecture_days_str = formData.get('lecture_days')?.toString();
		const lecture_days = lecture_days_str ? JSON.parse(lecture_days_str) : null;

		if (!subject_id || !block_id || !academic_year || !semester) {
			return fail(400, { message: 'Subject, Block, Academic Year, and Semester are required.' });
		}

		const { error: insertError } = await locals.supabase.from('classes').insert({
			subject_id,
			block_id,
			instructor_id,
			pref_room_id,
			academic_year,
			semester,
			split_lecture,
			lecture_days
		});

		if (insertError) {
			console.error('Error creating class offering:', insertError);
			if (insertError.code === '23505') {
				return fail(409, {
					message: 'This class offering already exists for the selected block and semester.'
				});
			}
			return fail(500, { message: 'Failed to create class offering.' });
		}

		return { status: 201, message: 'Class offering created successfully.' };
	},

	createBulkClasses: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !['Admin', 'Dean', 'Registrar'].includes(userRole)) {
			return fail(403, { message: 'Forbidden: You do not have permission to create classes.' });
		}

		const formData = await request.formData();
		const block_id = Number(formData.get('block_id'));
		const subject_ids_str = formData.get('subject_ids')?.toString();
		const subject_ids = subject_ids_str ? subject_ids_str.split(',').map(Number) : [];
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString();
		const split_lecture_flag = formData.get('split_lecture') === 'true';

		if (!block_id || subject_ids.length === 0 || !academic_year || !semester) {
			return fail(400, {
				message: 'Block, at least one Subject, Academic Year, and Semester are required.'
			});
		}

		// 1. Find which of these subjects are ALREADY offered for this block/term
		const { data: existingClasses, error: fetchError } = await locals.supabase
			.from('classes')
			.select('subject_id')
			.eq('block_id', block_id)
			.eq('academic_year', academic_year)
			.eq('semester', semester)
			.in('subject_id', subject_ids);

		if (fetchError) {
			console.error('Error checking for existing classes:', fetchError);
			return fail(500, { message: 'Could not verify existing offerings.' });
		}

		const existingSubjectIds = new Set(existingClasses.map((c) => c.subject_id));
		const newSubjectIds = subject_ids.filter((id) => !existingSubjectIds.has(id));

		if (newSubjectIds.length === 0) {
			return fail(409, { message: 'All selected subjects are already offered for this block.' });
		}

		// Fetch subject details to apply split_lecture only where applicable
		const { data: subjectsDetails } = await locals.supabase
			.from('subjects')
			.select('id, lecture_hours')
			.in('id', newSubjectIds);

		const subjectsWithLectureHours = new Set(
			(subjectsDetails || [])
				.filter((s) => s.lecture_hours && s.lecture_hours > 0)
				.map((s) => s.id)
		);

		// 2. Insert only the new offerings
		const offeringsToInsert = newSubjectIds.map((subject_id) => ({
			subject_id,
			block_id,
			academic_year,
			semester,
			split_lecture: split_lecture_flag && subjectsWithLectureHours.has(subject_id),
			lecture_days: [] // Explicitly set lecture_days to empty array
		}));

		const { data: insertedData, error: insertError } = await locals.supabase
			.from('classes')
			.insert(offeringsToInsert)
			.select('id');

		if (insertError) {
			console.error('Error bulk creating class offerings:', insertError);
			return fail(500, { message: 'An error occurred while creating new offerings.' });
		}

		const createdCount = insertedData?.length || 0;
		const skippedCount = subject_ids.length - createdCount;
		let message = `Successfully created ${createdCount} class offering(s).`;
		if (skippedCount > 0) {
			message += ` ${skippedCount} offering(s) already existed and were skipped.`;
		}

		return { status: 201, message };
	},

	deleteClass: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (userRole !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can delete class offerings.' });
		}

		const formData = await request.formData();
		const idParam = formData.get('id');
		const idsParam = formData.get('ids');

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

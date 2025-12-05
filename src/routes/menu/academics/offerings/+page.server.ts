import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar', 'Chairperson'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const profile = locals.profile;
	if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const { role, college_id: user_college_id, program_id: user_program_id } = profile;

	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';
	const college_id_param = url.searchParams.get('college');

	// Determine the effective college ID to filter by, based on role and URL parameters.
	let effective_college_id = role === 'Admin' ? college_id_param : user_college_id;

	// --- 1. Fetch Class Offerings (scoped) ---
	let classesQuery = locals.supabase
		.from('classes')
		.select(
			`
			id, semester, academic_year, room_preferences, split_lecture, lecture_days,
			subjects!inner (id, subject_code, subject_name, lecture_hours),
			instructors (id, name),
			blocks!inner (id, block_name, programs!inner (id, college_id))
		`
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	if (role === 'Chairperson') {
		if (!user_program_id) throw error(403, 'Chairperson is not assigned to a program.');
		classesQuery = classesQuery.eq('blocks.programs.id', user_program_id);
	} else if (effective_college_id) {
		classesQuery = classesQuery.eq('blocks.programs.college_id', effective_college_id);
	}

	// --- 2. Fetch Modal/Form Data (scoped) ---
	let subjectsQuery = locals.supabase
		.from('subjects')
		.select('*, subject_colleges!inner(college_id), colleges(id, college_name)')
		.order('subject_code');

	let instructorsQuery = locals.supabase
		.from('instructors')
		.select('id, name, instructor_subjects(subject_id), instructor_colleges!inner(college_id)')
		.order('name');

	let blocksQuery = locals.supabase
		.from('blocks')
		.select('id, block_name, year_level, programs!inner(id, college_id)')
		.order('block_name');

	if (role === 'Chairperson') {
		if (!user_program_id) throw error(403, 'Chairperson is not assigned to a program.');
		// A chairperson's college_id is derived from their program's college.
		const { data: programData } = await locals.supabase
			.from('programs')
			.select('college_id')
			.eq('id', user_program_id)
			.single();
		const chairperson_college_id = programData?.college_id;

		if (!chairperson_college_id) throw error(500, 'Could not determine chairperson college.');

		effective_college_id = chairperson_college_id;
		blocksQuery = blocksQuery.eq('program_id', user_program_id);
		subjectsQuery = subjectsQuery.eq('subject_colleges.college_id', effective_college_id);
		instructorsQuery = instructorsQuery.eq('instructor_colleges.college_id', effective_college_id);
	} else if (role === 'Dean') {
		if (!user_college_id) throw error(403, 'Dean is not assigned to a college.');
		blocksQuery = blocksQuery.eq('programs.college_id', user_college_id);
		subjectsQuery = subjectsQuery.eq('subject_colleges.college_id', user_college_id);
		instructorsQuery = instructorsQuery.eq('instructor_colleges.college_id', user_college_id);
	}

	// For Admins, no extra filters are needed unless they use the college filter dropdown
	if (role === 'Admin' && college_id_param) {
		blocksQuery = blocksQuery.eq('programs.college_id', college_id_param);
		subjectsQuery = subjectsQuery.eq('subject_colleges.college_id', college_id_param);
		instructorsQuery = instructorsQuery.eq('instructor_colleges.college_id', college_id_param);
	}

	// --- 3. Execute all queries in parallel ---
	const [
		{ data: classes, error: classesError },
		{ data: subjects, error: subjectsError },
		{ data: instructors },
		{ data: blocks },
		{ data: colleges },
		{ data: programs },
		{ data: rooms }
	] = await Promise.all([
		classesQuery,
		subjectsQuery,
		instructorsQuery,
		blocksQuery,
		locals.supabase.from('colleges').select('id, college_name').order('college_name'),
		locals.supabase.from('programs').select('id, program_name, college_id').order('program_name'),
		locals.supabase.from('rooms').select('id, room_name, building').order('room_name')
	]);

	if (classesError) throw error(500, 'Failed to load class offerings.');
	if (subjectsError) throw error(500, 'Failed to load subjects for modal.');

	// Post-process classes to handle JSON parsing for lecture_days
	const processedClasses = (classes || []).map((c) => ({
		...c,
		lecture_days:
			c.lecture_days && typeof c.lecture_days === 'string' ? JSON.parse(c.lecture_days) : []
	}));

	return {
		classes: processedClasses,
		subjects: subjects || [],
		instructors: instructors || [],
		blocks: blocks || [],
		colleges: colleges || [],
		programs: programs || [],
		rooms: rooms || [],
		profile: profile,
		userCollegeId: effective_college_id, // Pass the determined college ID to the frontend
		filters: { academic_year, semester, college: college_id_param }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createClass: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !['Admin', 'Dean', 'Registrar', 'Chairperson'].includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission to create classes.' });
		}

		const formData = await request.formData();
		const subject_id = Number(formData.get('subject_id'));
		const block_id = Number(formData.get('block_id'));

		// --- Authorization for Chairperson ---
		if (profile.role === 'Chairperson') {
			if (!profile.program_id) {
				return fail(403, { message: 'Your account is not assigned to a program.' });
			}
			const { data: blockProgram } = await locals.supabase
				.from('blocks')
				.select('program_id')
				.eq('id', block_id)
				.single();

			if (!blockProgram || blockProgram.program_id !== profile.program_id) {
				return fail(403, {
					message: 'Forbidden: You can only create offerings for blocks within your own program.'
				});
			}
		}
		const instructor_id_val = formData.get('instructor_id');
		const instructor_id =
			instructor_id_val && Number(instructor_id_val) > 0 ? Number(instructor_id_val) : null;
		const priority_room_id_val = formData.get('priority_room_id');
		const priority =
			priority_room_id_val && Number(priority_room_id_val) > 0 ? Number(priority_room_id_val) : null;
		const option_room_ids_str = formData.get('option_room_ids')?.toString();
		const options = option_room_ids_str ? JSON.parse(option_room_ids_str) : [];
		
		const room_preferences = {
			priority,
			options
		};
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
			room_preferences,
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
		const profile = locals.profile;
		if (!profile || !['Admin', 'Dean', 'Registrar', 'Chairperson'].includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission to create classes.' });
		}

		const formData = await request.formData();
		const block_id = Number(formData.get('block_id'));

		// --- Authorization for Chairperson ---
		if (profile.role === 'Chairperson') {
			if (!profile.program_id) {
				return fail(403, { message: 'Your account is not assigned to a program.' });
			}
			const { data: blockProgram } = await locals.supabase
				.from('blocks')
				.select('program_id')
				.eq('id', block_id)
				.single();

			if (!blockProgram || blockProgram.program_id !== profile.program_id) {
				return fail(403, {
					message: 'Forbidden: You can only create offerings for blocks within your own program.'
				});
			}
		}
		const subject_ids_str = formData.get('subject_ids')?.toString();
		const subject_ids = subject_ids_str ? subject_ids_str.split(',').map(Number) : [];
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString();
		const split_lecture_flag = formData.get('split_lecture') === 'true';
		const default_option_room_ids_str = formData.get('default_option_room_ids')?.toString();
		const default_options = default_option_room_ids_str ? JSON.parse(default_option_room_ids_str) : [];
		
		const bulk_priority_room_id_val = formData.get('bulk_priority_room_id');
		const bulk_priority =
			bulk_priority_room_id_val && Number(bulk_priority_room_id_val) > 0
				? Number(bulk_priority_room_id_val)
				: null;

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
			(subjectsDetails || []).filter((s) => s.lecture_hours && s.lecture_hours > 0).map((s) => s.id)
		);

		// 2. Insert only the new offerings
		const offeringsToInsert = newSubjectIds.map((subject_id) => ({
			subject_id,
			block_id,
			academic_year,
			semester,
			split_lecture: split_lecture_flag && subjectsWithLectureHours.has(subject_id),
			lecture_days: [], // Explicitly set lecture_days to empty array
			room_preferences: { priority: bulk_priority, options: default_options }
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
		if (userRole === 'Registrar') {
			return fail(403, { message: 'Forbidden: Registrars can`t delete class offerings.' });
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

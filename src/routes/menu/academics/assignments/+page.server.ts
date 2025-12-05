import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// This page is for Admins, Deans, and Chairpersons.
const ALLOWED_ROLES = ['Admin', 'Dean', 'Chairperson'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const profile = locals.profile;
	if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to assign instructors.');
	}

	const { role, college_id: user_college_id, program_id: user_program_id } = profile;

	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';
	const college_filter_id_param = url.searchParams.get('college');

	let effective_college_id: string | number | null = null;
	// Determine the effective college ID based on role
	if (role === 'Admin') {
		effective_college_id = college_filter_id_param; // Admin can use filter or see all relevant to their college filter
	} else if (role === 'Dean') {
		if (!user_college_id) throw error(403, 'Dean is not assigned to a college.');
		effective_college_id = user_college_id;
	} else if (role === 'Chairperson') {
		if (!user_program_id) throw error(403, 'Chairperson is not assigned to a program.');
		const { data: programData } = await locals.supabase
			.from('programs')
			.select('college_id')
			.eq('id', user_program_id)
			.single();
		const chairperson_college_id = programData?.college_id;
		if (!chairperson_college_id) throw error(500, 'Could not determine chairperson college.');
		effective_college_id = chairperson_college_id;
	}

	// --- 1. Fetch Class Offerings for the selected term (scoped) ---
	let classQuery = locals.supabase
		.from('classes')
		.select(
			`
            id, split_lecture, lecture_days, subjects!inner (id, subject_code, subject_name, lecture_hours),
            instructors (id, name),
            blocks!inner (id, block_name, programs!inner (id, college_id, program_name)),
            room_preferences
        `
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	if (role === 'Chairperson') {
		classQuery = classQuery.eq('blocks.programs.id', user_program_id);
	} else if (effective_college_id) {
		classQuery = classQuery.eq('blocks.programs.college_id', effective_college_id);
	}

	const { data: classes, error: classesError } = await classQuery;

	if (classesError) {
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load class offerings.');
	}

	// Post-process the data to ensure lecture_days is always an array
	const processedClasses = (classes || []).map((c) => {
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

	// --- 2. Fetch Instructors and Calculate Their Current Workload (scoped) ---
	let instructorQuery = locals.supabase
		.from('instructors')
		.select(
			'id, name, max_load, instructor_colleges!inner(college_id), instructor_subjects(subject_id)'
		);

	if (effective_college_id) {
		instructorQuery = instructorQuery.eq('instructor_colleges.college_id', effective_college_id);
	}

	const { data: instructors, error: instructorsError } = await instructorQuery;

	if (instructorsError) {
		console.error('Error fetching instructors:', instructorsError);
		throw error(500, 'Could not fetch instructors.');
	}

	// This is the same logic from the instructor page to get real-time workloads
	const { data: assignedClassesForLoad } = await locals.supabase
		.from('classes')
		.select('instructor_id, subjects(lecture_hours, lab_hours)')
		.eq('academic_year', academic_year)
		.eq('semester', semester)
		.not('instructor_id', 'is', null);

	const instructorsWithLoad = instructors.map((instructor) => {
		const current_load = (assignedClassesForLoad || [])
			.filter((c) => c.instructor_id === instructor.id)
			.reduce((acc, currentClass) => {
				const subject = currentClass.subjects;
				if (subject) {
					return acc + Number(subject.lecture_hours) + Number(subject.lab_hours);
				}
				return acc;
			}, 0);
		return { ...instructor, current_load };
	});

	// Fetch colleges for the filter dropdown (only for Admin role)
	const { data: colleges } =
		role === 'Admin'
			? await locals.supabase.from('colleges').select('id, college_name')
			: { data: [] };

	// Fetch rooms for the dropdown
	const { data: rooms } = await locals.supabase
		.from('rooms')
		.select('id, room_name, type, owner_college_id, is_general_use')
		.order('room_name');

	return {
		classes: processedClasses || [],
		instructors: instructorsWithLoad || [],
		rooms: rooms || [],
		colleges: colleges || [],
		profile: profile,
		userCollegeId: effective_college_id, // Pass to frontend for consistency
		filters: { academic_year, semester, college: college_filter_id_param }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	assignInstructor: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'You do not have permission to assign instructors.' });
		}

		const formData = await request.formData();
		const classId = Number(formData.get('classId'));
		const instructorIdVal = formData.get('instructorId');

		// Handle "Unassigned" selection
		const instructor_id =
			instructorIdVal && Number(instructorIdVal) > 0 ? Number(instructorIdVal) : null;

		if (!classId) {
			return fail(400, { message: 'Invalid class ID.' });
		}

		const { error: updateError } = await locals.supabase
			.from('classes')
			.update({ instructor_id })
			.eq('id', classId);

		if (updateError) {
			console.error('Error assigning instructor:', updateError);
			return fail(500, { message: 'Failed to assign instructor.' });
		}

		return { message: 'Instructor assigned successfully.' };
	},

	assignRoom: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'You do not have permission to assign rooms.' });
		}

		const formData = await request.formData();
		const classId = Number(formData.get('classId'));
		const priorityRoomId = formData.get('priorityRoomId');
		const optionRoomIdsStr = formData.get('optionRoomIds')?.toString();

		if (!classId) {
			return fail(400, { message: 'Invalid class ID.' });
		}

		const priority = priorityRoomId && Number(priorityRoomId) > 0 ? Number(priorityRoomId) : null;
		const options = optionRoomIdsStr ? JSON.parse(optionRoomIdsStr) : [];

		const room_preferences = {
			priority,
			options
		};

		const { error: updateError } = await locals.supabase
			.from('classes')
			.update({ room_preferences })
			.eq('id', classId);

		if (updateError) {
			console.error('Error assigning room preferences:', updateError);
			return fail(500, { message: 'Failed to assign room preferences.' });
		}

		return { message: 'Room preferences updated successfully.' };
	},

	updateLectureSplit: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'You do not have permission to modify lecture splits.' });
		}

		const formData = await request.formData();
		const classId = Number(formData.get('classId'));
		const split_lecture = formData.get('split_lecture') === 'true';
		const lecture_days_str = formData.get('lecture_days')?.toString();
		const lecture_days = lecture_days_str ? JSON.parse(lecture_days_str) : [];

		if (!classId) {
			return fail(400, { message: 'Invalid class ID.' });
		}

		// If splitting is turned off, ensure lecture_days is cleared.
		const dataToUpdate = {
			split_lecture,
			lecture_days: split_lecture ? lecture_days : []
		};

		const { error: updateError } = await locals.supabase
			.from('classes')
			.update(dataToUpdate)
			.eq('id', classId);

		if (updateError) {
			console.error('Error updating lecture split:', updateError);
			return fail(500, { message: 'Failed to update lecture split settings.' });
		}

		return { message: 'Lecture split settings updated.' };
	},

	autoAssign: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission to auto-assign.' });
		}

		const formData = await request.formData();
		const academic_year =
			formData.get('academic_year')?.toString() ||
			`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
		const semester = formData.get('semester')?.toString() || '1st Semester';
		const college_filter_id_param = formData.get('college')?.toString();

		// --- 1. Determine Scope (Same logic as load function) ---
		let effective_college_id: string | number | null = null;
		let effective_program_id: number | null = null;

		if (profile.role === 'Admin') {
			effective_college_id = college_filter_id_param || null;
		} else if (profile.role === 'Dean') {
			effective_college_id = profile.college_id;
		} else if (profile.role === 'Chairperson') {
			effective_program_id = profile.program_id;
		}

		// --- 2. Fetch Unassigned Classes ---
		let classQuery = locals.supabase
			.from('classes')
			.select(
				`
				id, subject_id,
				blocks!inner (id, programs!inner (id, college_id))
			`
			)
			.eq('academic_year', academic_year)
			.eq('semester', semester)
			.is('instructor_id', null); // Only unassigned

		if (effective_program_id) {
			classQuery = classQuery.eq('blocks.programs.id', effective_program_id);
		} else if (effective_college_id) {
			classQuery = classQuery.eq('blocks.programs.college_id', effective_college_id);
		}

		const { data: unassignedClasses, error: classError } = await classQuery;
		if (classError) {
			console.error('Auto-assign fetch classes error:', classError);
			return fail(500, { message: 'Failed to fetch unassigned classes.' });
		}

		if (!unassignedClasses || unassignedClasses.length === 0) {
			return { message: 'No unassigned classes found to process.' };
		}

		// --- 3. Fetch Instructors with Qualifications ---
		let instructorQuery = locals.supabase
			.from('instructors')
			.select('id, instructor_colleges!inner(college_id), instructor_subjects(subject_id)');

		if (effective_college_id) {
			instructorQuery = instructorQuery.eq('instructor_colleges.college_id', effective_college_id);
		}

		const { data: instructors, error: instructorError } = await instructorQuery;
		if (instructorError) {
			console.error('Auto-assign fetch instructors error:', instructorError);
			return fail(500, { message: 'Failed to fetch instructors.' });
		}

		// --- 4. Process Auto-Assignment ---
		let assignedCount = 0;
		const updates = [];

		for (const cls of unassignedClasses) {
			// Find qualified instructors for this class's subject
			const qualifiedInstructors = instructors.filter((inst) =>
				inst.instructor_subjects.some((sub) => sub.subject_id === cls.subject_id)
			);

			// If EXACTLY ONE qualified instructor, assign them
			if (qualifiedInstructors.length === 1) {
				updates.push({
					id: cls.id,
					instructor_id: qualifiedInstructors[0].id
				});
				assignedCount++;
			}
		}

		// --- 5. Batch Update ---
		if (updates.length > 0) {
			// Supabase doesn't have a direct "update many with different values" in one query easily without RPC or complex upsert.
			// For simplicity and safety, we'll loop updates. For larger datasets, an RPC would be better.
			// Given the likely scale (dozens to hundreds), parallel promises are acceptable.
			const updatePromises = updates.map((update) =>
				locals.supabase
					.from('classes')
					.update({ instructor_id: update.instructor_id })
					.eq('id', update.id)
			);

			const results = await Promise.all(updatePromises);
			const errors = results.filter((r) => r.error);
			if (errors.length > 0) {
				console.error('Some auto-assignments failed:', errors);
				return fail(500, {
					message: `Attempted to assign ${assignedCount} classes, but some failed.`
				});
			}
		}

		return {
			message:
				assignedCount > 0
					? `Successfully auto-assigned ${assignedCount} classes.`
					: 'No classes matched the single-candidate criteria.'
		};
	}
};

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
            pref_room_id, rooms (room_name)
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
		.select('id, room_name, owner_college_id, is_general_use')
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
		const roomIdVal = formData.get('roomId');

		// Handle "No Preference" selection
		const pref_room_id = roomIdVal && Number(roomIdVal) > 0 ? Number(roomIdVal) : null;

		if (!classId) {
			return fail(400, { message: 'Invalid class ID.' });
		}

		const { error: updateError } = await locals.supabase
			.from('classes')
			.update({ pref_room_id })
			.eq('id', classId);

		if (updateError) {
			console.error('Error assigning room:', updateError);
			return fail(500, { message: 'Failed to assign room.' });
		}

		return { message: 'Room preference updated successfully.' };
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
	}
};

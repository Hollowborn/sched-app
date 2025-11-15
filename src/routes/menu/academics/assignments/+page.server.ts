import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

// This page is primarily for Deans, but Admins can oversee it.
const ALLOWED_ROLES = ['Admin', 'Dean'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const profile = locals.profile;
	if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to assign instructors.');
	}

	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';
	const college_filter_id = url.searchParams.get('college');

	// --- 1. Fetch Class Offerings for the selected term ---
	let classQuery = locals.supabase
		.from('classes')
		.select(
			`
            id,
            subjects!inner (id, subject_code, subject_name),
            instructors (id, name),
            blocks!inner (
                id,
                block_name,
                programs!inner (
                    college_id,
                    colleges (college_name)
                )
            )
        `
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	// Handle college filtering based on role and URL params
	if (profile.role === 'Dean' && profile.college_id) {
		// Deans should only see classes relevant to their college (via the block's program's college)
		classQuery = classQuery.eq('blocks.programs.college_id', profile.college_id);
	} else if (college_filter_id && profile.role === 'Admin') {
		// Admins can filter by any college (via the block's program's college)
		classQuery = classQuery.eq('blocks.programs.college_id', college_filter_id);
	}

	const { data: classes, error: classesError } = await classQuery;

	if (classesError) {
		console.error('Error fetching classes:', classesError);
		throw error(500, 'Failed to load class offerings.');
	}

	// --- 2. Fetch Instructors and Calculate Their Current Workload ---
	let instructorQuery = locals.supabase
		.from('instructors')
		.select('id, name, max_load, instructor_colleges!inner(college_id), instructor_subjects(subject_id)');

	// Deans should only be able to assign instructors from their own college
	if (profile.role === 'Dean' && profile.college_id) {
		instructorQuery = instructorQuery.eq('instructor_colleges.college_id', profile.college_id);
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
		profile.role === 'Admin'
			? await locals.supabase.from('colleges').select('id, college_name')
			: { data: [] };

	return {
		classes: classes || [],
		instructors: instructorsWithLoad || [],
		colleges: colleges || [],
		profile: locals.profile,
		filters: { academic_year, semester, college: college_filter_id }
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
	}
};
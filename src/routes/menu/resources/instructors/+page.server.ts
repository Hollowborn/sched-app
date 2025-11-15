import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES_VIEW = ['Admin', 'Dean', 'Registrar'];
const ALLOWED_ROLES_EDIT = ['Admin', 'Dean'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const profile = locals.profile;
	if (!profile || !ALLOWED_ROLES_VIEW.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to access instructors.');
	}

	const academic_year =
		url.searchParams.get('year') || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';

	// Base query for instructors, now joining with colleges via the link table
	let query = locals.supabase.from('instructors').select(`
		*,
		colleges ( id, college_name ),
		instructor_subjects ( subject_id )
	`);

	// If the user is a Dean, filter to only show instructors from their college
	if (profile.role === 'Dean' && profile.college_id) {
		query = query.eq('instructor_colleges.college_id', profile.college_id);
	}

	const { data: instructors, error: instructorsError } = await query;

	if (instructorsError) {
		console.error('Error fetching instructors:', instructorsError);
		throw error(500, 'Could not fetch instructors.');
	}

	// Fetch all class offerings for the selected semester to calculate workloads
	const { data: classes, error: classesError } = await locals.supabase
		.from('classes')
		.select('instructor_id, subjects(lecture_hours, lab_hours)')
		.eq('academic_year', academic_year)
		.eq('semester', semester)
		.not('instructor_id', 'is', null);

	if (classesError) {
		throw error(500, 'Could not fetch class data for workload calculation.');
	}

	// Calculate current load for each instructor
	const instructorsWithLoad = instructors.map((instructor) => {
		const assignedClasses = classes.filter((c) => c.instructor_id === instructor.id);
		const current_load = assignedClasses.reduce((acc, currentClass) => {
			const subject = currentClass.subjects;
			if (subject) {
				return acc + Number(subject.lecture_hours) + Number(subject.lab_hours);
			}
			return acc;
		}, 0);
		return { ...instructor, current_load };
	});

	// Fetch dependencies for forms
	const { data: colleges } = await locals.supabase.from('colleges').select('*');

	// Fetch all subjects and their college affiliations for the qualifications modal
	const { data: subjects } = await locals.supabase
		.from('subjects')
		.select('*, colleges(id, college_name)');


	return {
		instructors: instructorsWithLoad,
		colleges: colleges || [],
		subjects: subjects || [],
		profile: locals.profile,
		filters: { academic_year, semester }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createInstructor: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES_EDIT.includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission to create instructors.' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const email = formData.get('email')?.toString()?.trim();
		const max_load = Number(formData.get('max_load'));
		let college_ids = formData.getAll('college_ids').map(Number);

		// --- Authorization ---
		if (profile.role === 'Dean') {
			// Deans can only assign instructors to their own college.
			if (!profile.college_id || !college_ids.includes(profile.college_id)) {
				return fail(403, { message: 'Deans can only create instructors for their own college.' });
			}
			// Enforce only their college is assigned
			college_ids = [profile.college_id];
		}

		if (!name || !max_load || college_ids.length === 0) {
			return fail(400, { message: 'Name, Max Load, and at least one College are required.' });
		}

		// Step 1: Insert the instructor
		const { data: newInstructor, error: insertError } = await locals.supabase
			.from('instructors')
			.insert({ name, email, max_load })
			.select('id')
			.single();

		if (insertError) {
			console.error('Create instructor error:', insertError);
			return fail(500, { message: 'Failed to create instructor.' });
		}

		// Step 2: Link to colleges
		const collegeLinks = college_ids.map((college_id) => ({
			instructor_id: newInstructor.id,
			college_id
		}));
		const { error: linkError } = await locals.supabase.from('instructor_colleges').insert(collegeLinks);

		if (linkError) {
			console.error('Create instructor link error:', linkError);
			// Cleanup orphaned instructor
			await locals.supabase.from('instructors').delete().eq('id', newInstructor.id);
			return fail(500, { message: 'Failed to link instructor to colleges.' });
		}

		return { status: 201, message: 'Instructor created successfully.' };
	},

	updateInstructor: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES_EDIT.includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission to update instructors.' });
		}

		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const name = formData.get('name')?.toString()?.trim();
		const email = formData.get('email')?.toString()?.trim();
		const max_load = Number(formData.get('max_load'));
		const min_load = Number(formData.get('min_load'));
		const college_ids = formData.getAll('college_ids').map(Number);

		if (!id || !name || !max_load || !min_load) {
			return fail(400, { message: 'All fields except colleges are required.' });
		}

		// --- Authorization ---
		if (profile.role === 'Dean') {
			// Deans can only edit instructors in their college.
			const { count } = await locals.supabase
				.from('instructor_colleges')
				.select('*', { count: 'exact', head: true })
				.eq('instructor_id', id)
				.eq('college_id', profile.college_id);

			if (count === 0) {
				return fail(403, { message: "Forbidden: You can't edit an instructor outside your college." });
			}
		}

		// Step 1: Update instructor details
		const { error: updateError } = await locals.supabase
			.from('instructors')
			.update({ name, email, max_load, min_load })
			.eq('id', id);

		if (updateError) {
			console.error('Update instructor error:', updateError);
			return fail(500, { message: 'Failed to update instructor details.' });
		}

		// Step 2: Sync college affiliations (Admin only)
		if (profile.role === 'Admin') {
			if (college_ids.length === 0) {
				return fail(400, { message: 'An instructor must belong to at least one college.' });
			}

			// Delete old links
			await locals.supabase.from('instructor_colleges').delete().eq('instructor_id', id);

			// Create new links
			const collegeLinks = college_ids.map((college_id) => ({ instructor_id: id, college_id }));
			const { error: linkError } = await locals.supabase.from('instructor_colleges').insert(collegeLinks);

			if (linkError) {
				console.error('Update instructor link error:', linkError);
				return fail(500, { message: 'Failed to update college affiliations.' });
			}
		}

		return { status: 200, message: 'Instructor updated successfully.' };
	},

	updateQualifications: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES_EDIT.includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission to update qualifications.' });
		}

		const formData = await request.formData();
		const instructor_id = Number(formData.get('instructor_id'));
		const subject_ids = formData.getAll('subject_ids').map(Number);

		if (!instructor_id) {
			return fail(400, { message: 'Invalid instructor ID.' });
		}

		// --- Authorization ---
		if (profile.role === 'Dean') {
			// Deans can only edit instructors in their college.
			const { count } = await locals.supabase
				.from('instructor_colleges')
				.select('*', { count: 'exact', head: true })
				.eq('instructor_id', instructor_id)
				.eq('college_id', profile.college_id);

			if (count === 0) {
				return fail(403, { message: "Forbidden: You can't edit an instructor outside your college." });
			}
		}

		// Sync the links: delete all, then re-insert
		await locals.supabase.from('instructor_subjects').delete().eq('instructor_id', instructor_id);

		if (subject_ids.length > 0) {
			const newLinks = subject_ids.map(subject_id => ({ instructor_id, subject_id }));
			const { error: insertError } = await locals.supabase.from('instructor_subjects').insert(newLinks);
			if (insertError) {
				console.error('Update qualifications error:', insertError);
				return fail(500, { message: 'Failed to save qualifications.' });
			}
		}

		return { status: 200, message: 'Qualifications updated successfully.' };
	},

	deleteInstructor: async ({ request, locals }) => {
		// Only Admins can delete instructors to prevent accidental deletion by Deans
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: Only Admins can delete instructors.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, { message: 'Invalid instructor ID.' });
		}

		// Deleting the instructor will cascade to instructor_colleges and instructor_subjects
		const { error: deleteError } = await locals.supabase.from('instructors').delete().eq('id', id);

		if (deleteError) {
			console.error('Delete instructor error:', deleteError);
			return fail(500, {
				message: 'Failed to delete instructor. They may be assigned to a class.'
			});
		}
		return { status: 200, message: 'Instructor deleted successfully.' };
	}
};
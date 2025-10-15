import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access instructors.');
	}

	const academic_year =
		url.searchParams.get('year') || `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
	const semester = url.searchParams.get('semester') || '1st Semester';

	// Fetch base instructor data
	const { data: instructors, error: instructorsError } = await locals.supabase
		.from('instructors')
		.select('*, colleges(college_name)');

	if (instructorsError) {
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
	const { data: subjects } = await locals.supabase
		.from('subjects')
		.select('id, subject_code, subject_name');

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
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to create instructors.' });
		}
		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const email = formData.get('email')?.toString()?.trim();
		const college_id = Number(formData.get('college_id'));
		const max_load = Number(formData.get('max_load'));

		if (!name || !college_id || !max_load) {
			return fail(400, { message: 'Name and College are required.' });
		}

		const { error: insertError } = await locals.supabase
			.from('instructors')
			.insert({ name, email, college_id, max_load });

		if (insertError) {
			console.error('Create instructor error:', insertError);
			return fail(500, { message: 'Failed to create instructor.' });
		}
		return { status: 201, message: 'Instructor created successfully.', action: 'createInstructor' };
	},

	updateInstructor: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to update instructors.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));
		const name = formData.get('name')?.toString()?.trim();
		const email = formData.get('email')?.toString()?.trim();
		const college_id = Number(formData.get('college_id'));
		const max_load = Number(formData.get('max_load'));
		const min_load = Number(formData.get('min_load'));

		if (!id || !name || !college_id || !max_load || !min_load) {
			return fail(400, { message: 'All fields except email are required.' });
		}

		const { error: updateError } = await locals.supabase
			.from('instructors')
			.update({ name, email, college_id, max_load, min_load })
			.eq('id', id);

		if (updateError) {
			console.error('Update instructor error:', updateError);
			return fail(500, { message: 'Failed to update instructor.' });
		}
		return { status: 200, message: 'Instructor updated successfully.', action: 'updateInstructor' };
	},

	deleteInstructor: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to delete instructors.' });
		}
		const formData = await request.formData();
		const id = Number(formData.get('id'));

		if (!id) {
			return fail(400, { message: 'Invalid instructor ID.' });
		}

		const { error: deleteError } = await locals.supabase.from('instructors').delete().eq('id', id);

		if (deleteError) {
			console.error('Delete instructor error:', deleteError);
			return fail(500, {
				message: 'Failed to delete instructor. They may be assigned to a class.'
			});
		}
		return { status: 200, message: 'Instructor deleted successfully.', action: 'deleteInstructor' };
	}
};

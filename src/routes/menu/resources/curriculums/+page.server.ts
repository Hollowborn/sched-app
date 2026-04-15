import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar', 'Chairperson'];

export const load: PageServerLoad = async ({ locals }) => {
	const profile = locals.profile;
	if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to access curriculums.');
	}

	// Fetch curriculums, join with programs to display program name
	let curriculumsQuery = locals.supabase
		.from('curriculums')
		.select('*, programs(id, program_name, college_id)')
        .order('revision_year', { ascending: false });

	if (profile.role === 'Dean' && profile.college_id) {
		// Need explicit inner join syntax to filter correctly
        curriculumsQuery = locals.supabase
            .from('curriculums')
            .select('*, programs!inner(id, program_name, college_id)')
            .order('revision_year', { ascending: false })
            .eq('programs.college_id', profile.college_id);
	} else if (profile.role === 'Chairperson' && profile.program_id) {
		curriculumsQuery = curriculumsQuery.eq('program_id', profile.program_id);
	}

	const { data: curriculums, error: curriculumsError } = await curriculumsQuery;

	if (curriculumsError) {
		console.error('Error fetching curriculums:', curriculumsError);
		throw error(500, 'Could not fetch curriculums.');
	}

	// Fetch curriculum_subjects
	const { data: curriculumSubjects, error: subjectsError } = await locals.supabase
		.from('curriculum_subjects')
		.select('*, subjects(subject_code, subject_name, lecture_hours, lab_hours)');

	if (subjectsError) {
		console.error('Error fetching curriculum subjects:', subjectsError);
		throw error(500, 'Could not fetch curriculum subjects.');
	}

	// Fetch dependencies for creating curriculums
	let programsQuery = locals.supabase.from('programs').select('*').order('program_name');
	if (profile.role === 'Dean' && profile.college_id) {
		programsQuery = programsQuery.eq('college_id', profile.college_id);
	} else if (profile.role === 'Chairperson' && profile.program_id) {
		programsQuery = programsQuery.eq('id', profile.program_id);
	}
	const { data: programs } = await programsQuery;
    
    // Fetch default catalog subjects with their associated colleges
    const { data: defaultSubjects } = await locals.supabase
        .from('subjects')
        .select('*, subject_colleges(college_id)')
        .order('subject_code');

	return {
		curriculums: curriculums || [],
		curriculumSubjects: curriculumSubjects || [],
		programs: programs || [],
		subjects: defaultSubjects || [],
		profile: locals.profile
	};
};

export const actions: Actions = {
	createCurriculum: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const program_id = Number(formData.get('program_id'));
		const revision_year = formData.get('revision_year')?.toString()?.trim();
		const year_level = Number(formData.get('year_level'));
		const semester = formData.get('semester')?.toString()?.trim();

		if (!program_id || !revision_year || !year_level || !semester) {
			return fail(400, { message: 'All fields are required.' });
		}

		const { error: insertError } = await locals.supabase
			.from('curriculums')
			.insert({ program_id, revision_year, year_level, semester });

		if (insertError) {
			console.error('Create curriculum error:', insertError);
            if (insertError.code === '23505') {
                 return fail(409, { message: 'A curriculum for this exact program, revision, year, and semester already exists.' });
            }
			return fail(500, { message: 'Failed to create curriculum.' });
		}

		return { status: 201, message: 'Curriculum created successfully.' };
	},

    updateSubjects: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const curriculum_id = Number(formData.get('curriculum_id'));
		const subject_ids = formData.getAll('subject_ids').map(Number);
        const major_subject_ids = formData.getAll('major_subject_ids').map(Number);
        
        await locals.supabase.from('curriculum_subjects').delete().eq('curriculum_id', curriculum_id);

		if (subject_ids.length > 0) {
			const newLinks = subject_ids.map((subject_id) => ({
                curriculum_id,
                subject_id,
                is_major: major_subject_ids.includes(subject_id)
            }));
			const { error: insertError } = await locals.supabase
				.from('curriculum_subjects')
				.insert(newLinks);
			if (insertError) {
				console.error('Update subjects error:', insertError);
				return fail(500, { message: 'Failed to save subjects.' });
			}
		}

		return { status: 200, message: 'Curriculum subjects updated successfully.' };
	},

    deleteCurriculum: async ({ request, locals }) => {
        // ...
		const formData = await request.formData();
		const id = Number(formData.get('id'));

        if (!id) return fail(400, { message: 'Invalid ID' });

		const { error: deleteError } = await locals.supabase.from('curriculums').delete().eq('id', id);

		if (deleteError) {
			return fail(500, { message: 'Failed to delete curriculum.' });
		}
		return { status: 200, message: 'Curriculum deleted successfully.' };
    }
};

import { error } from '@sveltejs/kit';
import type { PageServerLoad } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

export const load: PageServerLoad = async ({ locals }) => {
	const profile = locals.profile;

	if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to view this page.');
	}

	const academic_year = `${new Date().getFullYear()}-${new Date().getFullYear() + 1}`;
	const semester = '1st Semester'; // Default to 1st sem for dashboard view

	// --- Define queries ---
	let stats = { instructorCount: 0, roomCount: 0, subjectCount: 0, programCount: 0 };
	let workloadData: { name: string; value: number }[] = [];
	let scheduleStatusData: { name: string; value: number }[] = [];
	let actionItems: any[] = [];

	// Base query for schedule status & action items
	let scheduleQuery = locals.supabase
		.from('classes')
		.select(
			'id, instructor_id, subjects(subject_code, subject_name), blocks!inner(block_name, programs!inner(college_id))'
		)
		.eq('academic_year', academic_year)
		.eq('semester', semester);

	if (profile.role === 'Admin' || profile.role === 'Registrar') {
		const [
			{ count: instructor_count },
			{ count: room_count },
			{ count: subject_count },
			{ count: program_count },
			{ data: instructors },
			{ data: assigned_classes },
			{ data: schedule_classes }
		] = await Promise.all([
			locals.supabase.from('instructors').select('*', { count: 'exact', head: true }),
			locals.supabase.from('rooms').select('*', { count: 'exact', head: true }),
			locals.supabase.from('subjects').select('*', { count: 'exact', head: true }),
			locals.supabase.from('programs').select('*', { count: 'exact', head: true }),
			locals.supabase.from('instructors').select('id, min_load, max_load'),
			locals.supabase
				.from('classes')
				.select('instructor_id, subjects(lecture_hours, lab_hours)')
				.eq('academic_year', academic_year)
				.eq('semester', semester)
				.not('instructor_id', 'is', null),
			scheduleQuery
		]);

		stats = {
			instructorCount: instructor_count ?? 0,
			roomCount: room_count ?? 0,
			subjectCount: subject_count ?? 0,
			programCount: program_count ?? 0
		};

		// Process workload
		const workloadCounts = { under: 0, optimal: 0, over: 0 };
		instructors?.forEach((instructor) => {
			const current_load =
				assigned_classes
					?.filter((c) => c.instructor_id === instructor.id)
					.reduce((acc, currentClass) => {
						const subject = currentClass.subjects;
						return subject ? acc + Number(subject.lecture_hours) + Number(subject.lab_hours) : acc;
					}, 0) || 0;
			if (current_load < instructor.min_load) workloadCounts.under++;
			else if (current_load > instructor.max_load) workloadCounts.over++;
			else workloadCounts.optimal++;
		});
		workloadData = [
			{ name: 'Under-loaded', value: workloadCounts.under },
			{ name: 'Optimal', value: workloadCounts.optimal },
			{ name: 'Overloaded', value: workloadCounts.over }
		];

		// Process schedule status & action items
		actionItems = schedule_classes?.filter((c) => c.instructor_id === null) || [];
		const unassigned = actionItems.length;
		const assigned = (schedule_classes?.length || 0) - unassigned;
		scheduleStatusData = [
			{ name: 'Assigned', value: assigned },
			{ name: 'Unassigned', value: unassigned }
		];
	} else if (profile.role === 'Dean' && profile.college_id) {
		const collegeId = profile.college_id;

		const deanInstructorIdsQuery = locals.supabase
			.from('instructor_colleges')
			.select('instructor_id')
			.eq('college_id', collegeId);

		const [{ data: deanInstructorIds }] = await Promise.all([deanInstructorIdsQuery]);
		const instructorIds = deanInstructorIds?.map((ic) => ic.instructor_id) || [];

		scheduleQuery = scheduleQuery.eq('blocks.programs.college_id', collegeId);

		const [
			{ count: instructor_count },
			{ count: room_count },
			{ count: subject_count },
			{ count: program_count },
			{ data: instructors },
			{ data: assigned_classes },
			{ data: schedule_classes }
		] = await Promise.all([
			locals.supabase.from('instructor_colleges').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
			locals.supabase.from('rooms').select('*', { count: 'exact', head: true }).eq('owner_college_id', collegeId),
			locals.supabase.from('subject_colleges').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
			locals.supabase.from('programs').select('*', { count: 'exact', head: true }).eq('college_id', collegeId),
			locals.supabase.from('instructors').select('id, min_load, max_load').in('id', instructorIds),
			locals.supabase.from('classes').select('instructor_id, subjects(lecture_hours, lab_hours)').eq('academic_year', academic_year).eq('semester', semester).not('instructor_id', 'is', null),
			scheduleQuery
		]);

		stats = {
			instructorCount: instructor_count ?? 0,
			roomCount: room_count ?? 0,
			subjectCount: subject_count ?? 0,
			programCount: program_count ?? 0
		};

		// Process workload
		const workloadCounts = { under: 0, optimal: 0, over: 0 };
		instructors?.forEach((instructor) => {
			const current_load =
				assigned_classes
					?.filter((c) => c.instructor_id === instructor.id)
					.reduce((acc, currentClass) => {
						const subject = currentClass.subjects;
						return subject ? acc + Number(subject.lecture_hours) + Number(subject.lab_hours) : acc;
					}, 0) || 0;
			if (current_load < instructor.min_load) workloadCounts.under++;
			else if (current_load > instructor.max_load) workloadCounts.over++;
			else workloadCounts.optimal++;
		});
		workloadData = [
			{ name: 'Under-loaded', value: workloadCounts.under },
			{ name: 'Optimal', value: workloadCounts.optimal },
			{ name: 'Overloaded', value: workloadCounts.over }
		];

		// Process schedule status & action items
		actionItems = schedule_classes?.filter((c) => c.instructor_id === null) || [];
		const unassigned = actionItems.length;
		const assigned = (schedule_classes?.length || 0) - unassigned;
		scheduleStatusData = [
			{ name: 'Assigned', value: assigned },
			{ name: 'Unassigned', value: unassigned }
		];
	}

	return {
		profile,
		stats,
		workloadData,
		scheduleStatusData,
		actionItems
	};
};



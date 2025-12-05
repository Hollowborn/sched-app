import { fail, error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { solveMemetic } from '$lib/server/algorithms/memetic';
import { solveCP } from '$lib/server/algorithms/cp';
import { solveSmartCP } from '$lib/server/algorithms/smart_cp';
import type { SolverResult } from '$lib/server/algorithms/types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar', 'Chairperson'];

// --- Helper function to format time (HH:MM:SS) ---
function formatTime(time: string): string {
	const [hours, minutes = '00'] = time.split(':');
	return `${hours.padStart(2, '0')}:${minutes}:00`;
}

// --- Helper to calculate end time string ---
function calculateEndTime(startTime: string, durationHours: number): string {
	const [hour, minute] = startTime.split(':').map(Number);
	const totalMinutes = hour * 60 + minute + durationHours * 60;
	const endHour = Math.floor(totalMinutes / 60);
	const endMinute = totalMinutes % 60;
	return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`; // Returns HH:MM
}

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals, url }) => {
	const profile = locals.profile;
	if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const academic_year = url.searchParams.get('academic_year');
	const semester = url.searchParams.get('semester');
	const program_id_param = url.searchParams.get('program_id');
	const chairperson_program_id = profile.role === 'Chairperson' ? profile.program_id : null;

	// --- Role-based Program Fetching ---
	let programsQuery = locals.supabase.from('programs').select(`
		id,
		program_name,
		college_id,
		colleges ( college_name )
	`);

	if (profile.role === 'Chairperson') {
		if (!profile.program_id) {
			throw error(403, 'Your account is not associated with a program.');
		}
		programsQuery = programsQuery.eq('id', profile.program_id);
	} else if (profile.role === 'Dean') {
		if (!profile.college_id) {
			throw error(403, 'Your account is not associated with a college.');
		}
		programsQuery = programsQuery.eq('college_id', profile.college_id);
	}
	// Admin gets all programs, so no additional filter needed.

	const { data: programs, error: programsError } = await programsQuery;
	if (programsError) {
		throw error(500, 'Could not fetch programs.');
	}

	// --- Dynamic Health Check Stats ---
	let healthStats = null;
	const program_ids_param = url.searchParams.get('program_ids');
	
	if (program_ids_param && academic_year && semester) {
		const programIds = program_ids_param.split(',').map(Number);

		const { data: blockIdsData } = await locals.supabase
			.from('blocks')
			.select('id')
			.in('program_id', programIds);
		const blockIds = blockIdsData?.map((b) => b.id) || [];

		if (blockIds.length > 0) {
			const { data: classIdsData } = await locals.supabase
				.from('classes')
				.select('id, instructor_id')
				.in('block_id', blockIds)
				.eq('academic_year', academic_year)
				.eq('semester', semester);

			const totalClasses = classIdsData?.length || 0;
			const unassignedClasses = (classIdsData || []).filter((c) => c.instructor_id === null).length;

			const { data: assignedBlocksData, error: assignedBlocksError } = await locals.supabase
				.from('classes')
				.select('block_id')
				.in('block_id', blockIds)
				.eq('academic_year', academic_year)
				.eq('semester', semester);

			if (assignedBlocksError) throw error(500, 'Could not fetch assigned blocks data.');

			// Get the count of unique block_ids
			const assignedBlockCount = new Set((assignedBlocksData || []).map((c) => c.block_id)).size;

			const totalBlocks = blockIds.length;
			const emptyBlocks = totalBlocks - assignedBlockCount;

			healthStats = { totalClasses, unassignedClasses, totalBlocks, emptyBlocks };
		}
	}

	// --- Fetch other necessary data ---
	const { data: rooms } = await locals.supabase
		.from('rooms')
		.select('id, room_name, building, type, capacity, owner_college_id, is_general_use');

	return {
		programs: programs || [],
		allRooms: rooms || [],
		profile,
		healthStats
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	// --- The Main Generator Action ---
	generateSchedule: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission.' });
		}

		const formData = await request.formData();

		// 1. Get Context & Inputs
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString() as
			| '1st Semester'
			| '2nd Semester'
			| 'Summer';
		const program_ids = formData.getAll('program_ids').map(Number);
		const room_ids = formData.getAll('room_ids').map(Number);
		const excluded_days = formData.getAll('excluded_days').map(String);

		// New inputs from the refactored UI
		const scheduleStartTime = formData.get('scheduleStartTime')?.toString() || '07:30';
		const scheduleEndTime = formData.get('scheduleEndTime')?.toString() || '17:30';
		const breakTime = formData.get('breakTime')?.toString() || 'none'; // e.g., '12:00-13:00'
		const algorithm = formData.get('algorithm')?.toString() || 'memetic'; // 'memetic' or 'cp'
		const custom_name = formData.get('custom_name')?.toString();

		// 2. Get Constraints
		const constraints = {
			enforceCapacity: !!formData.get('enforceCapacity'),
			roomTypeConstraint: (formData.get('roomTypeConstraint')?.toString() || 'strict') as
				| 'strict'
				| 'soft'
				| 'none',
			enforceInstructor: !!formData.get('enforceInstructor'),
			enforceBlock: !!formData.get('enforceBlock'),
			excludedDays: excluded_days,
			breakTime: breakTime
		};

		if (!academic_year || !semester || program_ids.length === 0 || room_ids.length === 0) {
			return fail(400, { message: 'Academic Term, Programs, and Rooms must be selected.' });
		}

		// 3. Create a new Timetable entry for this generation
		const { data: programsData, error: programsError } = await locals.supabase
			.from('programs')
			.select('id, program_name, college_id')
			.in('id', program_ids);

		if (programsError || !programsData) {
			return fail(500, { message: 'Failed to fetch program details.' });
		}

		let timetableName = custom_name?.trim();
		if (!timetableName) {
			if (programsData.length === 1) {
				timetableName = `TT-${programsData[0].program_name}-${academic_year}-${semester}`;
			} else {
				timetableName = `Unified TT (${programsData.length} Programs) - ${academic_year}-${semester}`;
			}
		}

		// Determine college_id and program_id for the timetable entry
		const uniqueCollegeIds = new Set(programsData.map((p) => p.college_id));
		const college_id = uniqueCollegeIds.size === 1 ? [...uniqueCollegeIds][0] : null;
		const program_id = programsData.length === 1 ? programsData[0].id : null;

		// Initial metadata for the timetable entry
		const initialMetadata = {
			generation_params: {
				academic_year,
				semester,
				program_ids, // Store array of IDs
				room_ids,
				scheduleStartTime,
				scheduleEndTime,
				breakTime,
				algorithm,
				constraints
			},
			status: 'Generating'
		};

		const { data: newTimetable, error: insertError } = await locals.supabase
			.from('timetables')
			.insert({
				name: timetableName,
				academic_year,
				semester,
				college_id,
				program_id,
				created_by: locals.user?.id,
				status: 'draft',
				metadata: initialMetadata // Save initial generation parameters
			})
			.select('id')
			.single();

		if (insertError) {
			if (insertError.code === '23505') {
				// 23505 is the unique constraint violation code
				return fail(409, {
					message: `A timetable named "${timetableName}" already exists. Please delete the old one first.`
				});
			}
			return fail(500, { message: 'Failed to create a new timetable entry.' });
		}
		const timetable_id = newTimetable.id;
		console.log('Generating timetable with ID:', timetable_id);
		// --- Start Solver Logic ---
		try {
			// 4. Fetch all data needed for the solver
			const [{ data: classesData, error: classesError }, { data: roomsData, error: roomsError }] =
				await Promise.all([
					locals.supabase
						.from('classes')
						.select(
							'id, split_lecture, lecture_days, instructor_id, block_id, room_preferences, subjects(subject_code, lecture_hours, lab_hours), blocks!inner(program_id, estimated_students), instructors(id, name)'
						)
						.eq('academic_year', academic_year)
						.eq('semester', semester)
						.in('blocks.program_id', program_ids),
					locals.supabase.from('rooms').select('*').in('id', room_ids)
				]);

			if (classesError) throw error(500, `Classes Error: ${JSON.stringify(classesError)}`);
			if (roomsError) throw error(500, `Rooms Error: ${JSON.stringify(roomsError)}`);

			if (!classesData || classesData.length === 0) {
				// Update metadata to failed
				await locals.supabase
					.from('timetables')
					.update({
						metadata: { ...initialMetadata, status: 'Failed', error: 'No class offerings found.' },
						status: 'draft'
					})
					.eq('id', timetable_id);

				return fail(400, {
					message:
						'No class offerings found for the selected program and term. Cannot generate schedule.'
				});
			}

			// 5. Define Domain (Playable Slots) based on new constraints
			const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
			const SLOT_DURATION_HOURS = 0.5;

			function generateTimeslots(start: string, end: string, breakT: string) {
				const slots = [];
				let currentTime = new Date(`1970-01-01T${start}:00`);
				const endTime = new Date(`1970-01-01T${end}:00`);
				const breakStart =
					breakT !== 'none' ? new Date(`1970-01-01T${breakT.split('-')[0]}:00`) : null;
				const breakEnd =
					breakT !== 'none' ? new Date(`1970-01-01T${breakT.split('-')[1]}:00`) : null;

				while (currentTime < endTime) {
					const isDuringBreak =
						breakStart && breakEnd && currentTime >= breakStart && currentTime < breakEnd;
					if (!isDuringBreak) {
						slots.push(currentTime.toTimeString().substring(0, 5));
					}
					currentTime.setMinutes(currentTime.getMinutes() + 30); // Increment by 30 mins for more granular start times
				}
				return slots;
			}

			const TIMESLOTS = generateTimeslots(scheduleStartTime, scheduleEndTime, breakTime);

			// 6. Create the "Job List" (Needed for stats and consistent task counting)
			const tasksToSchedule: any[] = [];
			(classesData || []).forEach((cls) => {
				// Handle split lectures
				if (cls.split_lecture && cls.subjects.lecture_hours > 0) {
					const splitHours = Number(cls.subjects.lecture_hours) / 2;
					tasksToSchedule.push({
						class: cls,
						type: 'Lecture',
						hours: splitHours,
						slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
						splitGroup: `split_${cls.id}_1`
					});
					tasksToSchedule.push({
						class: cls,
						type: 'Lecture',
						hours: splitHours,
						slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
						splitGroup: `split_${cls.id}_2`
					});
				} else if (cls.subjects.lecture_hours > 0) {
					tasksToSchedule.push({
						class: cls,
						type: 'Lecture',
						hours: Number(cls.subjects.lecture_hours),
						slotsNeeded: Math.ceil(Number(cls.subjects.lecture_hours) / SLOT_DURATION_HOURS)
					});
				}

				if (cls.subjects.lab_hours > 0) {
					tasksToSchedule.push({
						class: cls,
						type: 'Lab',
						hours: Number(cls.subjects.lab_hours),
						slotsNeeded: Math.ceil(Number(cls.subjects.lab_hours) / SLOT_DURATION_HOURS)
					});
				}
			});

			// 7. Run the Solver
			const startTime = performance.now();
			let result: SolverResult;

			// Map classes to include college_id for the solver
			const mappedClasses = (classesData || []).map((cls: any) => ({
				...cls,
				college_id: cls.blocks?.programs?.college_id
			}));

			if (algorithm === 'cp') {
				result = solveCP(mappedClasses, roomsData, TIMESLOTS, constraints);
			} else if (algorithm === 'smart_cp') {
				result = solveSmartCP(mappedClasses, roomsData, TIMESLOTS, constraints);
			} else {
				result = solveMemetic(mappedClasses, roomsData, TIMESLOTS, constraints);
			}

			const { scheduledEntries, failedClasses } = result;

			// 7. Insert successful entries
			if (scheduledEntries.length > 0) {
				const entriesToInsert = scheduledEntries.map((entry) => ({
					...entry,
					timetable_id
				}));

				await locals.supabase.from('schedules').delete().eq('timetable_id', timetable_id);
				const { error: insertError } = await locals.supabase
					.from('schedules')
					.insert(entriesToInsert);

				if (insertError) {
					throw new Error(`Failed to save schedule: ${insertError.message}`);
				}
			}

			// 8. Construct Final Report & Update Metadata
			const timeTaken = (performance.now() - startTime).toFixed(2);
			const timeTakenSec: string = (+timeTaken / 1000).toFixed(2) + 's';
			const successRate = Math.round(
				((tasksToSchedule.length - failedClasses.length) / tasksToSchedule.length) * 100
			);

			const finalMetadata = {
				...initialMetadata,
				status: 'Complete',
				timeTakenSec,
				successRate,
				totalClasses: tasksToSchedule.length,
				scheduledCount: tasksToSchedule.length - failedClasses.length,
				roomsUsed: new Set(scheduledEntries.map((e) => e.room_id)).size,
				failedClasses,
				algorithm
			};

			await locals.supabase
				.from('timetables')
				.update({
					metadata: finalMetadata,
					status: 'draft' // Ensure it's Draft (or whatever status implies done)
				})
				.eq('id', timetable_id);
			console.log('Timetable generation complete:', finalMetadata);
			// 10. Return summary
			const message =
				failedClasses.length === 0
					? 'All classes were successfully scheduled.'
					: `Generation complete with some issues. ${failedClasses.length} classes failed to schedule.`;

			return {
				success: true,
				message,
				failedClasses,
				generatedTimetableId: timetable_id,
				report: finalMetadata // Return the full metadata as the report
			};
		} catch (e) {
			console.error('Generation Error:', e);

			// Attempt to update metadata with error
			await locals.supabase
				.from('timetables')
				.update({
					metadata: {
						...initialMetadata,
						status: 'Failed',
						error: e instanceof Error ? e.message : 'Unknown error occurred during generation.'
					},
					status: 'draft'
				})
				.eq('id', timetable_id);

			return fail(500, {
				message: `Generation failed: ${e instanceof Error ? e.message : 'Unknown error'}`
			});
		}
	}
};

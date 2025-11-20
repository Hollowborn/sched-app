import { fail, error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

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

	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = (url.searchParams.get('semester') || '1st Semester') as
		| '1st Semester'
		| '2nd Semester'
		| 'Summer';

	let programsToFetch: { id: number; program_name: string }[] = [];

	// --- Role-based Program Fetching ---
	if (profile.role === 'Chairperson') {
		if (!profile.program_id) {
			throw error(403, 'Your account is not associated with a program.');
		}
		const { data: program, error: programError } = await locals.supabase
			.from('programs')
			.select('id, program_name')
			.eq('id', profile.program_id)
			.single();
		if (programError || !program) throw error(404, 'Associated program not found.');
		programsToFetch = [program];
	} else if (profile.role === 'Dean') {
		if (!profile.college_id) {
			throw error(403, 'Your account is not associated with a college.');
		}
		const { data: collegePrograms, error: programsError } = await locals.supabase
			.from('programs')
			.select('id, program_name')
			.eq('college_id', profile.college_id);
		if (programsError) throw error(500, 'Could not fetch programs for your college.');
		programsToFetch = collegePrograms || [];
	} else if (profile.role === 'Admin') {
		// For Admins, let them select a college first in the UI
		const college_filter_id = url.searchParams.get('college');
		if (college_filter_id) {
			const { data: collegePrograms, error: programsError } = await locals.supabase
				.from('programs')
				.select('id, program_name')
				.eq('college_id', college_filter_id);
			if (programsError) throw error(500, 'Could not fetch programs for the selected college.');
			programsToFetch = collegePrograms || [];
		}
	}

	// --- Fetch Stats for each Program ---
	const programStats = await Promise.all(
		programsToFetch.map(async (program) => {
			// Get all block IDs for the current program
			const { data: blockIdsData } = await locals.supabase
				.from('blocks')
				.select('id')
				.eq('program_id', program.id);
			const blockIds = blockIdsData?.map((b) => b.id) || [];

			// Get all class IDs for those blocks in the current term
			const { data: classIdsData } = await locals.supabase
				.from('classes')
				.select('id, instructor_id')
				.in('block_id', blockIds)
				.eq('academic_year', academic_year)
				.eq('semester', semester);
			const classIds = classIdsData?.map((c) => c.id) || [];

			const totalClasses = classIds.length;
			const unassignedClasses = (classIdsData || []).filter((c) => c.instructor_id === null).length;

			// Find blocks that do not appear in any class offering for the term
			const { count: assignedBlockCount } = await locals.supabase
				.from('classes')
				.select('block_id', { count: 'exact', head: true })
				.in('block_id', blockIds)
				.eq('academic_year', academic_year)
				.eq('semester', semester);

			const totalBlocks = blockIds.length;
			const emptyBlocks = totalBlocks - (assignedBlockCount || 0);

			return {
				...program,
				stats: {
					totalClasses,
					unassignedClasses,
					totalBlocks,
					emptyBlocks
				}
			};
		})
	);

	// Fetch other necessary data for filters and modals
	const { data: colleges } = await locals.supabase.from('colleges').select('*');
	const { data: rooms } = await locals.supabase
		.from('rooms')
		.select('id, room_name, building, type, capacity');

	return {
		programStats: programStats || [],
		colleges: colleges || [],
		allRooms: rooms || [],
		profile,
		filters: { academic_year, semester, college: url.searchParams.get('college') }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createTimetable: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString() as
			| '1st Semester'
			| '2nd Semester'
			| 'Summer';
		const program_id = Number(formData.get('program_id')) || null;
		const college_id = Number(formData.get('college_id')) || profile.college_id; // Use form's college_id or Dean's

		if (!name || !academic_year || !semester) {
			return fail(400, { createError: 'Name, Academic Year, and Semester are required.' });
		}

		const { data: newTimetable, error: insertError } = await locals.supabase
			.from('timetables')
			.insert({
				name,
				academic_year,
				semester,
				college_id,
				program_id,
				created_by: locals.user?.id,
				status: 'draft'
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error creating timetable:', insertError);
			if (insertError.code === '23505') {
				return fail(409, {
					createError: 'A timetable with this name already exists for this term/program.'
				});
			}
			return fail(500, { createError: 'Could not create timetable.' });
		}

		return { success: true, message: 'Timetable created successfully.' };
	},

	// --- The Main Generator Action ---
	generateSchedule: async ({ request, locals }) => {
		const profile = locals.profile;
		if (!profile || !ALLOWED_ROLES.includes(profile.role)) {
			return fail(403, { message: 'Forbidden: You do not have permission.' });
		}

		const formData = await request.formData();

		// 1. Get Context & Inputs
		const timetable_id = Number(formData.get('timetable_id'));
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString() as
			| '1st Semester'
			| '2nd Semester'
			| 'Summer';
		const program_id = Number(formData.get('program_id'));
		const room_ids = formData.getAll('room_ids').map(Number);
		const scheduleStartTime = formData.get('scheduleStartTime')?.toString() || '07:30';

		// 2. Get Constraints
		const constraints = {
			enforceCapacity: !!formData.get('enforceCapacity'),
			enforceRoomType: !!formData.get('enforceRoomType'),
			enforceInstructor: !!formData.get('enforceInstructor'),
			enforceBlock: !!formData.get('enforceBlock')
		};

		if (!timetable_id || !program_id || room_ids.length === 0) {
			return fail(400, { message: 'Timetable, Program, and Rooms must be selected.' });
		}

		// --- Start Solver Logic ---
		// 3. Fetch all data needed for the solver
		const [{ data: classesData, error: classesError }, { data: roomsData, error: roomsError }] =
			await Promise.all([
				locals.supabase
					.from('classes')
					.select('*, subjects!inner(*), blocks!inner(*), instructors(id, name)')
					.eq('academic_year', academic_year)
					.eq('semester', semester)
					.eq('blocks.program_id', program_id),
				locals.supabase.from('rooms').select('*').in('id', room_ids)
			]);

		if (classesError || roomsError) throw error(500, 'Failed to fetch solver data.');

		// 4. Define Domain (Playable Slots)
		const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
		const SLOT_DURATION_HOURS = 1.5;

		function generateTimeslots(start: string, end: string, durationMinutes: number) {
			const slots = [];
			let currentTime = new Date(`1970-01-01T${start}:00`);
			const endTime = new Date(`1970-01-01T${end}:00`);
			while (currentTime < endTime) {
				slots.push(currentTime.toTimeString().substring(0, 5));
				currentTime.setMinutes(currentTime.getMinutes() + durationMinutes);
			}
			return slots;
		}
		const TIMESLOTS = generateTimeslots(scheduleStartTime, '17:00', 90);

		// 5. Create the "Job List"
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
					splitGroup: `split_${cls.id}_1`,
					allowedDays: cls.lecture_days
				});
				tasksToSchedule.push({
					class: cls,
					type: 'Lecture',
					hours: splitHours,
					slotsNeeded: Math.ceil(splitHours / SLOT_DURATION_HOURS),
					splitGroup: `split_${cls.id}_2`,
					allowedDays: cls.lecture_days
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

		tasksToSchedule.sort((a, b) => b.slotsNeeded - a.slotsNeeded);

		// 6. Initialize Solver State
		let scheduledEntries: any[] = [];
		let failedClasses: any[] = [];

		// 7. Run the Solver
		for (const task of tasksToSchedule) {
			let slotFound = false;

			const attemptSchedulingInRooms = (roomsToTry: any[]) => {
				if (slotFound || !roomsToTry) return;
				const orderedRoomsToTry = [...roomsToTry].sort((a, b) => a.capacity - b.capacity);

				const daysToTry = task.allowedDays && task.allowedDays.length > 0 ? task.allowedDays : DAYS;

				for (const room of orderedRoomsToTry) {
					if (slotFound) break;
					if (constraints.enforceCapacity && room.capacity < task.class.blocks.estimated_students)
						continue;
					if (constraints.enforceRoomType && room.type !== task.type) continue;

					for (const day of daysToTry) {
						if (slotFound) break;
						for (let i = 0; i <= TIMESLOTS.length - task.slotsNeeded; i++) {
							if (slotFound) break;

							let isRangeFree = true;
							for (let j = 0; j < task.slotsNeeded; j++) {
								const time = TIMESLOTS[i + j];
								if (
									scheduledEntries.some(
										(e) =>
											(e.room_id === room.id &&
												e.day_of_week === day &&
												e.start_time.startsWith(time)) ||
											(constraints.enforceInstructor &&
												e.class.instructor_id &&
												e.class.instructor_id === task.class.instructor_id &&
												e.day_of_week === day &&
												e.start_time.startsWith(time)) ||
											(constraints.enforceBlock &&
												e.class.block_id === task.class.block_id &&
												e.day_of_week === day &&
												e.start_time.startsWith(time))
									)
								) {
									isRangeFree = false;
									break;
								}
							}

							if (isRangeFree) {
								for (let j = 0; j < task.slotsNeeded; j++) {
									const time = TIMESLOTS[i + j];
									const endTime = calculateEndTime(time, SLOT_DURATION_HOURS);
									scheduledEntries.push({
										timetable_id,
										class_id: task.class.id,
										room_id: room.id,
										day_of_week: day,
										start_time: formatTime(time),
										end_time: formatTime(endTime),
										course_type: task.type,
										class: task.class // Keep original class for constraint checking
									});
								}
								slotFound = true;
							}
						}
					}
				}
			};

			attemptSchedulingInRooms(roomsData);

			if (!slotFound) {
				failedClasses.push({
					class: `${task.class.subjects.subject_code} (${task.type})`,
					reason: 'No available slot found that meets all constraints.'
				});
			}
		}

		// 8. Insert successful entries
		if (scheduledEntries.length > 0) {
			const entriesToInsert = scheduledEntries.map(({ class: _, ...dbEntry }) => dbEntry);
			await locals.supabase.from('schedules').delete().eq('timetable_id', timetable_id);
			const { error: insertError } = await locals.supabase
				.from('schedules')
				.insert(entriesToInsert);
			if (insertError) {
				return fail(500, { message: `Failed to save schedule: ${insertError.message}` });
			}
		}

		// 9. Return summary
		return {
			success: true,
			message: `Generation complete. Successfully scheduled ${
				tasksToSchedule.length - failedClasses.length
			} out of ${tasksToSchedule.length} tasks.`,
			failedClasses,
			generatedTimetableId: timetable_id
		};
	}
};

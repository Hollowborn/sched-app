import { fail, error, redirect } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';

const ALLOWED_ROLES = ['Admin', 'Dean', 'Registrar'];

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
	const userRole = locals.profile?.role;
	if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
		throw error(403, 'Forbidden: You do not have permission to access this page.');
	}

	const currentYear = new Date().getFullYear();
	const academic_year = url.searchParams.get('year') || `${currentYear}-${currentYear + 1}`;
	const semester = (url.searchParams.get('semester') || '1st Semester') as
		| '1st Semester'
		| '2nd Semester'
		| 'Summer';

	// Fetch available draft timetables
	let timetableQuery = locals.supabase
		.from('timetables')
		.select('id, name, status')
		.eq('academic_year', academic_year)
		.eq('semester', semester)
		.eq('status', 'draft') // Only show drafts to generate into
		.order('created_at', { ascending: false });

	if (userRole === 'Dean' && locals.profile?.college_id) {
		timetableQuery = timetableQuery.eq('college_id', locals.profile.college_id);
	}

	const { data: availableTimetables, error: timetablesError } = await timetableQuery;

	// Fetch colleges
	const { data: colleges, error: collegesError } = await locals.supabase
		.from('colleges')
		.select('*');

	// Fetch rooms, grouped by building for a better UI
	const { data: rooms, error: roomsError } = await locals.supabase
		.from('rooms')
		.select('id, room_name, building, type, capacity');

	if (timetablesError || collegesError || roomsError) {
		console.error('Error loading generator data:', timetablesError || collegesError || roomsError);
		throw error(500, 'Could not load initial data.');
	}

	// Group rooms by building
	const roomsByBuilding = (rooms || []).reduce(
		(acc, room) => {
			const building = room.building || 'General';
			if (!acc[building]) {
				acc[building] = [];
			}
			acc[building].push(room);
			return acc;
		},
		{} as Record<string, typeof rooms>
	);

	return {
		availableTimetables: availableTimetables || [],
		colleges: colleges || [],
		roomsByBuilding,
		profile: locals.profile,
		filters: { academic_year, semester }
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	// Action to create a new timetable (needed for the modal)
	createTimetable: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
			return fail(403, { message: 'Forbidden' });
		}

		const formData = await request.formData();
		const name = formData.get('name')?.toString()?.trim();
		const academic_year = formData.get('academic_year')?.toString();
		const semester = formData.get('semester')?.toString() as
			| '1st Semester'
			| '2nd Semester'
			| 'Summer';
		const college_id = userRole === 'Dean' ? locals.profile?.college_id : null;

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
				created_by: locals.user?.id,
				status: 'draft'
			})
			.select('id')
			.single();

		if (insertError) {
			console.error('Error creating timetable:', insertError);
			return fail(500, { createError: 'Could not create timetable.' });
		}

		// Redirect back to the page, now with the new timetable selected
		const params = new URLSearchParams();
		params.set('year', academic_year);
		params.set('semester', semester);
		params.set('timetableId', newTimetable.id.toString());
		throw redirect(303, `/menu/timetables/generate?${params.toString()}`);
	},

	// --- The Main Generator Action ---
	generateSchedule: async ({ request, locals }) => {
		const userRole = locals.profile?.role;
		if (!userRole || !ALLOWED_ROLES.includes(userRole)) {
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
		const college_ids = formData.getAll('college_ids').map(Number);
		const room_ids = formData.getAll('room_ids').map(Number);
		const scheduleStartTime = formData.get('scheduleStartTime')?.toString() || '07:30';

		// 2. Get Constraints
		const constraints = {
			enforceCapacity: !!formData.get('enforceCapacity'),
			enforceRoomType: !!formData.get('enforceRoomType'),
			enforceInstructor: !!formData.get('enforceInstructor'),
			enforceBlock: !!formData.get('enforceBlock')
		};

		if (!timetable_id || college_ids.length === 0 || room_ids.length === 0) {
			return fail(400, { message: 'Timetable, Colleges, and Rooms must be selected.' });
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
					.in('subjects.college_id', college_ids),
				locals.supabase.from('rooms').select('*').in('id', room_ids)
			]);

		if (classesError || roomsError) throw error(500, 'Failed to fetch solver data.');

		// 4. Define Domain (Playable Slots)
		const DAYS = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
		const SLOT_DURATION_MINUTES = 90; // 1.5 hours

		function generateTimeslots(start: string, end: string, duration: number) {
			const slots = [];
			let currentTime = new Date(`1970-01-01T${start}:00`);
			const endTime = new Date(`1970-01-01T${end}:00`);

			while (currentTime < endTime) {
				slots.push(currentTime.toTimeString().substring(0, 5));
				currentTime.setMinutes(currentTime.getMinutes() + duration);
			}
			return slots;
		}
		const TIMESLOTS = generateTimeslots(scheduleStartTime, '17:00', SLOT_DURATION_MINUTES);

		// 5. Create the "Job List" (splitting Lec/Lab and calculating slots needed)
		const tasksToSchedule: any[] = [];
		(classesData || []).forEach((cls) => {
			if (cls.subjects.lecture_hours > 0) {
				tasksToSchedule.push({
					class: cls,
					type: 'Lecture',
					hours: Number(cls.subjects.lecture_hours),
					slotsNeeded: Math.ceil(Number(cls.subjects.lecture_hours) / 1.5)
				});
			}
			if (cls.subjects.lab_hours > 0) {
				tasksToSchedule.push({
					class: cls,
					type: 'Lab',
					hours: Number(cls.subjects.lab_hours),
					slotsNeeded: Math.ceil(Number(cls.subjects.lab_hours) / 1.5)
				});
			}
		});

		// Sort tasks to schedule multi-slot (harder) ones first
		tasksToSchedule.sort((a, b) => b.slotsNeeded - a.slotsNeeded);

		// 6. Initialize Solver State
		let scheduledEntries: any[] = [];
		let failedClasses: any[] = [];

		// 7. Run the Solver
		for (const task of tasksToSchedule) {
			let slotFound = false;

			const attemptSchedulingInRooms = (roomsToTry: any[]) => {
				if (slotFound || !roomsToTry) return;

				const preferredRoom = task.class.pref_room_id
					? roomsToTry.find((r) => r.id === task.class.pref_room_id)
					: null;
				const otherRooms = roomsToTry.filter((r) => r.id !== task.class.pref_room_id);
				const orderedRoomsToTry = preferredRoom ? [preferredRoom, ...otherRooms] : otherRooms;

				for (const room of orderedRoomsToTry) {
					if (slotFound) break;
					if (
						constraints.enforceCapacity &&
						room.capacity < task.class.blocks.estimated_students
					) {
						continue;
					}

					for (const day of DAYS) {
						if (slotFound) break;
						for (let i = 0; i <= TIMESLOTS.length - task.slotsNeeded; i++) {
							if (slotFound) break;

							let isRangeFree = true;
							for (let j = 0; j < task.slotsNeeded; j++) {
								const time = TIMESLOTS[i + j];
								if (
									scheduledEntries.some(
										(e) =>
											e.room_id === room.id &&
											e.day_of_week === day &&
											e.start_time.startsWith(time)
									) ||
									(constraints.enforceInstructor &&
										task.class.instructor_id &&
										scheduledEntries.some(
											(e) =>
												e.class.instructor_id === task.class.instructor_id &&
												e.day_of_week === day &&
												e.start_time.startsWith(time)
										)) ||
									(constraints.enforceBlock &&
										scheduledEntries.some(
											(e) =>
												e.class.block_id === task.class.block_id &&
												e.day_of_week === day &&
												e.start_time.startsWith(time)
										))
								) {
									isRangeFree = false;
									break;
								}
							}

							if (isRangeFree) {
								for (let j = 0; j < task.slotsNeeded; j++) {
									const time = TIMESLOTS[i + j];
									const endTime = calculateEndTime(time, 1.5);
									scheduledEntries.push({
										timetable_id,
										class_id: task.class.id,
										room_id: room.id,
										day_of_week: day,
										start_time: formatTime(time),
										end_time: formatTime(endTime),
										course_type: task.type,
										class: task.class
									});
								}
								slotFound = true;
							}
						}
					}
				}
			};

			const allLectureRooms = roomsData?.filter((r) => r.type === 'Lecture') || [];
			const allLabRooms = roomsData?.filter((r) => r.type === 'Lab') || [];

			if (task.type === 'Lecture') {
				// Stage 1: Try to place Lecture in Lecture rooms
				attemptSchedulingInRooms(allLectureRooms);
				// Stage 2: If not found and constraint is on, try Lab rooms as fallback
				if (!slotFound && !constraints.enforceRoomType) {
					attemptSchedulingInRooms(allLabRooms);
				}
			} else if (task.type === 'Lab') {
				// For Labs, only ever try Lab rooms
				attemptSchedulingInRooms(allLabRooms);
			}

			if (!slotFound) {
				failedClasses.push({
					class: `${task.class.subjects.subject_code} (${task.type})`,
					reason: 'No available slot found that meets all constraints.'
				});
			}
		}

		// 8. Insert successful entries into the database
		if (scheduledEntries.length > 0) {
			const entriesToInsert = scheduledEntries.map((e) => {
				const { class: _, ...dbEntry } = e;
				return dbEntry;
			});
			const { error: insertError } = await locals.supabase
				.from('schedules')
				.insert(entriesToInsert);
			if (insertError) {
				console.error('Error inserting schedules:', insertError);
				return fail(500, {
					message: `Failed to save ${scheduledEntries.length} found slots. Error: ${insertError.message}`
				});
			}
		}

		// 9. Return summary
		return {
			success: true,
			message: `Generation complete. Successfully created ${scheduledEntries.length} schedule entries.`,
			failedClasses,
			generatedTimetableId: timetable_id
		};
	}
};
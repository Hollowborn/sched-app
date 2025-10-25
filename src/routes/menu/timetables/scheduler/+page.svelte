<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { dndzone } from 'svelte-dnd-action';
	import { flip } from 'svelte/animate';
	import {
		Calendar,
		BookOpen,
		Filter,
		Users,
		DoorOpen,
		User as UserIcon,
		PlusCircle,
		Clock,
		Save,
		Eye,
		Trash2,
		LoaderCircle,
		CheckCircle
	} from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';

	type UnscheduledClass = {
		id: number; // class_id
		course_type: 'Lecture' | 'Lab';
		hours: number;
		subjects: { subject_code: string; subject_name: string; college_id: number };
		blocks: { id: number; block_name: string };
		instructors: { id: number; name: string } | null;
	};

	type ScheduledItem = {
		id: number; // schedule_id
		day_of_week: string;
		start_time: string; // "HH:MM:SS"
		end_time: string; // "HH:MM:SS"
		course_type: 'Lecture' | 'Lab';
		room_id: number;
		rooms: { room_name: string };
		class: {
			id: number; // class_id
			subjects: { subject_code: string; subject_name: string };
			instructors: { name: string } | null;
			blocks: { block_name: string };
		};
	};

	type Room = {
		id: number;
		room_name: string;
		capacity: number;
		type: string;
		features: string[] | null;
	};

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- Component & Dnd State ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let selectedTimetableId = $state(data.filters.timetableId?.toString() ?? undefined);
	let unscheduledList = $state<UnscheduledClass[]>(data.unscheduledClasses || []);
	let scheduleGrid = $state<ScheduledItem[]>(data.scheduleData || []);
	let isSubmitting = $state(false); // For modal forms

	// State for the "Create Timetable" modal
	let createTimetableOpen = $state(false);
	let newTimetableName = $state('');

	// State for the "Schedule Class" modal
	let scheduleModalOpen = $state(false);
	let itemToSchedule = $state<UnscheduledClass | null>(null);
	let scheduleDay = $state('');
	let scheduleStartTime = $state(''); // "HH:MM"
	let scheduleEndTime = $state(''); // "HH:MM"
	let scheduleRoomId = $state<string | undefined>('');
	let availableRooms = $state<Room[]>([]);

	// State for the "Edit Schedule" modal
	let editModalOpen = $state(false);
	let itemToEdit = $state<ScheduledItem | null>(null);
	let editRoomId = $state<string | undefined>('');
	let editAvailableRooms = $state<Room[]>([]);

	// Dnd configuration
	const flipDurationMs = 200;
	function handleDndConsider(
		e: CustomEvent<{
			items: UnscheduledClass[];
			info: { id: any; source: Element; trigger: Element };
		}>
	) {
		unscheduledList = e.detail.items;
	}
	function handleDndFinalize(
		e: CustomEvent<{
			items: UnscheduledClass[];
			info: { id: any; source: Element; trigger: Element };
		}>
	) {
		unscheduledList = e.detail.items;
	}

	// --- Derived State ---
	const selectedTimetable = $derived(
		data.availableTimetables.find((t) => t.id === Number(selectedTimetableId))
	);

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams();
		params.set('year', academicYear);
		params.set('semester', semester);
		if (selectedTimetableId) {
			params.set('timetableId', selectedTimetableId);
		}
		// Use replaceState: false to allow back button navigation between timetable views
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true, replaceState: false });
	}

	function generateAcademicYears() {
		const currentYear = new Date().getFullYear();
		const years = [];
		for (let i = -2; i <= 2; i++) {
			const startYear = currentYear + i;
			years.push(`${startYear}-${startYear + 1}`);
		}
		return years;
	}

	function handleDropOnGrid(day: string, startTime: string, droppedItem: UnscheduledClass) {
		// Calculate end time
		const duration = droppedItem.hours;
		const end = calculateEndTime(startTime, duration);

		// Pre-filter rooms based on capacity and type
		// Note: A proper capacity check needs block size data, which isn't loaded here yet.
		// For now, let's filter just by type if it's a lab.
		const requiredType = droppedItem.course_type === 'Lab' ? 'Lab' : undefined; // Or maybe allow Lab in Lecture?
		availableRooms = data.rooms.filter(
			(r) => !requiredType || r.type === requiredType
			// && r.capacity >= ?? // Needs block size
		);
		// TODO: Add a check here against `scheduleGrid` to see if rooms are actually free

		// Open the modal
		itemToSchedule = droppedItem;
		scheduleDay = day;
		scheduleStartTime = startTime;
		scheduleEndTime = end;
		scheduleRoomId = undefined; // Reset room selection
		scheduleModalOpen = true;
	}

	function calculateEndTime(startTime: string, durationHours: number): string {
		try {
			const [hours, minutes] = startTime.split(':').map(Number);
			const totalMinutes = hours * 60 + minutes + durationHours * 60;
			const endHour = Math.floor(totalMinutes / 60) % 24;
			const endMinute = totalMinutes % 60;
			return `${endHour.toString().padStart(2, '0')}:${endMinute.toString().padStart(2, '0')}`;
		} catch {
			return startTime;
		}
	}

	function openEditModal(scheduleEntry: ScheduledItem) {
		itemToEdit = scheduleEntry;
		editRoomId = scheduleEntry.room_id.toString();
		// TODO: Filter available rooms for editing as well
		editAvailableRooms = data.rooms;
		editModalOpen = true;
	}

	// --- Time Slot Generation --- (Simplified to 1-hour slots for now)
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const timeSlots = Array.from({ length: 12 }, (_, i) => {
		// 7 AM to 6 PM
		const hour = 7 + i;
		const nextHour = hour + 1;
		const formattedHour = hour < 10 ? `0${hour}` : hour;
		const formattedNextHour = nextHour < 10 ? `0${nextHour}` : nextHour;
		return {
			start: `${formattedHour}:00`,
			end: `${formattedNextHour}:00`
		};
	});

	// --- Effects for Toasts ---
	$effect(() => {
		if (form?.scheduleError) {
			toast.error(form.scheduleError);
			form.scheduleError = undefined; // Clear error after showing
		}
		if (form?.message && !form?.scheduleError) {
			toast.success(form.message);
			form.message = undefined; // Clear message after showing
		}
	});
</script>

<div class="space-y-6">
	<header class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Master Scheduler</h1>
			<p class="text-muted-foreground mt-1">Visually assign classes to time slots and rooms.</p>
		</div>
		{#if selectedTimetable}
			<div class="flex items-center gap-2">
				<Badge variant={selectedTimetable.status === 'Published' ? 'default' : 'secondary'}
					>{selectedTimetable.status}</Badge
				>
				{#if selectedTimetable.status === 'Draft' && data.profile?.role && ['Admin', 'Dean', 'Registrar'].includes(data.profile.role)}
					<form method="POST" action="?/publishTimetable" use:enhance>
						<input type="hidden" name="timetableId" value={selectedTimetable.id} />
						<Button type="submit" size="sm"><CheckCircle class="mr-2 h-4 w-4" /> Publish</Button>
					</form>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Filter Control Panel -->
	<Card.Root>
		<Card.Content class="p-4 flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={academicYear}
					onValueChange={(v) => {
						if (v) academicYear = v;
						selectedTimetableId = undefined; // Reset timetable when term changes
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]"><span>{academicYear}</span></Select.Trigger>
					<Select.Content>
						{#each generateAcademicYears() as year}
							<Select.Item value={year}>{year}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<BookOpen class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={semester}
					onValueChange={(v) => {
						if (v) semester = v;
						selectedTimetableId = undefined; // Reset timetable when term changes
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]"><span>{semester}</span></Select.Trigger>
					<Select.Content>
						<Select.Item value="1st Semester">1st Semester</Select.Item>
						<Select.Item value="2nd Semester">2nd Semester</Select.Item>
						<Select.Item value="Summer">Summer</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex-1 flex items-center gap-2">
				<Label for="timetable-select" class="shrink-0">Timetable:</Label>
				<Select.Root
					id="timetable-select"
					type="single"
					value={selectedTimetableId}
					onValueChange={(v) => {
						if (v === 'new') {
							createTimetableOpen = true;
						} else if (v) {
							selectedTimetableId = v;
							handleFilterChange();
						}
					}}
				>
					<Select.Trigger class="flex-1">
						<span>{selectedTimetable?.name || 'Select or Create Timetable'}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="new">-- Create New Timetable --</Select.Item>
						{#if data.availableTimetables.length > 0}<Select.Separator />{/if}
						{#each data.availableTimetables as tt}
							<Select.Item value={tt.id.toString()}>{tt.name} ({tt.status})</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	{#if !selectedTimetableId}
		<div class="text-center py-10 text-muted-foreground">
			Please select or create a timetable above to begin scheduling.
		</div>
	{:else}
		<!-- Main Scheduler Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6 items-start">
			<!-- Unscheduled Classes Panel -->
			<div class="space-y-4 lg:sticky lg:top-20">
				<h2 class="text-lg font-semibold">Available Classes</h2>
				<div
					class="space-y-3 max-h-[70vh] overflow-y-auto border rounded-lg p-3"
					use:dndzone={{ items: unscheduledList, flipDurationMs }}
					onconsider={handleDndConsider}
					onfinalize={handleDndFinalize}
				>
					{#each unscheduledList as classItem (`${classItem.id}-${classItem.course_type}`)}
						<div animate:flip={{ duration: flipDurationMs }}>
							<Card.Root
								class="cursor-grab active:cursor-grabbing shadow-sm hover:shadow-md transition-shadow"
							>
								<Card.Content class="p-3">
									<div class="flex justify-between items-start">
										<p class="font-semibold">{classItem.subjects.subject_code}</p>
										<Badge variant="outline">{classItem.course_type} ({classItem.hours}h)</Badge>
									</div>
									<p class="text-sm text-muted-foreground">{classItem.subjects.subject_name}</p>
									<p class="text-xs text-muted-foreground mt-1">
										{classItem.instructors?.name || 'Unassigned'}
									</p>
									<div class="flex justify-between items-center mt-2">
										<Badge variant="secondary">{classItem.blocks.block_name}</Badge>
										{#if data.profile?.role && ['Admin', 'Dean', 'Registrar'].includes(data.profile.role) && selectedTimetable?.status === 'Draft'}
											<!-- The button is now just visual, drag the card instead -->
											<span class="text-xs text-muted-foreground">Drag to schedule</span>
										{/if}
									</div>
								</Card.Content>
							</Card.Root>
						</div>
					{/each}
					{#if unscheduledList.length === 0}
						<p class="text-sm text-muted-foreground text-center py-4">
							All classes scheduled for this timetable.
						</p>
					{/if}
				</div>
			</div>

			<!-- Timetable Grid -->
			<div class="border rounded-lg overflow-x-auto">
				<div
					class="grid grid-cols-[auto_repeat(6,_minmax(120px,_1fr))] text-center font-medium text-sm sticky top-0 bg-background z-10"
				>
					<div class="p-2 border-b border-r"><Clock class="h-4 w-4 mx-auto" /></div>
					{#each days as day}
						<div class="p-2 border-b border-r">{day}</div>
					{/each}
				</div>
				<div class="grid grid-cols-[auto_repeat(6,_minmax(120px,_1fr))]">
					{#each timeSlots as slot (slot.start)}
						<div
							class="p-1 text-xs text-muted-foreground border-r flex items-center justify-center"
						>
							{slot.start}
						</div>
						{#each days as day (day)}
							<div
								class="border-r border-t min-h-[70px] p-1 relative"
								use:dndzone={{ items: [{ day, start: slot.start }], dropFromOthersDisabled: true }}
								onconsider={(e) => {
									// Add hover styling
									(e.target as HTMLElement).style.backgroundColor = 'hsl(var(--primary) / 0.1)';
								}}
								onfinalize={(e) => {
									// Remove hover styling
									(e.target as HTMLElement).style.backgroundColor = '';
									// Only handle drops from the unscheduled list
									if (e.detail.info.source.classList.contains('unscheduled-item-source')) {
										// Find the dropped item data using its ID
										const droppedIdParts = e.detail.info.id.split('-'); // e.g., "classId-Type"
										const droppedClassId = Number(droppedIdParts[0]);
										const droppedType = droppedIdParts[1];
										const droppedItemData = unscheduledList.find(
											(item) => item.id === droppedClassId && item.course_type === droppedType
										);
										if (droppedItemData) {
											handleDropOnGrid(day, slot.start, droppedItemData);
										}
									}
								}}
							>
								<!-- Render existing scheduled items for this slot -->
								{#each scheduleGrid.filter((s) => s.day_of_week === day && s.start_time.startsWith(slot.start)) as scheduledItem (scheduledItem.id)}
									<button
										type="button"
										class="absolute inset-x-1 top-1 bg-primary/80 text-primary-foreground p-1.5 rounded text-left text-[10px] leading-tight hover:bg-primary z-10 shadow cursor-pointer"
										style="height: calc({(new Date(`1970-01-01T${scheduledItem.end_time}`) -
											new Date(`1970-01-01T${scheduledItem.start_time}`)) /
											(1000 * 60 * 60)} * (70px + 1px) - 2px);"
										onclick={() => openEditModal(scheduledItem)}
									>
										<p class="font-bold">
											{scheduledItem.class.subjects.subject_code} ({scheduledItem.course_type[0]})
										</p>
										<p class="text-xs">{scheduledItem.rooms.room_name}</p>
										<p class="text-xs">{scheduledItem.class.instructors?.name || 'N/A'}</p>
										<p class="text-xs">{scheduledItem.class.blocks.block_name}</p>
									</button>
								{/each}
							</div>
						{/each}
					{/each}
				</div>
			</div>
		</div>
	{/if}
</div>

<!-- Modals -->
<Dialog.Root bind:open={createTimetableOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Timetable</Dialog.Title>
			<Dialog.Description>
				Give this new timetable a descriptive name for {academicYear}, {semester}.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createTimetable"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating timetable...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'redirect') {
						toast.success('Timetable created!', { id: toastId });
						createTimetableOpen = false;
						// Let SvelteKit handle the redirect from the server action
					} else if (result.type === 'failure') {
						toast.error(result.data?.createError || 'Failed to create.', { id: toastId });
					}
					await update({ reset: false }); // Don't reset filters
				};
			}}
		>
			<input type="hidden" name="academic_year" value={academicYear} />
			<input type="hidden" name="semester" value={semester} />
			<div class="py-4">
				<Label for="new-timetable-name">Timetable Name</Label>
				<Input
					id="new-timetable-name"
					name="name"
					bind:value={newTimetableName}
					placeholder="e.g., Fall 2025 Draft 2"
					required
				/>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (createTimetableOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={!newTimetableName || isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create & Open
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root
	bind:open={scheduleModalOpen}
	onOpenChange={(open) => {
		if (!open) itemToSchedule = null;
	}}
>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Schedule Class</Dialog.Title>
			{#if itemToSchedule}
				<Dialog.Description>
					Confirm room for <strong
						>{itemToSchedule.subjects.subject_code} ({itemToSchedule.course_type})</strong
					>
					for block
					<strong>{itemToSchedule.blocks.block_name}</strong> on {scheduleDay} from {scheduleStartTime}
					to {scheduleEndTime}.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		<form
			method="POST"
			action="?/addScheduleEntry"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Scheduling class...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						scheduleModalOpen = false;
						invalidateAll(); // Reload all data
					} else if (result.type === 'failure') {
						toast.error(result.data?.scheduleError || 'Failed to schedule.', { id: toastId });
					}
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="timetable_id" value={selectedTimetableId} />
			<input type="hidden" name="class_id" value={itemToSchedule?.id} />
			<input type="hidden" name="day_of_week" value={scheduleDay} />
			<input type="hidden" name="start_time" value={scheduleStartTime} />
			<input type="hidden" name="end_time" value={scheduleEndTime} />
			<input type="hidden" name="course_type" value={itemToSchedule?.course_type} />

			<div class="py-4 space-y-4">
				<div class="space-y-2">
					<Label for="schedule-room">Room</Label>
					<Select.Root type="single" name="room_id" bind:value={scheduleRoomId}>
						<Select.Trigger><Select.Value placeholder="Select an available room" /></Select.Trigger>
						<Select.Content>
							{#each availableRooms as room}
								<Select.Item value={room.id.toString()}
									>{room.room_name} (Cap: {room.capacity})</Select.Item
								>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (scheduleModalOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={!scheduleRoomId || isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Confirm Schedule
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#if itemToEdit}
	<Dialog.Root
		bind:open={editModalOpen}
		onOpenChange={(open) => {
			if (!open) itemToEdit = null;
		}}
	>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Edit Scheduled Class</Dialog.Title>
				<Dialog.Description>
					Editing: <strong
						>{itemToEdit.class.subjects.subject_code} ({itemToEdit.course_type})</strong
					>
					for block
					<strong>{itemToEdit.class.blocks.block_name}</strong> on {itemToEdit.day_of_week} at {itemToEdit.start_time.substring(
						0,
						5
					)}.
				</Dialog.Description>
			</Dialog.Header>
			<!-- TODO: Add Edit Form (similar to add, but action="?/updateScheduleEntry") -->
			<form
				method="POST"
				action="?/deleteScheduleEntry"
				class="pt-4"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Unscheduling class...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							editModalOpen = false;
							invalidateAll(); // Reload all data
						} else if (result.type === 'failure') {
							toast.error(result.data?.scheduleError || 'Failed.', { id: toastId });
						}
						await update({ reset: false });
					};
				}}
			>
				<input type="hidden" name="scheduleId" value={itemToEdit.id} />
				<div class="flex justify-between">
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
						Unschedule Class
					</Button>
					<Button type="button" variant="outline" onclick={() => (editModalOpen = false)}
						>Cancel</Button
					>
				</div>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	/* Add some basic styling for the grid cells */
	[use\:dndzone] {
		min-height: 70px;
	}
	/* Add visual cue for draggable items */
	[aria-grabbed='true'] {
		opacity: 0.7;
		box-shadow: 0 4px 6px rgba(0, 0, 0, 0.1);
	}
</style>

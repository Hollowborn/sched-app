<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { flip } from 'svelte/animate';
	import { tick } from 'svelte';
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
		CheckCircle,
		GripVertical,
		ChevronLeft,
		ChevronRight
	} from '@lucide/svelte';

	// New state for filters
	// let selectedRoomFilter = $state<string | undefined>(undefined);
	// let selectedBlockFilter = $state<string | undefined>(undefined);
	// let selectedInstructorFilter = $state<string | undefined>(undefined);

	// State for drag and drop
	let draggedItem: UnscheduledClass | null = $state(null);

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';

	// Type Definitions matching server load function
	type UnscheduledClass = {
		id: number; // Original numeric ID
		course_type: 'Lecture' | 'Lab';
		hours: number;
		subjects: { id: number; subject_code: string; subject_name: string; college_id: number };
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
			// Note the nesting from the server query
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

	type Instructor = { id: number; name: string };
	type Block = { id: number; block_name: string };

	let { data, form } = $props<{
		data: PageData & {
			filters: {
				academic_year: string;
				semester: '1st Semester' | '2nd Semester' | 'Summer';
				timetableId: number | null;
				room_id?: string;
				block_id?: string;
				instructor_id?: string;
			};
			allRooms: Room[];
			allBlocks: Block[];
			allInstructors: Instructor[];
		};
		form: ActionData;
	}>();

	// --- Component & Dnd State ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let selectedTimetableId = $state(data.filters.timetableId?.toString() ?? undefined);
	let selectedRoomFilter = $state<string | undefined>(data.filters.room_id);
	let selectedBlockFilter = $state<string | undefined>(data.filters.block_id);
	let selectedInstructorFilter = $state<string | undefined>(data.filters.instructor_id);
	let unscheduledList = $state<UnscheduledClass[]>([]); // Will be populated by $effect
	let scheduleGrid = $state<{ [key: string]: ScheduledItem[] }>({}); // Store grid data keyed by "day-startTime"
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

	// Populate scheduleGrid when data loads/changes
	$effect(() => {
		const grid: { [key: string]: ScheduledItem[] } = {};
		(data.scheduleData || []).forEach((item: ScheduledItem) => {
			const key = `${item.day_of_week}-${item.start_time.substring(0, 5)}`; // Key by "Monday-08:00"
			if (!grid[key]) {
				grid[key] = [];
			}
			grid[key].push(item);
		});
		scheduleGrid = grid;

		// Populate unscheduledList directly from data, no dndzone specific ID modification needed
		unscheduledList = data.unscheduledClasses || [];
	});

	// --- Derived State ---
	const selectedTimetable = $derived(
		data.availableTimetables.find((t: any) => t.id === Number(selectedTimetableId))
	);

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams();
		params.set('year', academicYear);
		params.set('semester', semester);
		if (selectedTimetableId) {
			params.set('timetableId', selectedTimetableId);
		}
		if (selectedRoomFilter) {
			params.set('room_id', selectedRoomFilter);
		}
		if (selectedBlockFilter) {
			params.set('block_id', selectedBlockFilter);
		}
		if (selectedInstructorFilter) {
			params.set('instructor_id', selectedInstructorFilter);
		}
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

	// Navigation helper functions
	function getCurrentFilterIndex(
		filterType: 'room' | 'block' | 'instructor',
		currentValue?: string
	): number {
		if (!currentValue) return -1;
		const id = parseInt(currentValue);

		if (filterType === 'room') {
			return data.allRooms.findIndex((r: Room) => r.id === id);
		} else if (filterType === 'block') {
			return data.allBlocks.findIndex((b: Block) => b.id === id);
		} else if (filterType === 'instructor') {
			return data.allInstructors.findIndex((i: Instructor) => i.id === id);
		}
		return -1;
	}

	function navigateFilter(filterType: 'room' | 'block' | 'instructor', direction: 'prev' | 'next') {
		let currentValue: string | undefined;
		let list: Room[] | Block[] | Instructor[];
		let setFilter: (value: string | undefined) => void;

		if (filterType === 'room') {
			currentValue = selectedRoomFilter;
			list = data.allRooms;
			setFilter = (v) => {
				selectedRoomFilter = v;
			};
		} else if (filterType === 'block') {
			currentValue = selectedBlockFilter;
			list = data.allBlocks;
			setFilter = (v) => {
				selectedBlockFilter = v;
			};
		} else {
			currentValue = selectedInstructorFilter;
			list = data.allInstructors;
			setFilter = (v) => {
				selectedInstructorFilter = v;
			};
		}

		const currentIndex = getCurrentFilterIndex(filterType, currentValue);
		let newIndex = currentIndex;

		if (direction === 'prev') {
			newIndex = currentIndex - 1;
			if (newIndex < 0) newIndex = list.length - 1; // Wrap to end
		} else {
			newIndex = currentIndex + 1;
			if (newIndex >= list.length) newIndex = 0; // Wrap to beginning
		}

		setFilter(list[newIndex].id.toString());
		handleFilterChange();
	}

	const hasRoomFilter = $derived(!!selectedRoomFilter);
	const hasBlockFilter = $derived(!!selectedBlockFilter);
	const hasInstructorFilter = $derived(!!selectedInstructorFilter);

	function handleDragStart(event: DragEvent, classItem: UnscheduledClass) {
		if (selectedTimetable?.status === 'Published') {
			event.preventDefault();
			return;
		}
		draggedItem = classItem;
		event.dataTransfer?.setData('text/plain', JSON.stringify(classItem));
		event.dataTransfer?.setDragImage(event.currentTarget as Element, 0, 0);
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault(); // Necessary to allow dropping
		if (selectedTimetable?.status === 'Published') {
			return;
		}
		const target = event.currentTarget as HTMLElement;
		target.style.outline = '2px dashed hsl(var(--primary))';
		target.style.outlineOffset = '-2px';
	}

	function handleDragLeave(event: DragEvent) {
		const target = event.currentTarget as HTMLElement;
		target.style.outline = '';
	}

	async function handleDrop(event: DragEvent, day: string, startTime: string) {
		event.preventDefault();
		const target = event.currentTarget as HTMLElement;
		target.style.outline = ''; // Remove highlight

		if (selectedTimetable?.status === 'Published') {
			return;
		}

		const droppedItemData: UnscheduledClass | null = draggedItem;
		if (!droppedItemData) return;

		// Calculate end time
		const duration = droppedItemData.hours;
		const end = calculateEndTimeString(startTime, duration);

		// --- Basic Room Filtering (Client-side estimate) ---
		const requiredType = droppedItemData.course_type === 'Lab' ? 'Lab' : undefined;
		availableRooms = data.allRooms.filter((r: Room) => !requiredType || r.type === requiredType);

		// Filter rooms already booked in this exact slot (client-side approximation)
		const bookedRoomIds = (scheduleGrid[`${day}-${startTime}`] || []).map((item) => item.room_id);
		availableRooms = availableRooms.filter((r) => !bookedRoomIds.includes(r.id));

		if (availableRooms.length === 0) {
			toast.error('No suitable rooms available for this slot.', {
				description: `Check capacity and type requirements for ${droppedItemData.subjects.subject_code}.`
			});
			return; // Don't open modal if no rooms fit
		}

		// Open the modal
		itemToSchedule = droppedItemData;
		scheduleDay = day;
		scheduleStartTime = startTime; // "HH:MM"
		scheduleEndTime = end; // "HH:MM"
		scheduleRoomId = undefined; // Reset room selection
		await tick(); // Ensure state updates before opening modal
		scheduleModalOpen = true;
		draggedItem = null; // Reset dragged item
	}

	function calculateEndTimeString(startTime: string, durationHours: number): string {
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
		// TODO: Filter available rooms for editing based on the *original* time slot
		editAvailableRooms = data.allRooms;
		editModalOpen = true;
	}

	// --- Time Slot Generation --- (1-hour slots, 7 AM to 7 PM)
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const timeSlots = Array.from({ length: 12 }, (_, i) => {
		// 7 AM to 6 PM (12 slots)
		const hour = 7 + i;
		const nextHour = hour + 1;
		const formattedHour = hour < 10 ? `0${hour}` : hour;
		return {
			start: `${formattedHour}:00`,
			end: `${nextHour.toString().padStart(2, '0')}:00`
		};
	});
</script>

<svelte:head>
	<title>Master Scheduler | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Master Scheduler</h1>
			<p class="text-muted-foreground mt-1">
				Visually assign classes to time slots and rooms for the selected timetable.
			</p>
		</div>
		{#if selectedTimetable}
			<div class="flex items-center gap-2">
				<Badge variant={selectedTimetable.status === 'Published' ? 'default' : 'secondary'}
					>{selectedTimetable.status}</Badge
				>
				{#if selectedTimetable.status === 'Draft' && data.profile?.role && ['Admin', 'Dean', 'Registrar'].includes(data.profile.role)}
					<form
						method="POST"
						action="?/publishTimetable"
						use:enhance={() => {
							const toastId = toast.loading('Publishing timetable...');
							return async ({ update, result }) => {
								if (result.type === 'success') {
									toast.success(String(result.data?.message), { id: toastId });
									await invalidateAll(); // Refresh to new status
								} else if (result.type === 'failure') {
									toast.error(String(result.data?.message), { id: toastId });
								}
								await update({ reset: false });
							};
						}}
					>
						<input type="hidden" name="timetableId" value={selectedTimetable.id} />
						<Button type="submit" size="sm" variant="outline"
							><CheckCircle class="mr-2 h-4 w-4" /> Publish</Button
						>
					</form>
				{/if}
			</div>
		{/if}
	</header>

	<!-- Filter Control Panel -->
	<Card.Root>
		<Card.Content class="p-4 flex flex-wrap items-center gap-4">
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
			<div class="flex-1 flex items-center gap-2 min-w-[300px]">
				<Label for="timetable-select" class="shrink-0 font-medium">Active Timetable:</Label>
				<Select.Root
					type="single"
					value={selectedTimetableId}
					onValueChange={(v) => {
						if (v === 'new') {
							createTimetableOpen = true;
							// Prevent selecting the placeholder
							tick().then(
								() => (selectedTimetableId = data.filters.timetableId?.toString() ?? undefined)
							);
						} else if (v) {
							selectedTimetableId = v;
							handleFilterChange();
						} else {
							selectedTimetableId = undefined;
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

			<!-- New Filters with Navigation -->
			<div class="flex items-center gap-2">
				<DoorOpen class="h-4 w-4 text-muted-foreground" />
				{#if hasRoomFilter}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => navigateFilter('room', 'prev')}
						class="h-8 w-8 p-0"
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
				{/if}
				<Select.Root
					type="single"
					value={selectedRoomFilter}
					onValueChange={(v) => {
						selectedRoomFilter = v === '' ? undefined : v;
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]">
						<span
							>{data.allRooms.find((r: Room) => r.id.toString() === selectedRoomFilter)
								?.room_name || 'All Rooms'}</span
						>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Rooms</Select.Item>
						{#each data.allRooms as room}
							<Select.Item value={room.id.toString()}>{room.room_name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if hasRoomFilter}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => navigateFilter('room', 'next')}
						class="h-8 w-8 p-0"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<Users class="h-4 w-4 text-muted-foreground" />
				{#if hasBlockFilter}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => navigateFilter('block', 'prev')}
						class="h-8 w-8 p-0"
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
				{/if}
				<Select.Root
					type="single"
					value={selectedBlockFilter}
					onValueChange={(v) => {
						selectedBlockFilter = v === '' ? undefined : v;
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]">
						<span
							>{data.allBlocks.find((b: Block) => b.id.toString() === selectedBlockFilter)
								?.block_name || 'All Blocks'}</span
						>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Blocks</Select.Item>
						{#each data.allBlocks as block}
							<Select.Item value={block.id.toString()}>{block.block_name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if hasBlockFilter}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => navigateFilter('block', 'next')}
						class="h-8 w-8 p-0"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				{/if}
			</div>

			<div class="flex items-center gap-2">
				<UserIcon class="h-4 w-4 text-muted-foreground" />
				{#if hasInstructorFilter}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => navigateFilter('instructor', 'prev')}
						class="h-8 w-8 p-0"
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>
				{/if}
				<Select.Root
					type="single"
					value={selectedInstructorFilter}
					onValueChange={(v) => {
						selectedInstructorFilter = v === '' ? undefined : v;
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]">
						<span
							>{data.allInstructors.find(
								(i: Instructor) => i.id.toString() === selectedInstructorFilter
							)?.name || 'All Instructors'}</span
						>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Instructors</Select.Item>
						{#each data.allInstructors as instructor}
							<Select.Item value={instructor.id.toString()}>{instructor.name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
				{#if hasInstructorFilter}
					<Button
						variant="ghost"
						size="sm"
						onclick={() => navigateFilter('instructor', 'next')}
						class="h-8 w-8 p-0"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	{#if !selectedTimetableId}
		<Card.Root>
			<Card.Content class="text-center py-16 text-muted-foreground">
				<p>Please select or create a timetable above to begin scheduling.</p>
			</Card.Content>
		</Card.Root>
	{:else if selectedTimetable?.status === 'Published'}
		<Card.Root>
			<Card.Content class="text-center py-16 text-muted-foreground">
				<p>This timetable is published and cannot be edited. Select a draft or create a new one.</p>
			</Card.Content>
		</Card.Root>
	{:else}
		<!-- Main Scheduler Layout -->
		<div class="grid grid-cols-1 lg:grid-cols-[300px_1fr] gap-6 items-start">
			<!-- Unscheduled Classes Panel -->
			<div class="space-y-4 lg:sticky lg:top-[var(--header-height,60px)]">
				<h2 class="text-lg font-semibold px-1">Available Classes ({unscheduledList.length})</h2>
				<div
					class="space-y-3 max-h-[calc(100vh-180px)] overflow-y-auto border rounded-lg p-2 bg-muted/30"
				>
					{#each unscheduledList as classItem (classItem.id)}
						<div
							draggable="true"
							ondragstart={(e) => handleDragStart(e, classItem)}
							class="unscheduled-item-source"
						>
							<Card.Root
								class="cursor-grab active:cursor-grabbing bg-card shadow-sm hover:shadow-md transition-shadow"
							>
								<Card.Content class="p-3 flex gap-2">
									<GripVertical class="h-5 w-5 text-muted-foreground shrink-0 mt-0.5" />
									<div class="flex-1">
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
										</div>
									</div>
								</Card.Content>
							</Card.Root>
						</div>
					{/each}
					{#if unscheduledList.length === 0}
						<p class="text-sm text-muted-foreground text-center py-6">
							All classes scheduled for this timetable.
						</p>
					{/if}
				</div>
			</div>

			<!-- Timetable Grid -->
			<div class="border rounded-lg overflow-x-auto relative">
				<div
					class="grid grid-cols-[auto_repeat(6,_minmax(140px,_1fr))] text-center font-medium text-sm sticky top-0 bg-background z-10 shadow-sm"
				>
					<div class="p-2 border-b border-r sticky left-0 bg-background z-10">
						<Clock class="h-4 w-4 mx-auto" />
					</div>
					{#each days as day}
						<div class="p-2 border-b border-r">{day}</div>
					{/each}
				</div>
				<!-- Grid Body: Re-structured with nested loops -->
				<div class="grid grid-cols-[auto_repeat(6,_minmax(140px,_1fr))]">
					{#each timeSlots as slot (slot.start)}
						<!-- Time Label Cell -->
						<div
							class="p-2 text-xs font-medium text-muted-foreground border-b border-r text-right sticky left-0 bg-background z-10"
						>
							{slot.start}
						</div>

						<!-- Day Cells for this Time Slot -->
						{#each days as day (day)}
							{@const slotKey = `${day}-${slot.start}`}
							<div
								class="border-r border-t min-h-[70px] p-0.5 relative hover:bg-muted/50 transition-colors"
								ondragover={handleDragOver}
								ondragleave={handleDragLeave}
								ondrop={(e) => handleDrop(e, day, slot.start)}
							>
								<!-- Render existing scheduled items for this slot -->
								{#each scheduleGrid[slotKey] || [] as scheduledItem (scheduledItem.id)}
									{@const durationFactor =
										(Number(new Date(`1970-01-01T${scheduledItem.end_time}`)) -
											Number(new Date(`1970-01-01T${scheduledItem.start_time}`))) /
										(1000 * 60 * 60)}
									<button
										type="button"
										class="absolute inset-x-0.5 top-0.5 bg-primary/80 text-primary-foreground p-1 rounded text-left text-[10px] leading-tight hover:bg-primary z-10 shadow cursor-pointer group overflow-hidden"
										style="height: calc({durationFactor} * (70px + 1px) - 2px);"
										onclick={() => openEditModal(scheduledItem)}
										title="Click to edit or unschedule"
									>
										<p class="font-bold truncate">
											{scheduledItem.class.subjects.subject_code} ({scheduledItem.course_type[0]})
										</p>
										<p class="text-xs truncate">{scheduledItem.rooms.room_name}</p>
										<p class="text-xs truncate">{scheduledItem.class.instructors?.name || 'N/A'}</p>
										<p class="text-xs truncate">{scheduledItem.class.blocks.block_name}</p>
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
						toast.error(String(result.data?.createError) || 'Failed to create.', { id: toastId });
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
					Confirm room for <strong class="text-primary"
						>{itemToSchedule.subjects.subject_code} ({itemToSchedule.course_type})</strong
					>
					for block <strong class="text-primary">{itemToSchedule.blocks.block_name}</strong>
					on {scheduleDay} from {scheduleStartTime} to {scheduleEndTime}.
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
						toast.success(String(result.data?.message), { id: toastId });
						scheduleModalOpen = false;
					} else if (result.type === 'failure') {
						toast.error(String(result.data?.scheduleError) || 'Failed to schedule.', {
							id: toastId
						});
					}
					await update({ reset: false });
					// Invalidate after update to ensure fresh data
					if (result.type === 'success') {
						await invalidateAll();
					}
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
						<Select.Trigger
							><span>{scheduleRoomId || 'Select an available room'}</span></Select.Trigger
						>
						<Select.Content>
							{#if availableRooms.length > 0}
								{#each availableRooms as room}
									<Select.Item value={room.id.toString()}
										>{room.room_name} (Cap: {room.capacity}, {room.type})</Select.Item
									>
								{/each}
							{:else}
								<div class="p-4 text-center text-sm text-muted-foreground">
									No rooms match criteria for this slot.
								</div>
							{/if}
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
				<Dialog.Title>Scheduled Class Details</Dialog.Title>
				<Dialog.Description>
					<strong>{itemToEdit.class.subjects.subject_code} ({itemToEdit.course_type})</strong> for
					<strong>{itemToEdit.class.blocks.block_name}</strong>
				</Dialog.Description>
			</Dialog.Header>
			<div class="py-4 space-y-2 text-sm">
				<p><strong>Instructor:</strong> {itemToEdit.class.instructors?.name || 'N/A'}</p>
				<p><strong>Room:</strong> {itemToEdit.rooms.room_name}</p>
				<p>
					<strong>Time:</strong>
					{itemToEdit.day_of_week}, {itemToEdit.start_time.substring(0, 5)} - {itemToEdit.end_time.substring(
						0,
						5
					)}
				</p>
			</div>
			<form
				method="POST"
				action="?/deleteScheduleEntry"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Unscheduling class...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(String(result.data?.message), { id: toastId });
							editModalOpen = false;
						} else if (result.type === 'failure') {
							toast.error(String(result.data?.scheduleError) || 'Failed.', { id: toastId });
						}
						await update({ reset: false });
						// Invalidate after update to ensure fresh data
						if (result.type === 'success') {
							await invalidateAll();
						}
					};
				}}
			>
				<input type="hidden" name="scheduleId" value={itemToEdit.id} />
				<Dialog.Footer class="justify-between">
					<Button
						type="submit"
						variant="destructive"
						disabled={isSubmitting || selectedTimetable?.status === 'Published'}
					>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
						Unschedule Class
					</Button>
					<Button type="button" variant="outline" onclick={() => (editModalOpen = false)}
						>Close</Button
					>
				</Dialog.Footer>
				{#if selectedTimetable?.status === 'Published'}
					<p class="text-xs text-destructive mt-2 text-right">
						Cannot unschedule from a published timetable.
					</p>
				{/if}
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	/* Make grid cells at least this high */
	.grid > div[use\:dndzone] {
		min-height: 70px;
	}
	/* Add visual cue for draggable items */
	[aria-grabbed='true'] {
		opacity: 0.6;
		box-shadow: 0 5px 15px rgba(0, 0, 0, 0.2);
		border: 1px solid hsl(var(--primary));
	}
	/* Style for scheduled items to take up vertical space */
	.scheduled-item {
		/* background-color: hsl(var(--primary) / 0.8); */
		/* color: hsl(var(--primary-foreground)); */
		border-left: 3px solid hsl(var(--primary));
		background-color: hsl(var(--primary) / 0.05);
		color: hsl(var(--foreground));
	}
</style>

<script lang="ts">
	import type { PageData } from './$types';
	import { generateTimeSlots, calculateRowSpan } from '$lib/utils/time';
	import {
		ChevronLeft,
		ChevronRight,
		Printer,
		FileDown,
		Users,
		DoorOpen,
		User as UserIcon,
		Building,
		GraduationCap
	} from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';

	let { data } = $props<{ data: PageData }>();

	// --- State ---
	let viewBy = $state<'room' | 'instructor' | 'block'>('room');
	let currentItemIndex = $state(0);

	// --- Time Grid Setup ---
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	const timeInterval = 30; // 30-minute intervals
	const timeSlots = $state(generateTimeSlots('07:00', '21:00', timeInterval));

	// --- Derived State (The core logic) ---
	const listSource = $derived.by(() => {
		switch (viewBy) {
			case 'room':
				return data.uniqueRooms;
			case 'instructor':
				return data.uniqueInstructors;
			case 'block':
				return data.uniqueBlocks;
			default:
				return [];
		}
	});

	const currentItem = $derived(listSource[currentItemIndex]);

	const gridHeader = $derived.by(() => {
		if (!currentItem) return { title: 'N/A', subtitle: '', badge: '' };
		switch (viewBy) {
			case 'room':
				return {
					icon: Building,
					title: currentItem.room_name,
					subtitle: currentItem.building || 'No building specified',
					badge: currentItem.type
				};
			case 'instructor':
				return {
					icon: UserIcon,
					title: currentItem.name,
					subtitle: currentItem.colleges?.college_name || 'N/A',
					badge: `Max Load: ${currentItem.max_load}`
				};
			case 'block':
				return {
					icon: Users,
					title: currentItem.block_name,
					subtitle: currentItem.programs?.program_name || 'N/A',
					badge: `Year: ${currentItem.year_level}`
				};
		}
	});

	const filteredSchedule = $derived.by(() => {
		if (!currentItem) return [];
		switch (viewBy) {
			case 'room':
				return data.schedules.filter((s) => s.room_id === currentItem.id);
			case 'instructor':
				return data.schedules.filter((s) => s.classes.instructor_id === currentItem.id);
			case 'block':
				return data.schedules.filter((s) => s.classes.block_id === currentItem.id);
			default:
				return [];
		}
	});

	// --- Grid Cell Helper ---
	function getItemsForSlot(day: string, time: string): any[] {
		return (filteredSchedule || []).filter(
			(item) => item.day_of_week === day && item.start_time.substring(0, 5) === time
		);
	}

	// --- Navigation ---
	function goToNext() {
		currentItemIndex = (currentItemIndex + 1) % listSource.length;
	}
	function goToPrev() {
		currentItemIndex = (currentItemIndex - 1 + listSource.length) % listSource.length;
	}

	$effect(() => {
		// Reset index when view changes
		currentItemIndex = 0;
	});
</script>

<div class="space-y-6">
	<!-- Breadcrumb Navigation -->
	<nav class="flex items-center space-x-1 text-sm text-muted-foreground">
		<a href="/menu/timetables" class="hover:text-foreground transition-colors">Timetables</a>
		<span>/</span>
		<a href="/menu/timetables/view" class="hover:text-foreground transition-colors">Browse</a>
		<span>/</span>
		<span class="text-foreground font-medium">{data.timetable.name}</span>
	</nav>

	<!-- Header & Controls -->
	<header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
		<div class="flex items-center gap-4">
			<Button variant="outline" size="icon" class="shrink-0" href="/menu/timetables/view">
				<ChevronLeft class="h-4 w-4" />
			</Button>
			<div>
				<h1 class="text-3xl font-bold tracking-tight">{data.timetable.name}</h1>
				<p class="text-muted-foreground mt-1">
					{data.timetable.academic_year}, {data.timetable.semester}
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<Select.Root type="single" bind:value={viewBy}>
				<Select.Trigger class="w-[180px]">
					<span> {'View by ' + viewBy.charAt(0).toUpperCase() + viewBy.slice(1)}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="room"><DoorOpen class="mr-2 h-4 w-4" />View by Room</Select.Item>
					<Select.Item value="instructor"
						><UserIcon class="mr-2 h-4 w-4" />View by Instructor</Select.Item
					>
					<Select.Item value="block"><Users class="mr-2 h-4 w-4" />View by Block</Select.Item>
				</Select.Content>
			</Select.Root>
			<Button variant="outline" class="ml-auto"><Printer class="mr-2 h-4 w-4" />Print / PDF</Button>
			<Button variant="outline"><FileDown class="mr-2 h-4 w-4" />Export</Button>
		</div>
	</header>

	<!-- Main Timetable Display -->
	<div class="flex items-center gap-2">
		<!-- Prev Button -->
		<Button variant="outline" size="icon" onclick={goToPrev} disabled={listSource.length < 2}>
			<ChevronLeft class="h-4 w-4" />
		</Button>

		<!-- Timetable Grid -->
		<div class="flex-1 border rounded-lg overflow-x-auto">
			<!-- Dynamic Header -->
			<div class="p-4 border-b bg-muted/50">
				<div class="flex justify-between items-start">
					<div class="flex items-center gap-3">
						<svelte:component this={gridHeader.icon} class="h-6 w-6 text-muted-foreground" />
						<div>
							<h2 class="text-xl font-semibold">{gridHeader.title}</h2>
							<p class="text-muted-foreground">{gridHeader.subtitle}</p>
						</div>
					</div>
					{#if gridHeader.badge}
						<Badge variant="outline">{gridHeader.badge}</Badge>
					{/if}
				</div>
			</div>

			<!-- Grid -->
			<div
				class="grid min-w-[800px]"
				style="grid-template-columns: 60px repeat(5, 1fr); grid-template-rows: auto repeat({timeSlots.length}, 40px);"
			>
				<!-- Time Header -->
				<div class="sticky top-0 z-10 p-2 border-r border-b bg-background font-medium text-sm">
					Time
				</div>
				<!-- Day Headers -->
				{#each days as day}
					<div
						class="sticky top-0 z-10 p-2 border-r border-b bg-background font-medium text-sm text-center"
					>
						{day}
					</div>
				{/each}

				<!-- Time Slots Column -->
				{#each timeSlots as slot, i}
					<div
						class="p-1 text-xs text-muted-foreground border-r text-center {i % 2 === 0
							? 'border-t'
							: ''}"
						style="grid-row: {i + 2}; grid-column: 1;"
					>
						{i % 2 === 0 ? slot : ''}
					</div>
				{/each}

				<!-- Schedule Cells -->
				{#each days as day, col}
					<div
						class="relative border-r"
						style="grid-column: {col + 2}; grid-row: 2 / span {timeSlots.length};"
					>
						<!-- Dashed lines for 30-min intervals -->
						{#each timeSlots as slot, i}
							<div class="h-[40px] {i % 2 === 0 ? 'border-t' : 'border-t border-dashed'}"></div>
						{/each}

						<!-- Scheduled Items -->
						{#each getItemsForSlot(day, '00:00') as item (item.id)}
							<!-- This is a placeholder, a full implementation would check *all* slots -->
						{/each}

						<!-- Corrected: Loop over all items for the day and position them -->
						{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
							{@const startRow = timeSlots.indexOf(item.start_time.substring(0, 5)) + 1}
							{@const rowSpan = calculateRowSpan(item.start_time, item.end_time, timeInterval)}
							{#if startRow > 0}
								<div
									class="absolute w-full px-1"
									style="grid-row: {startRow} / span {rowSpan}; top: {(startRow - 1) *
										40}px; height: {rowSpan * 40 - 2}px;"
								>
									<div
										class="h-full w-full bg-primary/75 border-l-4 border-primary text-primary-foreground p-1.5 rounded-md text-left text-[10px] leading-tight overflow-hidden"
									>
										{#if viewBy === 'room'}
											<p class="font-bold text-2xl">{item.classes.subjects.subject_code}</p>
											<p>{item.classes.blocks.block_name}</p>
											<p>{item.classes.instructors?.name || 'N/A'}</p>
										{:else if viewBy === 'block'}
											<p class="font-bold">{item.classes.subjects.subject_code}</p>
											<p>{item.rooms.room_name}</p>
											<p>{item.classes.instructors?.name || 'N/A'}</p>
										{:else if viewBy === 'instructor'}
											<p class="font-bold">{item.classes.subjects.subject_code}</p>
											<p>{item.classes.blocks.block_name}</p>
											<p>{item.rooms.room_name}</p>
										{/if}
									</div>
								</div>
							{/if}
						{/each}
					</div>
				{/each}
			</div>
		</div>

		<!-- Next Button -->
		<Button variant="outline" size="icon" onclick={goToNext} disabled={listSource.length < 2}>
			<ChevronRight class="h-4 w-4" />
		</Button>
	</div>
</div>

<script lang="ts">
	import type { PageData } from './$types';

	import { generateTimeSlots } from '$lib/utils/time';

	import {
		ChevronLeft,
		ChevronRight,
		Printer,
		FileDown,
		Users,
		DoorOpen,
		User as UserIcon,
		Building
	} from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as ButtonGroup from '$lib/components/ui/button-group/';

	let { data } = $props<{ data: PageData }>();

	// --- State ---
	let viewBy = $state<'room' | 'instructor' | 'block'>('room');
	let currentItemIndex = $state(0);

	// --- Time Grid Setup ---
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	const timeInterval = 60; // 1-hour intervals
	const timeSlots = $state(generateTimeSlots('07:00', '21:00', timeInterval));
	const rowHeight = 64; // px per hour

	// --- Color Generation ---
	const colorPalette = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];

	function generateColorFromString(str: string): string {
		let hash = 0;
		for (let i = 0; i < str.length; i++) {
			hash = str.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % colorPalette.length);
		return colorPalette[index];
	}

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

	const itemClassCounts = $derived.by(() => {
		const counts: Record<string, Set<number>> = {};
		
		// Initialize sets for all known entities to ensure 0 counts are handled if needed, 
		// though the current logic handles missing keys gracefully.
		
		data.schedules.forEach((s) => {
			const classId = s.classes.id;

			// Count for rooms
			if (s.room_id) {
				const key = s.room_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(classId);
			}
			// Count for instructors
			if (s.classes.instructor_id) {
				const key = s.classes.instructor_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(classId);
			}
			// Count for blocks
			if (s.classes.block_id) {
				const key = s.classes.block_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(classId);
			}
		});

		// Convert Sets to counts
		const result: Record<string, number> = {};
		for (const [key, set] of Object.entries(counts)) {
			result[key] = set.size;
		}
		return result;
	});

	// --- Navigation ---
	function goToNext() {
		if (listSource.length === 0) return;
		currentItemIndex = (currentItemIndex + 1) % listSource.length;
	}
	function goToPrev() {
		if (listSource.length === 0) return;
		currentItemIndex = (currentItemIndex - 1 + listSource.length) % listSource.length;
	}

	$effect(() => {
		// Reset index when view changes
		currentItemIndex = 0;
	});

	// --- View Mode ---
	let viewMode: 'grid' | 'transposed' | 'agenda' | 'list' = $state('grid');
	let listSearch = $state('');
	let reportOpen = $state(false);

	const listFilteredSchedule = $derived.by(() => {
		let items = data.schedules;
		if (listSearch.trim() !== '') {
			const q = listSearch.toLowerCase();
			items = items.filter(
				(s) =>
					s.classes.subjects.subject_name.toLowerCase().includes(q) ||
					s.classes.subjects.subject_code.toLowerCase().includes(q) ||
					s.classes.blocks.block_name.toLowerCase().includes(q) ||
					s.classes.instructors?.name.toLowerCase().includes(q) ||
					s.rooms.room_name.toLowerCase().includes(q)
			);
		}
		// Sort by Day then Time
		return items.sort((a, b) => {
			const dayDiff = days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
			if (dayDiff !== 0) return dayDiff;
			return a.start_time.localeCompare(b.start_time);
		});
	});

	// --- Report Data ---
	const report = $derived(data.timetable.metadata as any);

	// Type assertion for now
</script>

<!-- Report Dialog -->

<Dialog.Root bind:open={reportOpen}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Generation Report</Dialog.Title>
			<Dialog.Description>Statistics and details from the last generation run.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			{#if report.status == 'Generating'}
				<div class="flex flex-col items-center justify-center py-8 space-y-4">
					<div class="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
					<p class="text-muted-foreground">Generation in progress...</p>
				</div>
			{:else}
				<div class="grid grid-cols-2 gap-4">
					<div class="p-4 border rounded-lg bg-muted/50">
						<p class="text-sm text-muted-foreground">Success Rate</p>
						<p
							class="text-2xl font-bold {report.successRate === 100
								? 'text-green-600'
								: 'text-amber-600'}"
						>
							{report.successRate}%
						</p>
						<p class="text-xs text-muted-foreground">
							{report.scheduledCount} / {report.totalClasses} classes
						</p>
					</div>
					<div class="p-4 border rounded-lg bg-muted/50">
						<p class="text-sm text-muted-foreground">Execution Time</p>
						<p class="text-2xl font-bold">{report.timeTakenSec}</p>
					</div>
				</div>

				{#if report.failedClasses && report.failedClasses.length > 0}
					<div class="border rounded-lg p-4 border-destructive/20 bg-destructive/5">
						<h3 class="font-semibold text-destructive mb-2">
							Failed Classes ({report.failedClasses.length})
						</h3>
						<div class="max-h-[200px] overflow-y-auto space-y-2">
							{#each report.failedClasses as fail}
								<div class="text-sm border-b last:border-0 pb-2 last:pb-0 border-destructive/10">
									<span class="font-medium">{fail.class}</span>:
									<span class="text-muted-foreground">{fail.reason}</span>
								</div>
							{/each}
						</div>
					</div>
				{:else}
					<Card.Root>
						<Card.Content>
							<p class="font-medium">All classes scheduled successfully! 🎉</p>
						</Card.Content>
					</Card.Root>
				{/if}
				<Separator />
				<div class="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 mt-4 pt-4">
					<p>
						<span class="font-semibold">Algorithm:</span>
						{report.generation_params?.algorithm.charAt(0).toUpperCase() +
							report.generation_params?.algorithm.slice(1) ||
							report.algorithm.charAt(0).toUpperCase() +
								report.generation_params?.algorithm.slice(1) ||
							'N/A'}
					</p>
					<p><span class="font-semibold">Rooms Used:</span> {report.roomsUsed}</p>
					<p>
						<span class="font-semibold">Academic Year:</span>
						{report.generation_params?.academic_year || 'N/A'}
					</p>
					<p>
						<span class="font-semibold">Semester:</span>
						{report.generation_params?.semester || 'N/A'}
					</p>
					<p>
						<span class="font-semibold">Time Range:</span>
						{report.generation_params?.scheduleStartTime || 'N/A'} - {report.generation_params
							?.scheduleEndTime || 'N/A'}
					</p>
					<p>
						<span class="font-semibold">Break Time:</span>
						{report.generation_params?.breakTime || 'None'}
					</p>
				</div>

				{#if report.generation_params?.constraints}
					<div class="mt-4 pt-4 border-t">
						<h4 class="text-sm font-semibold mb-2">Constraints Applied</h4>
						<div class="flex flex-wrap gap-2">
							{#if report.generation_params.constraints.enforceCapacity}
								<Badge variant="outline">Capacity Check</Badge>
							{/if}
							{#if report.generation_params.constraints.enforceInstructor}
								<Badge variant="outline">Instructor Conflict</Badge>
							{/if}
							{#if report.generation_params.constraints.enforceBlock}
								<Badge variant="outline">Block Conflict</Badge>
							{/if}
							{#if report.generation_params.constraints.roomTypeConstraint === 'strict'}
								<Badge variant="outline">Strict Room Type</Badge>
							{:else if report.generation_params.constraints.roomTypeConstraint === 'soft'}
								<Badge variant="outline">Soft Room Type</Badge>
							{/if}
							{#if report.generation_params.constraints.excludedDays?.length > 0}
								<Badge variant="destructive">
									Excluded Days: {report.generation_params.constraints.excludedDays.join(', ')}
								</Badge>
							{/if}
						</div>
					</div>
				{/if}
			{/if}
		</div>
		<Dialog.Footer>
			<Dialog.Close>
				<Button variant="outline">Close</Button>
			</Dialog.Close>
		</Dialog.Footer>
	</Dialog.Content>

	<!-- Trigger is handled via the button below, but we need to wrap the button or use open state -->
	<!-- Actually, shadcn Dialog usually wraps the trigger. Let's adjust the button below to be the trigger. -->
</Dialog.Root>

<div class="h-full flex flex-col">
	<!-- Sticky Header -->
	<div
		class="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-2 border-b"
	>
		<!-- Breadcrumb navigation removed as there is already such navigation on site-header.svelte -->

		<!-- Header & Controls -->
		<header class="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div class="flex items-center gap-4">
				<Button variant="outline" size="icon" class="shrink-0" href="/menu/timetables/view">
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<div>
					<h1 class="text-xl font-bold tracking-tight">{data.timetable.name}</h1>
					<p class="text-xs text-muted-foreground mt-0.5">
						{data.timetable.academic_year}, {data.timetable.semester}
					</p>
				</div>
			</div>
			<div class="flex items-center gap-2">
				<!-- Report Button -->
				{#if data.timetable.metadata}
					<Button
						variant="outline"
						size="sm"
						class={report?.failedClasses?.length > 0
							? 'text-amber-600 border-amber-200 hover:bg-amber-50'
							: ''}
						onclick={() => (reportOpen = true)}
					>
						{#if report?.failedClasses?.length > 0}
							<span class="mr-2">⚠️</span>
						{/if}
						Report
					</Button>
				{/if}

				<!-- View Mode Toggle -->
				<div class="flex items-center border rounded-md p-1 mr-2">
					<Button
						variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-2"
						onclick={() => (viewMode = 'grid')}
					>
						Grid
					</Button>
					<Button
						variant={viewMode === 'transposed' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-2"
						onclick={() => (viewMode = 'transposed')}
					>
						Timeline
					</Button>
					<Button
						variant={viewMode === 'agenda' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-2"
						onclick={() => (viewMode = 'agenda')}
					>
						Agenda
					</Button>
					<Button
						variant={viewMode === 'list' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-2"
						onclick={() => (viewMode = 'list')}
					>
						List
					</Button>
				</div>

				{#if viewMode === 'grid' || viewMode === 'transposed'}
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

					<!-- Dynamic "Jump To" Filter -->
					<Select.Root
						type="single"
						value={currentItem?.id.toString()}
						onValueChange={(v) => {
							if (!v) return;
							const newIndex = listSource.findIndex((item) => item.id.toString() === v);
							if (newIndex !== -1) {
								currentItemIndex = newIndex;
							}
						}}
					>
						<Select.Trigger class="w-[250px]">
							<span class="truncate">{gridHeader.title || 'Select an item'}</span>
						</Select.Trigger>
						<Select.Content>
							{#if listSource.length === 0}
								<p class="p-2 text-sm text-muted-foreground text-center">No items to display</p>
							{:else if viewBy === 'room'}
								{#each listSource as room}
									<Select.Item value={room.id.toString()} class="flex items-center justify-between">
										<span>{room.room_name}</span>
										<Badge variant="secondary"
											>{itemClassCounts[room.id.toString()] || 0} Classes</Badge
										>
									</Select.Item>
								{/each}
							{:else if viewBy === 'instructor'}
								{#each listSource as instructor}
									<Select.Item
										value={instructor.id.toString()}
										class="flex items-center justify-between"
									>
										<span>{instructor.name}</span>
										<Badge variant="secondary"
											>{itemClassCounts[instructor.id.toString()] || 0} Classes</Badge
										>
									</Select.Item>
								{/each}
							{:else if viewBy === 'block'}
								{#each listSource as block}
									<Select.Item
										value={block.id.toString()}
										class="flex items-center justify-between"
									>
										<span>{block.block_name}</span>
										<Badge variant="secondary"
											>{itemClassCounts[block.id.toString()] || 0} Classes</Badge
										>
									</Select.Item>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				{:else}
					<!-- List View Search -->
					<input
						type="text"
						placeholder="Search..."
						class="flex h-10 w-[250px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
						bind:value={listSearch}
					/>
				{/if}
				<ButtonGroup.Root>
					<Button variant="outline" class="ml-auto"
						><Printer class="mr-2 h-4 w-4" />Print / PDF</Button
					>
					<Button variant="outline"><FileDown class="mr-2 h-4 w-4" />Export</Button>
				</ButtonGroup.Root>
			</div>
		</header>
	</div>

	<!-- Scrollable Main Content -->
	<div class="flex-1 overflow-y-auto py-6">
		{#if viewMode === 'grid'}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between p-2">
					<div class="flex items-center gap-3">
						{#if gridHeader.icon}
							<svelte:component this={gridHeader.icon} class="h-5 w-5 text-muted-foreground" />
						{/if}
						<div>
							<h2 class="text-lg font-semibold">{gridHeader.title || 'Select a view'}</h2>
							<p class="text-xs text-muted-foreground">{gridHeader.subtitle}</p>
						</div>
						{#if gridHeader.badge}
							<Badge variant="outline" class="ml-2">{gridHeader.badge}</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8"
							onclick={goToPrev}
							disabled={listSource.length < 2}
						>
							<ChevronLeft class="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8"
							onclick={goToNext}
							disabled={listSource.length < 2}
						>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0">
					<div class="border-t overflow-x-auto">
						<div
							class="grid min-w-[800px]"
							style="grid-template-columns: 60px repeat(5, 1fr); grid-template-rows: auto repeat({timeSlots.length}, {rowHeight}px);"
						>
							<!-- Time Header -->
							<div
								class="sticky left-0 z-10 p-2 border-r border-b bg-background font-medium text-sm"
							>
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
									class="sticky left-0 p-1 text-xs text-muted-foreground border-r bg-background text-center border-t"
									style="grid-row: {i + 2}; grid-column: 1;"
								>
									{slot}
								</div>
							{/each}

							<!-- Schedule Cells -->
							{#each days as day, col}
								<div
									class="relative border-r"
									style="grid-column: {col + 2}; grid-row: 2 / span {timeSlots.length};"
								>
									<!-- Horizontal lines for 1-hour intervals -->
									{#each timeSlots as slot, i}
										<div class="h-[{rowHeight}px] border-t border-border/50"></div>
									{/each}

									<!-- Scheduled Items -->
									{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
										{@const [startH, startM] = item.start_time.split(':').map(Number)}
										{@const [endH, endM] = item.end_time.split(':').map(Number)}
										{@const startMinutes = (startH - 7) * 60 + startM}
										{@const durationMinutes = endH * 60 + endM - (startH * 60 + startM)}
										{@const top = (startMinutes / 60) * rowHeight}
										{@const height = (durationMinutes / 60) * rowHeight}
										{@const colorVar = generateColorFromString(item.classes.subjects.subject_code)}

										<div class="absolute w-full px-1" style="top: {top}px; height: {height - 2}px;">
											<div
												class="h-full w-full border-l-4 p-1.5 rounded-md text-left leading-tight overflow-hidden transition-colors hover:brightness-95"
												style="
														background-color: oklch(from var({colorVar}) l c h / 0.25);
														border-left-color: var({colorVar});
														color: oklch(from var({colorVar}) var(--cell-fg-l) c h);
													"
											>
												<div class="flex justify-between items-start">
													<p class="font-bold text-xs truncate">
														{item.classes.subjects.subject_code} - {item.classes.subjects
															.subject_name}
													</p>
													{#if item.course_type === 'Lecture'}
														<Badge variant="default" class="text-[9px] h-4 px-1 ml-1 shrink-0">
															Lec
														</Badge>
													{:else}
														<Badge variant="destructive" class="text-[9px] h-4 px-1 ml-1 shrink-0">
															Lab
														</Badge>
													{/if}
												</div>
												<p class="text-[10px] opacity-80"></p>

												<div class="text-xs mt-1 space-y-0.5">
													{#if viewBy !== 'block'}
														<p class="truncate">{item.classes.blocks.block_name}</p>
													{/if}
													{#if viewBy !== 'instructor'}
														<p class="truncate">{item.classes.instructors?.name || 'N/A'}</p>
													{/if}
													{#if viewBy !== 'room'}
														<p class="truncate">{item.rooms.room_name}</p>
													{/if}
												</div>
											</div>
										</div>
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if viewMode === 'transposed'}
			<!-- Transposed Timeline View -->
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between p-2">
					<div class="flex items-center gap-3">
						{#if gridHeader.icon}
							<svelte:component this={gridHeader.icon} class="h-5 w-5 text-muted-foreground" />
						{/if}
						<div>
							<h2 class="text-lg font-semibold">{gridHeader.title || 'Select a view'}</h2>
							<p class="text-xs text-muted-foreground">{gridHeader.subtitle}</p>
						</div>
						{#if gridHeader.badge}
							<Badge variant="outline" class="ml-2">{gridHeader.badge}</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8"
							onclick={goToPrev}
							disabled={listSource.length < 2}
						>
							<ChevronLeft class="h-4 w-4" />
						</Button>
						<Button
							variant="outline"
							size="icon"
							class="h-8 w-8"
							onclick={goToNext}
							disabled={listSource.length < 2}
						>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0">
					<div class="border-t overflow-x-auto">
						<div class="min-w-[1000px]">
							<!-- Header Row (Times) -->
							<div class="flex border-b bg-muted/30">
								<div class="w-32 shrink-0 p-3 font-medium text-sm border-r bg-muted/50">Day</div>
								{#each timeSlots as time}
									<div
										class="flex-1 p-2 text-xs text-center border-r last:border-0 text-muted-foreground"
									>
										{time}
									</div>
								{/each}
							</div>

							<!-- Day Rows -->
							{#each days as day}
								<div class="flex border-b last:border-0 h-24 relative group hover:bg-muted/5">
									<div
										class="w-32 shrink-0 p-3 font-medium text-sm border-r bg-muted/10 flex items-center"
									>
										{day}
									</div>
									<div class="flex-1 relative">
										<!-- Grid Lines -->
										<div class="absolute inset-0 flex pointer-events-none">
											{#each timeSlots as _}
												<div
													class="flex-1 border-r last:border-0 border-dashed border-border/30"
												></div>
											{/each}
										</div>

										<!-- Items -->
										{#each filteredSchedule.filter((s) => s.day_of_week === day) as item}
											{@const [startH, startM] = item.start_time.split(':').map(Number)}
											{@const [endH, endM] = item.end_time.split(':').map(Number)}
											{@const startMinutes = (startH - 7) * 60 + startM}
											{@const durationMinutes = endH * 60 + endM - (startH * 60 + startM)}
											{@const totalMinutes = (21 - 7) * 60}
											{@const colorVar = generateColorFromString(
												item.classes.subjects.subject_code
											)}

											<div
												class="absolute top-2 bottom-2 rounded-md p-2 text-xs border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
												style="
                                                    left: {(startMinutes / totalMinutes) * 100}%;
                                                    width: {(durationMinutes / totalMinutes) *
													100}%;
                                                    background-color: oklch(from var({colorVar}) l c h / 0.25);
                                                    border-left-color: var({colorVar});
                                                    color: oklch(from var({colorVar}) var(--cell-fg-l) c h);
                                                "
											>
												<div class="font-bold truncate">{item.classes.subjects.subject_code}</div>
												<div class="opacity-80 truncate">{item.rooms.room_name}</div>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else if viewMode === 'agenda'}
			<!-- Grouped Agenda View -->
			<div class="grid grid-cols-1 md:grid-cols-2 gap-6">
				{#each days as day}
					{@const dayItems = listFilteredSchedule.filter((s) => s.day_of_week === day)}
					{#if dayItems.length > 0}
						<Card.Root class="overflow-hidden">
							<Card.Header class="bg-muted/30 py-3 px-4 border-b">
								<h3 class="font-semibold flex items-center gap-2">
									{day}
								</h3>
							</Card.Header>
							<Card.Content class="p-0">
								<div class="divide-y">
									{#each dayItems as item}
										{@const colorVar = generateColorFromString(item.classes.subjects.subject_code)}
										<div class="p-4 flex gap-4 hover:bg-muted/20 transition-colors">
											<div class="flex flex-col items-center justify-center w-16 shrink-0">
												<span class="text-sm font-bold">{item.start_time.substring(0, 5)}</span>
												<div class="h-8 w-0.5 bg-border my-1"></div>
												<span class="text-xs text-muted-foreground"
													>{item.end_time.substring(0, 5)}</span
												>
											</div>
											<div class="flex-1 space-y-1">
												<div class="flex items-start justify-between">
													<h4 class="font-semibold text-sm">
														{item.classes.subjects.subject_name}
													</h4>
													{#if item.course_type === 'Lecture'}
														<Badge variant="default" class="text-[10px] h-5 px-1 ml-1 shrink-0">
															Lec
														</Badge>
													{:else}
														<Badge variant="destructive" class="text-[10px] h-5 px-1 ml-1 shrink-0">
															Lab
														</Badge>
													{/if}
												</div>

												<div class="flex items-center gap-4 text-xs text-muted-foreground">
													<span class="flex items-center gap-1">
														<Building class="h-3 w-3" />
														{item.rooms.room_name}
													</span>
													<span class="flex items-center gap-1">
														<UserIcon class="h-3 w-3" />
														{item.classes.instructors?.name || 'Unassigned'}
													</span>
													<span class="flex items-center gap-1">
														<Users class="h-3 w-3" />
														{item.classes.blocks.block_name}
													</span>
												</div>
											</div>
										</div>
									{/each}
								</div>
							</Card.Content>
						</Card.Root>
					{/if}
				{/each}
			</div>
		{:else}
			<!-- List View -->
			<Card.Root>
				<Card.Content class="p-0">
					<div class="rounded-md border">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head class="w-[300px]">Subject</Table.Head>
									<Table.Head>Type</Table.Head>
									<Table.Head>Block</Table.Head>
									<Table.Head>Instructor</Table.Head>
									<Table.Head>Room</Table.Head>
									<Table.Head>Day</Table.Head>
									<Table.Head class="text-right">Time</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#each listFilteredSchedule as item}
									<Table.Row>
										<Table.Cell class="font-medium">
											<div>{item.classes.subjects.subject_name}</div>
											<div class="text-xs text-muted-foreground hover:text-primary">
												{item.classes.subjects.subject_code}
											</div>
										</Table.Cell>
										<Table.Cell>
											<Badge
												variant={item.course_type === 'Lecture' ? 'default' : 'destructive'}
												class="text-xs"
											>
												{item.course_type}
											</Badge>
										</Table.Cell>
										<Table.Cell>{item.classes.blocks.block_name}</Table.Cell>
										<Table.Cell>{item.classes.instructors?.name || 'Unassigned'}</Table.Cell>
										<Table.Cell>{item.rooms.room_name}</Table.Cell>
										<Table.Cell>{item.day_of_week}</Table.Cell>
										<Table.Cell class="text-right">
											{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
										</Table.Cell>
									</Table.Row>
								{/each}
								{#if listFilteredSchedule.length === 0}
									<Table.Row>
										<Table.Cell colspan={7} class="h-24 text-center">
											No schedule entries found.
										</Table.Cell>
									</Table.Row>
								{/if}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

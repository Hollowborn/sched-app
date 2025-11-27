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
		Building
	} from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';

	let { data } = $props<{ data: PageData }>();

	// --- State ---
	let viewBy = $state<'room' | 'instructor' | 'block'>('room');
	let currentItemIndex = $state(0);

	// --- Time Grid Setup ---
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'];
	const timeInterval = 30; // 30-minute intervals
	const timeSlots = $state(generateTimeSlots('07:00', '21:00', timeInterval));

	// --- Color Generation ---
	const colorPalette = [
		'bg-red-100 border-red-500',
		'bg-blue-100 border-blue-500',
		'bg-green-100 border-green-500',
		'bg-yellow-100 border-yellow-500',
		'bg-purple-100 border-purple-500',
		'bg-pink-100 border-pink-500',
		'bg-indigo-100 border-indigo-500',
		'bg-teal-100 border-teal-500'
	];

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
		const counts: Record<string, number> = {};
		data.schedules.forEach((s) => {
			// Count for rooms
			if (s.room_id) {
				counts[s.room_id.toString()] = (counts[s.room_id.toString()] || 0) + 1;
			}
			// Count for instructors
			if (s.classes.instructor_id) {
				counts[s.classes.instructor_id.toString()] =
					(counts[s.classes.instructor_id.toString()] || 0) + 1;
			}
			// Count for blocks
			if (s.classes.block_id) {
				counts[s.classes.block_id.toString()] = (counts[s.classes.block_id.toString()] || 0) + 1;
			}
		});
		return counts;
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
	let viewMode: 'grid' | 'list' = $state('grid');
	let listSearch = $state('');

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
</script>

<div class="h-full flex flex-col">
	<!-- Sticky Header -->
	<div
		class="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 pt-6 pb-4"
	>
		<!-- Breadcrumb Navigation -->
		<nav class="flex items-center space-x-1 text-sm text-muted-foreground mb-4">
			<a href="/menu/timetables" class="hover:text-foreground transition-colors">Timetables</a>
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
						variant={viewMode === 'list' ? 'secondary' : 'ghost'}
						size="sm"
						class="h-8 px-2"
						onclick={() => (viewMode = 'list')}
					>
						List
					</Button>
				</div>

				{#if viewMode === 'grid'}
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
									<Select.Item value={block.id.toString()} class="flex items-center justify-between">
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

				<Button variant="outline" class="ml-auto"
					><Printer class="mr-2 h-4 w-4" />Print / PDF</Button
				>
				<Button variant="outline"><FileDown class="mr-2 h-4 w-4" />Export</Button>
			</div>
		</header>
	</div>

	<!-- Scrollable Main Content -->
	<div class="flex-1 overflow-y-auto py-6">
		{#if viewMode === 'grid'}
			<Card.Root>
				<Card.Header class="flex flex-row items-center justify-between p-4">
					<div class="flex items-center gap-3">
						{#if gridHeader.icon}
							<svelte:component this={gridHeader.icon} class="h-6 w-6 text-muted-foreground" />
						{/if}
						<div>
							<h2 class="text-xl font-semibold">{gridHeader.title || 'Select a view'}</h2>
							<p class="text-muted-foreground">{gridHeader.subtitle}</p>
						</div>
						{#if gridHeader.badge}
							<Badge variant="outline" class="ml-2">{gridHeader.badge}</Badge>
						{/if}
					</div>
					<div class="flex items-center gap-2">
						<Button variant="outline" size="icon" onclick={goToPrev} disabled={listSource.length < 2}>
							<ChevronLeft class="h-4 w-4" />
						</Button>
						<Button variant="outline" size="icon" onclick={goToNext} disabled={listSource.length < 2}>
							<ChevronRight class="h-4 w-4" />
						</Button>
					</div>
				</Card.Header>
				<Card.Content class="p-0">
					<div class="border-t overflow-x-auto">
						<div
							class="grid min-w-[800px]"
							style="grid-template-columns: 60px repeat(5, 1fr); grid-template-rows: auto repeat({timeSlots.length}, 40px);"
						>
							<!-- Time Header -->
							<div class="sticky left-0 z-10 p-2 border-r border-b bg-background font-medium text-sm">
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
									class="sticky left-0 p-1 text-xs text-muted-foreground border-r bg-background text-center {i %
										2 ===
									0
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
									{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
										{@const startRow = timeSlots.indexOf(item.start_time.substring(0, 5)) + 1}
										{@const rowSpan = calculateRowSpan(item.start_time, item.end_time, timeInterval)}
										{@const colorClass = generateColorFromString(item.classes.subjects.subject_code)}

										{#if startRow > 0}
											<div
												class="absolute w-full px-1"
												style="top: {(startRow - 1) * 40}px; height: {rowSpan * 40 - 2}px;"
											>
												<div
													class="h-full w-full border-l-4 p-1.5 rounded-md text-left leading-tight overflow-hidden dark:text-black/70 {colorClass}"
												>
													<div class="flex justify-between items-start">
														<p class="font-bold text-xs truncate">
															{item.classes.subjects.subject_name}
														</p>
														<Badge
															variant={item.course_type === 'Lecture' ? 'default' : 'destructive'}
															class="text-[9px] h-4 px-1 ml-1 shrink-0"
														>
															{item.course_type === 'Lecture' ? 'Lec' : 'Lab'}
														</Badge>
													</div>
													<p class="text-[10px] opacity-80">{item.classes.subjects.subject_code}</p>

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
										{/if}
									{/each}
								</div>
							{/each}
						</div>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<!-- List View -->
			<Card.Root>
				<Card.Content class="p-0">
					<div class="rounded-md border">
						<table class="w-full text-sm text-left">
							<thead class="bg-muted/50 text-muted-foreground font-medium">
								<tr>
									<th class="h-10 px-4 align-middle">Subject</th>
									<th class="h-10 px-4 align-middle">Type</th>
									<th class="h-10 px-4 align-middle">Block</th>
									<th class="h-10 px-4 align-middle">Instructor</th>
									<th class="h-10 px-4 align-middle">Room</th>
									<th class="h-10 px-4 align-middle">Day</th>
									<th class="h-10 px-4 align-middle">Time</th>
								</tr>
							</thead>
							<tbody>
								{#each listFilteredSchedule as item}
									<tr class="border-b hover:bg-muted/50 transition-colors">
										<td class="p-4 align-middle font-medium">
											<div>{item.classes.subjects.subject_name}</div>
											<div class="text-xs text-muted-foreground">
												{item.classes.subjects.subject_code}
											</div>
										</td>
										<td class="p-4 align-middle">
											<Badge
												variant={item.course_type === 'Lecture' ? 'default' : 'destructive'}
												class="text-xs"
											>
												{item.course_type}
											</Badge>
										</td>
										<td class="p-4 align-middle">{item.classes.blocks.block_name}</td>
										<td class="p-4 align-middle">{item.classes.instructors?.name || 'Unassigned'}</td>
										<td class="p-4 align-middle">{item.rooms.room_name}</td>
										<td class="p-4 align-middle">{item.day_of_week}</td>
										<td class="p-4 align-middle">
											{item.start_time.substring(0, 5)} - {item.end_time.substring(0, 5)}
										</td>
									</tr>
								{/each}
								{#if listFilteredSchedule.length === 0}
									<tr>
										<td colspan="7" class="p-4 text-center text-muted-foreground">
											No schedule entries found.
										</td>
									</tr>
								{/if}
							</tbody>
						</table>
					</div>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>
</div>

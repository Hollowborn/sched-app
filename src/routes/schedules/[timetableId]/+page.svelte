<script lang="ts">
	import type { PageData } from './$types';

	import { generateTimeSlots } from '$lib/utils/time';
	import { SvelteMap } from 'svelte/reactivity';

	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';

	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';

	import {
		ChevronLeft,
		ChevronRight,
		FileDown,
		Users,
		DoorOpen,
		User as UserIcon,
		Building,
		ClockFading,
		CircleCheck,
		UserCheck,
		Grid2X2Check,
		MapPinCheck,
		ChevronsUpDown,
		Check
	} from '@lucide/svelte';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Input } from '$lib/components/ui/input';
	import { cn } from '$lib/utils';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import Spinner from '$lib/components/ui/spinner/spinner.svelte';

	interface GenerationMetadata {
		status: 'Generating' | 'Completed';
		successRate: number;
		scheduledCount: number;
		totalClasses: number;
		timeTakenSec: string;
		failedClasses: { class: string; reason: string }[];
		generation_params?: {
			algorithm: string;
			academic_year: string;
			semester: string;
			scheduleStartTime: string;
			scheduleEndTime: string;
			breakTime: string;
			constraints: {
				enforceCapacity: boolean;
				enforceInstructor: boolean;
				enforceBlock: boolean;
				roomTypeConstraint: 'strict' | 'soft' | 'off';
				excludedDays: string[];
			};
		};
		roomsUsed: number;
		algorithm: string;
	}

	let { data } = $props<{ data: PageData }>();

	let viewBy = $state<'room' | 'instructor' | 'block'>('room');
	let currentItemIndex = $state(0);
	let jumpToOpen = $state(false);
	// file-saver variable for saving

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
	const itemClassCounts = $derived.by(() => {
		const counts: Record<string, Set<number>> = {};

		data.schedules.forEach((s) => {
			if (s.room_id) {
				const key = s.room_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(s.id);
			}
			if (s.classes.instructor_id) {
				const key = s.classes.instructor_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(s.id);
			}
			if (s.classes.block_id) {
				const key = s.classes.block_id.toString();
				if (!counts[key]) counts[key] = new Set();
				counts[key].add(s.id);
			}
		});

		const result: Record<string, number> = {};
		for (const [key, set] of Object.entries(counts)) {
			result[key] = set.size;
		}
		return result;
	});

	// Filters listSource to ONLY include items that actually have scheduled classes
	const listSource = $derived.by(() => {
		let items: any[] = [];
		switch (viewBy) {
			case 'room':
				items = data.uniqueRooms;
				break;
			case 'instructor':
				items = data.uniqueInstructors;
				break;
			case 'block':
				items = data.uniqueBlocks;
				break;
		}
		// Only return items with strictly greater than 0 occurrences
		return items.filter(
			(item) =>
				itemClassCounts[item.id.toString()] !== undefined && itemClassCounts[item.id.toString()] > 0
		);
	});

	// Grouping Logic for the Combobox
	const groupedItems = $derived.by(() => {
		const groups = new Map<string, any[]>();
		listSource.forEach((item) => {
			let groupName = 'Other';
			if (viewBy === 'room') {
				groupName = item.colleges?.college_name || 'General Use';
			} else if (viewBy === 'instructor') {
				groupName = item.colleges?.college_name || 'Unknown College';
			} else if (viewBy === 'block') {
				groupName = item.programs?.program_name || 'Unknown Program';
			}

			if (!groups.has(groupName)) {
				groups.set(groupName, []);
			}
			groups.get(groupName)!.push(item);
		});

		// Sort groups alphabetically, but put "General Use" or "Other" at the end if desired
		const sortedGroups = Array.from(groups.entries()).sort((a, b) => a[0].localeCompare(b[0]));
		return sortedGroups;
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
				return data.schedules.filter((s: any) => s.room_id === currentItem.id);
			case 'instructor':
				return data.schedules.filter((s: any) => s.classes.instructor_id === currentItem.id);
			case 'block':
				return data.schedules.filter((s: any) => s.classes.block_id === currentItem.id);
			default:
				return [];
		}
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
				(s: any) =>
					s.classes.subjects.subject_name.toLowerCase().includes(q) ||
					s.classes.subjects.subject_code.toLowerCase().includes(q) ||
					s.classes.blocks.block_name.toLowerCase().includes(q) ||
					(s.classes.instructors?.name || '').toLowerCase().includes(q) ||
					s.rooms.room_name.toLowerCase().includes(q)
			);
		}
		return items.sort((a: any, b: any) => {
			const dayDiff = days.indexOf(a.day_of_week) - days.indexOf(b.day_of_week);
			if (dayDiff !== 0) return dayDiff;
			return a.start_time.localeCompare(b.start_time);
		});
	});

	// --- Report Data ---
	const report = $derived(data.timetable.metadata as GenerationMetadata | null);

	// --- DataTable Columns ---
	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'classes.subjects.subject_code',
			header: 'Subject',
			cell: ({ row }) => renderSnippet(subjectCell, { row: row.original })
		},
		{
			accessorKey: 'course_type',
			header: 'Type',
			cell: ({ row }) => renderSnippet(typeCell, { type: row.original.course_type })
		},
		{
			accessorKey: 'classes.blocks.block_name',
			header: 'Block'
		},
		{
			accessorKey: 'classes.instructors.name',
			header: 'Instructor',
			cell: ({ row }) => row.original.classes.instructors?.name || 'Unassigned'
		},
		{
			accessorKey: 'rooms.room_name',
			header: 'Room'
		},
		{
			accessorKey: 'day_of_week',
			header: 'Day'
		},
		{
			id: 'time',
			header: 'Time',
			accessorFn: (row) => `${row.start_time} - ${row.end_time}`,
			cell: ({ row }) =>
				`${row.original.start_time.substring(0, 5)} - ${row.original.end_time.substring(0, 5)}`,
			meta: {
				class: 'text-right'
			}
		}
	];
</script>

{#snippet subjectCell({ row }: { row: any })}
	<div class="flex flex-col">
		<span class="font-medium">{row.classes.subjects.subject_name}</span>
		<span class="text-xs text-muted-foreground">{row.classes.subjects.subject_code}</span>
	</div>
{/snippet}

{#snippet typeCell({ type }: { type: string })}
	<Badge variant={type === 'Lecture' ? 'default' : 'destructive'} class="w-fit">
		{type}
	</Badge>
{/snippet}

<!-- Report Dialog -->
<Dialog.Root bind:open={reportOpen}>
	<Dialog.Content class="max-w-2xl max-h-[90vh] overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>Generation Report</Dialog.Title>
			<Dialog.Description>Statistics and details from the last generation run.</Dialog.Description>
		</Dialog.Header>
		<div class="space-y-4 py-4">
			{#if !report || report.status == 'Generating'}
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
						<Card.Content class="p-4">
							<p class="font-medium">All classes scheduled successfully! 🎉</p>
						</Card.Content>
					</Card.Root>
				{/if}
				<Separator />
				<div class="text-xs text-muted-foreground grid grid-cols-2 gap-x-4 gap-y-1 mt-4 pt-4">
					<p>
						<span class="font-semibold">Algorithm:</span>

						{report.algorithm.charAt(0).toUpperCase() + report.algorithm.slice(1) || 'N/A'}
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
					<Separator />
					<h4 class="text-sm font-semibold mb-2">Constraints Applied</h4>
					<div class="flex flex-wrap gap-2">
						<!-- , , ,  -->
						{#if report.generation_params.constraints.enforceCapacity}
							<Badge variant="outline">Capacity Check<CircleCheck /></Badge>
						{/if}
						{#if report.generation_params.constraints.enforceInstructor}
							<Badge variant="outline">Instructor Conflict <UserCheck /></Badge>
						{/if}
						{#if report.generation_params.constraints.enforceBlock}
							<Badge variant="outline">Block Conflict<Grid2X2Check /></Badge>
						{/if}
						{#if report.generation_params.constraints.roomTypeConstraint === 'strict'}
							<Badge variant="outline">Strict Room Type<MapPinCheck /></Badge>
						{:else if report.generation_params.constraints.roomTypeConstraint === 'soft'}
							<Badge variant="outline">Soft Room Type<MapPinCheck /></Badge>
						{/if}
						{#if report.generation_params.constraints.excludedDays?.length > 0}
							<Badge variant="destructive">
								Excluded Days: {report.generation_params.constraints.excludedDays.join(', ')}
							</Badge>
						{/if}
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
</Dialog.Root>

<div class="h-full flex flex-col p-4 md:p-8 lg:p-12 bg-muted/10 max-w-[1600px] mx-auto w-full">
	<!-- Sticky Header -->
	<div
		class="sticky top-0 z-20 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 py-4 border-b border-border/50 mb-6 px-2 md:px-4 rounded-xl shadow-sm"
	>
		<!-- Header & Controls -->
		<header class="flex flex-col gap-6">
			<div class="flex items-center justify-between">
				<div class="flex items-center gap-5">
					<Button variant="outline" size="icon" class="shrink-0 h-10 w-10 rounded-full hover:bg-muted/80 shadow-sm" href="/schedules">
						<ChevronLeft class="h-5 w-5" />
					</Button>
					<div>
						<h1 class="text-2xl md:text-3xl font-extrabold tracking-tight bg-gradient-to-br from-foreground to-muted-foreground bg-clip-text text-transparent">{data.timetable.name}</h1>
						<div class="flex items-center gap-2 mt-1.5 opacity-90">
							<Badge variant="secondary" class="font-medium rounded-md px-2 py-0.5 text-xs">{data.timetable.academic_year}</Badge>
							<span class="text-xs text-muted-foreground">•</span>
							<span class="text-xs font-medium text-muted-foreground">{data.timetable.semester}</span>
						</div>
					</div>
				</div>
			</div>

			<!-- Toolbar -->
			<div class="flex flex-col md:flex-row md:items-center justify-between gap-5 bg-card/50 p-1.5 rounded-lg">
				<!-- View Mode Switcher via Tabs -->
				<Tabs.Root bind:value={viewMode} class="w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
					<Tabs.List class="grid w-full grid-cols-4 md:w-auto h-10 min-w-[340px]">
						<Tabs.Trigger value="grid" class="text-sm">Grid</Tabs.Trigger>
						<Tabs.Trigger value="transposed" class="text-sm">Timeline</Tabs.Trigger>
						<Tabs.Trigger value="agenda" class="text-sm">Agenda</Tabs.Trigger>
						<Tabs.Trigger value="list" class="text-sm">List</Tabs.Trigger>
					</Tabs.List>
				</Tabs.Root>

				<!-- Filters (Only for non-list views) -->
				{#if viewMode !== 'list'}
					<div class="flex flex-col sm:flex-row items-center gap-3 flex-1 md:justify-end w-full md:w-auto">
						{#if viewMode === 'grid' || viewMode === 'transposed'}
							<Select.Root type="single" bind:value={viewBy}>
								<Select.Trigger class="w-full sm:w-[180px] h-10 shadow-sm bg-background">
									<span> {'View by ' + viewBy.charAt(0).toUpperCase() + viewBy.slice(1)}</span>
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="room"><DoorOpen class="mr-2 h-4 w-4" />Room</Select.Item>
									<Select.Item value="instructor"
										><UserIcon class="mr-2 h-4 w-4" />Instructor</Select.Item
									>
									<Select.Item value="block"><Users class="mr-2 h-4 w-4" />Block</Select.Item>
								</Select.Content>
							</Select.Root>

							<!-- Dynamic "Jump To" Combobox -->
							<Popover.Root bind:open={jumpToOpen}>
								<Popover.Trigger>
									{#snippet child({ props })}
										<Button
											variant="outline"
											role="combobox"
											aria-expanded={jumpToOpen}
											class="w-full sm:w-[280px] h-10 shadow-sm bg-background justify-between"
											{...props}
										>
											<span class="truncate font-medium">{gridHeader.title || 'Select an item...'}</span>
											<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
										</Button>
									{/snippet}
								</Popover.Trigger>
								<Popover.Content class="w-[280px] p-0" align="end">
									<Command.Root>
										<Command.Input placeholder={`Search ${viewBy}...`} />
										<Command.List class="max-h-[300px]">
											<Command.Empty>No items found.</Command.Empty>
											{#each groupedItems as [groupName, items]}
												<Command.Group heading={groupName}>
													{#each items as item}
														{@const itemName =
															viewBy === 'room'
																? item.room_name
																: viewBy === 'instructor'
																	? item.name
																	: item.block_name}
														<Command.Item
															value={itemName}
															onSelect={() => {
																const newIndex = listSource.findIndex((i) => i.id === item.id);
																if (newIndex !== -1) {
																	currentItemIndex = newIndex;
																}
																jumpToOpen = false;
															}}
															class="flex items-center justify-between cursor-pointer"
														>
															<div class="flex items-center gap-2 truncate">
																<Check
																	class={cn(
																		'h-4 w-4 shrink-0',
																		currentItem?.id === item.id ? 'opacity-100 text-primary' : 'opacity-0'
																	)}
																/>
																<span class="truncate">{itemName}</span>
															</div>
															<Badge
																variant="secondary"
																class="font-mono text-[10px] ml-2 shrink-0 bg-muted/50"
															>
																{itemClassCounts[item.id.toString()]}
															</Badge>
														</Command.Item>
													{/each}
												</Command.Group>
											{/each}
										</Command.List>
									</Command.Root>
								</Popover.Content>
							</Popover.Root>
						{:else}
							<!-- Agenda View Search -->
							<div class="relative w-full sm:w-[320px]">
								<ClockFading class="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
								<Input
									type="text"
									placeholder="Search agenda..."
									class="pl-9 h-10 shadow-sm bg-background transition-shadow focus-visible:ring-1"
									bind:value={listSearch}
								/>
							</div>
						{/if}
					</div>
				{/if}
			</div>
		</header>
	</div>

	<!-- Scrollable Main Content -->
	<div class="flex-1 overflow-y-auto py-6">
		{#if viewMode === 'grid'}
			<div id="grid-view-content">
				<Card.Root class="shadow-sm border-border/50 overflow-hidden">
					<Card.Header class="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:px-8 border-b bg-card/50">
						<div class="flex items-center gap-4 mb-3 sm:mb-0">
							{#if gridHeader.icon}
								<div class="p-2.5 bg-primary/10 rounded-lg shrink-0">
									<svelte:component this={gridHeader.icon} class="h-6 w-6 text-primary" />
								</div>
							{/if}
							<div class="min-w-0">
								<h2 class="text-xl font-bold truncate">{gridHeader.title || 'Select a view'}</h2>
								<div class="flex items-center mt-1">
									<p class="text-sm font-medium text-muted-foreground truncate">{gridHeader.subtitle}</p>
									{#if gridHeader.badge}
										<span class="mx-2 text-muted-foreground">•</span>
										<Badge variant="secondary" class="font-normal rounded-sm text-xs px-1.5 py-0">{gridHeader.badge}</Badge>
									{/if}
								</div>
							</div>
						</div>
						<div class="flex items-center justify-end gap-2 isolate">
							<Button
								variant="outline"
								size="icon"
								class="h-9 w-9 shadow-sm"
								onclick={goToPrev}
								disabled={listSource.length < 2}
							>
								<ChevronLeft class="h-5 w-5" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="h-9 w-9 shadow-sm"
								onclick={goToNext}
								disabled={listSource.length < 2}
							>
								<ChevronRight class="h-5 w-5" />
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="p-0 bg-background">
						<div class="border-t overflow-x-auto">
							<div
								class="grid min-w-[800px]"
								style="grid-template-columns: 60px repeat(5, 1fr); grid-template-rows: auto repeat({timeSlots.length}, {rowHeight}px);"
							>
								<!-- Time Header -->
								<div
									class="sticky left-0 z-10 p-2 text-center border-r border-b bg-muted/10 font-medium text-sm"
								>
									Time
								</div>
								<!-- Day Headers -->
								{#each days as day (day)}
									<div
										class="sticky top-0 z-10 p-2 border-r border-b bg-muted/10 font-medium text-sm text-center"
									>
										{day}
									</div>
								{/each}

								<!-- Time Slots Column -->
								{#each timeSlots as slot, i (slot)}
									<div
										class="sticky left-0 p-1 text-xs text-muted-foreground border-r bg-muted/10 text-center border-t"
										style="grid-row: {i + 2}; grid-column: 1;"
									>
										{slot}
									</div>
								{/each}

								<!-- Schedule Cells -->
								{#each days as day, col (day)}
									<div
										class="relative border-r"
										style="grid-column: {col + 2}; grid-row: 2 / span {timeSlots.length};"
									>
										<!-- Horizontal lines for 1-hour intervals -->
										{#each timeSlots as _, i (i)}
											<div style="height: {rowHeight}px" class="border-t border-border/50"></div>
										{/each}

										<!-- Scheduled Items -->
										{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
											{@const [startH, startM] = item.start_time.split(':').map(Number)}
											{@const [endH, endM] = item.end_time.split(':').map(Number)}
											{@const startMinutes = (startH - 7) * 60 + startM}
											{@const durationMinutes = endH * 60 + endM - (startH * 60 + startM)}
											{@const top = (startMinutes / 60) * rowHeight}
											{@const height = (durationMinutes / 60) * rowHeight}
											{@const colorVar = generateColorFromString(
												item.classes.subjects.subject_code
											)}

											<div
												class="absolute w-full px-1"
												style="top: {top}px; height: {height - 2}px;"
											>
												<div
													class="schedule-item-cell h-full w-full border-l-4 p-1.5 rounded-md text-left leading-tight overflow-hidden transition-colors hover:brightness-95"
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
															<Badge
																variant="destructive"
																class="text-[9px] h-4 px-1 ml-1 shrink-0"
															>
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
															<p class="truncate">
																{item.classes.instructors?.name || 'N/A'}
															</p>
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
			</div>
		{:else if viewMode === 'transposed'}
			<!-- Transposed Timeline View -->
			<div id="transposed-view-content">
				<Card.Root class="shadow-sm border-border/50 overflow-hidden">
					<Card.Header class="flex flex-col sm:flex-row sm:items-center justify-between p-4 md:px-8 border-b bg-card/50">
						<div class="flex items-center gap-4 mb-3 sm:mb-0">
							{#if gridHeader.icon}
								<div class="p-2.5 bg-primary/10 rounded-lg shrink-0">
									<svelte:component this={gridHeader.icon} class="h-6 w-6 text-primary" />
								</div>
							{/if}
							<div class="min-w-0">
								<h2 class="text-xl font-bold truncate">{gridHeader.title || 'Select a view'}</h2>
								<div class="flex items-center mt-1">
									<p class="text-sm font-medium text-muted-foreground truncate">{gridHeader.subtitle}</p>
									{#if gridHeader.badge}
										<span class="mx-2 text-muted-foreground">•</span>
										<Badge variant="secondary" class="font-normal rounded-sm text-xs px-1.5 py-0">{gridHeader.badge}</Badge>
									{/if}
								</div>
							</div>
						</div>
						<div class="flex items-center justify-end gap-2 isolate">
							<Button
								variant="outline"
								size="icon"
								class="h-9 w-9 shadow-sm"
								onclick={goToPrev}
								disabled={listSource.length < 2}
							>
								<ChevronLeft class="h-5 w-5" />
							</Button>
							<Button
								variant="outline"
								size="icon"
								class="h-9 w-9 shadow-sm"
								onclick={goToNext}
								disabled={listSource.length < 2}
							>
								<ChevronRight class="h-5 w-5" />
							</Button>
						</div>
					</Card.Header>
					<Card.Content class="p-0 bg-background">
						<div class="border-t overflow-x-auto">
							<div class="min-w-[1000px]">
								<!-- Header Row (Times) -->
								<div class="flex border-b bg-muted/30">
									<div class="w-32 shrink-0 p-3 font-medium text-sm border-r bg-muted/50">Day</div>
									{#each timeSlots as time (time)}
										<div
											class="flex-1 p-2 text-xs text-center border-r last:border-0 text-muted-foreground"
										>
											{time}
										</div>
									{/each}
								</div>

								<!-- Day Rows -->
								{#each days as day (day)}
									<div class="flex border-b last:border-0 h-24 relative group hover:bg-muted/5">
										<div
											class="w-32 shrink-0 p-3 font-medium text-sm border-r bg-muted/10 flex items-center"
										>
											{day}
										</div>
										<div class="flex-1 relative">
											<!-- Grid Lines -->
											<div class="absolute inset-0 flex pointer-events-none">
												{#each timeSlots as _, i (i)}
													<div
														class="flex-1 border-r last:border-0 border-dashed border-border/30"
													></div>
												{/each}
											</div>

											<!-- Items -->
											{#each filteredSchedule.filter((s) => s.day_of_week === day) as item (item.id)}
												{@const [startH, startM] = item.start_time.split(':').map(Number)}
												{@const [endH, endM] = item.end_time.split(':').map(Number)}
												{@const startMinutes = (startH - 7) * 60 + startM}
												{@const durationMinutes = endH * 60 + endM - (startH * 60 + startM)}
												{@const totalMinutes = (21 - 7) * 60}
												{@const colorVar = generateColorFromString(
													item.classes.subjects.subject_code
												)}

												<div
													class="schedule-item-cell absolute top-2 bottom-2 rounded-md p-2 text-xs border-l-4 shadow-sm hover:shadow-md transition-all cursor-pointer overflow-hidden"
													style="
                                                    left: {(startMinutes / totalMinutes) * 100}%;
                                                    width: {(durationMinutes / totalMinutes) *
														100}%;
                                                    background-color: oklch(from var({colorVar}) l c h / 0.25);
                                                    border-left-color: var({colorVar});
                                                    color: oklch(from var({colorVar}) var(--cell-fg-l) c h);
                                                "
												>
													<div class="font-bold truncate">
														{item.classes.subjects.subject_code}
													</div>
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
			</div>
		{:else if viewMode === 'agenda'}
			<!-- Grouped Agenda View -->
			<div id="agenda-view-content" class="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
				{#each days as day (day)}
					{@const dayItems = listFilteredSchedule.filter((s: any) => s.day_of_week === day)}
					{#if dayItems.length > 0}
						<Card.Root class="overflow-hidden shadow-sm hover:shadow-md transition-shadow">
							<Card.Header class="py-4 px-5 border-b bg-card/50">
								<h3 class="font-bold flex items-center justify-between text-lg text-foreground/90">
									{day}
									<Badge variant="secondary" class="rounded-full px-2 py-0.5">{dayItems.length}</Badge>
								</h3>
							</Card.Header>
							<Card.Content class="p-0 bg-background">
								<div class="flex flex-col">
									{#each dayItems as item, idx (item.id)}
										{#if idx > 0}<Separator />{/if}
										<div class="p-5 flex gap-5 hover:bg-muted/10 transition-colors">
											<div class="flex flex-col items-center justify-center w-16 shrink-0 bg-muted/20 rounded-lg p-2.5">
												<span class="text-sm font-bold text-primary">{item.start_time.substring(0, 5)}</span>
												<div class="h-5 w-px bg-border my-1.5"></div>
												<span class="text-xs font-semibold text-muted-foreground"
													>{item.end_time.substring(0, 5)}</span
												>
											</div>
											<div class="flex-1 space-y-2 py-0.5">
												<div class="flex items-start justify-between gap-2">
													<h4 class="font-bold text-sm leading-tight text-foreground/90 mix-blend-luminosity">
														{item.classes.subjects.subject_name}
													</h4>
													<Badge variant={item.course_type === 'Lecture' ? 'default' : 'secondary'} class="text-[10px] uppercase font-bold tracking-wider rounded-sm shrink-0 ml-auto whitespace-nowrap px-1.5 h-5 shadow-none border-transparent">
														{item.course_type === 'Lecture' ? 'Lec' : 'Lab'}
													</Badge>
												</div>

												<div class="grid grid-cols-1 sm:grid-cols-2 gap-y-2.5 gap-x-2 text-xs text-muted-foreground mt-3">
													<div class="flex items-center gap-1.5" title="Room">
														<Building class="h-3.5 w-3.5 shrink-0 opacity-70 text-foreground" />
														<span class="truncate font-medium">{item.rooms.room_name}</span>
													</div>
													<div class="flex items-center gap-1.5" title="Instructor">
														<UserIcon class="h-3.5 w-3.5 shrink-0 opacity-70 text-foreground" />
														<span class="truncate font-medium">{item.classes.instructors?.name || 'Unassigned'}</span>
													</div>
													<div class="flex items-center gap-1.5 sm:col-span-2" title="Section/Block">
														<Users class="h-3.5 w-3.5 shrink-0 opacity-70 text-foreground" />
														<span class="truncate font-medium">{item.classes.blocks.block_name}</span>
													</div>
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
			<div id="list-view-content" class="h-full">
				<DataTable data={data.schedules} {columns} />
			</div>
		{/if}
	</div>
</div>



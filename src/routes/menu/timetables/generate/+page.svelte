<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import {
		Calendar,
		BookOpen,
		Filter,
		PackageOpen,
		Users,
		ClipboardX,
		BookCheck,
		Wand2,
		Building,
		LoaderCircle
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	// Shadcn Components
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';

	type ProgramStat = PageData['programStats'][number];

	let { data, form } = $props<{ data: PageData }>();

	// --- Page State ---
	let isSubmitting = $state(false);

	// --- Filters ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let collegeFilterId = $state(data.filters.college);

	// --- Modal State ---
	let generateModalOpen = $state(false);
	let selectedProgramForGen = $state<ProgramStat | null>(null);

	// --- Generator Form State ---
	let selectedRoomIds = $state<Record<string, boolean>>({});
	let constraints = $state({
		enforceCapacity: true,
		enforceRoomType: true,
		enforceInstructor: true,
		enforceBlock: true
	});
	let startTime = $state('07:30');

	// Group rooms by building
	const roomsByBuilding = $derived.by(() => {
		return (data.allRooms || []).reduce(
			(acc, room) => {
				const building = room.building || 'General';
				if (!acc[building]) {
					acc[building] = [];
				}
				acc[building].push(room);
				return acc;
			},
			{} as Record<string, typeof data.allRooms>
		);
	});

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
		if (collegeFilterId && data.profile?.role === 'Admin') {
			params.set('college', collegeFilterId);
		} else {
			params.delete('college');
		}
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true });
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

	function toggleAllRooms(building: string, checked: boolean) {
		roomsByBuilding[building].forEach((room) => {
			selectedRoomIds[room.id] = checked;
		});
		selectedRoomIds = { ...selectedRoomIds };
	}
</script>

<svelte:head>
	<title>Timetable Generation Dashboard | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Generation Dashboard</h1>
		<p class="text-muted-foreground mt-1">
			A health-check and starting point for generating timetables.
		</p>
	</header>

	<!-- Main Filters -->
	<Card.Root>
		<Card.Content class="flex flex-col sm:flex-row flex-wrap items-center gap-4 p-4">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					name="academic_year"
					value={academicYear}
					onValueChange={(v) => {
						if (v) academicYear = v;
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
					name="semester"
					value={semester}
					onValueChange={(v) => {
						if (v) semester = v;
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
			{#if data.profile?.role === 'Admin'}
				<div class="flex items-center gap-2">
					<Filter class="h-4 w-4 text-muted-foreground" />
					<Select.Root
						type="single"
						value={collegeFilterId}
						onValueChange={(v) => {
							if (v) collegeFilterId = v;
							handleFilterChange();
						}}
					>
						<Select.Trigger class="w-[220px]">
							<span class="truncate max-w-[200px]">
								{data.colleges?.find((c) => c.id.toString() === collegeFilterId)?.college_name ||
									'Select a College'}
							</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">None</Select.Item>
							{#each data.colleges || [] as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Program Health Cards -->
	<div class="flex flex-col gap-6">
		{#if data.programStats.length > 0}
			{#each data.programStats as program}
				<Card.Root>
					<Card.Header>
						<Card.Title>{program.program_name}</Card.Title>
						<Card.Description>
							Scheduling health check for {academicYear}, {semester}.
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-6">
						<div class="grid gap-4 grid-cols-2 md:grid-cols-4">
							<div class="p-4 border rounded-lg">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-medium text-muted-foreground">Total Classes</h3>
									<BookCheck class="h-4 w-4 text-muted-foreground" />
								</div>
								<p class="text-2xl font-bold">{program.stats.totalClasses}</p>
							</div>
							<div
								class="p-4 border rounded-lg"
								class:bg-destructive={program.stats.unassignedClasses > 0}
							>
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-medium text-muted-foreground">Unassigned</h3>
									<Users class="h-4 w-4" />
									<span
										class:text-destructive={program.stats.unassignedClasses > 0}
										class:text-muted-foreground={program.stats.unassignedClasses === 0}
									>
									</span>
								</div>
								<p
									class="text-2xl font-bold"
									class:text-destructive={program.stats.unassignedClasses > 0}
								>
									{program.stats.unassignedClasses}
								</p>
							</div>
							<div class="p-4 border rounded-lg" class:bg-amber-500={program.stats.emptyBlocks > 0}>
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-medium text-muted-foreground">Empty Blocks</h3>
									<ClipboardX class="h-4 w-4" />
									<span
										class:text-amber-600={program.stats.emptyBlocks > 0}
										class:text-muted-foreground={program.stats.emptyBlocks === 0}
									></span>
								</div>
								<p class="text-2xl font-bold" class:text-amber-600={program.stats.emptyBlocks > 0}>
									{program.stats.emptyBlocks}
								</p>
							</div>
							<div class="p-4 border rounded-lg">
								<div class="flex items-center justify-between">
									<h3 class="text-sm font-medium text-muted-foreground">Total Blocks</h3>
									<PackageOpen class="h-4 w-4 text-muted-foreground" />
								</div>
								<p class="text-2xl font-bold">{program.stats.totalBlocks}</p>
							</div>
						</div>
					</Card.Content>
					<Card.Footer class="flex justify-end gap-2">
						<Button
							variant="outline"
							href="/menu/academics/offerings?year={academicYear}&semester={semester}&college={data
								.profile?.college_id}"
						>
							Manage Offerings
						</Button>
						<Button
							variant="outline"
							href="/menu/academics/assignments?year={academicYear}&semester={semester}&college={data
								.profile?.college_id}"
						>
							Assign Instructors
						</Button>
						<Button
							onclick={() => {
								selectedProgramForGen = program;
								generateModalOpen = true;
							}}
						>
							<Wand2 class="mr-2 h-4 w-4" /> Generate Schedule
						</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		{:else if data.profile?.role === 'Admin' && !collegeFilterId}
			<Alert.Root>
				<Filter class="h-4 w-4" />
				<Alert.AlertTitle>Select a College</Alert.AlertTitle>
				<Alert.AlertDescription>
					Please select a college from the dropdown above to view program statistics.
				</Alert.AlertDescription>
			</Alert.Root>
		{:else}
			<Alert.Root>
				<ClipboardX class="h-4 w-4" />
				<Alert.AlertTitle>No Programs Found</Alert.AlertTitle>
				<Alert.AlertDescription>
					There are no programs to display for the selected college and term.
				</Alert.AlertDescription>
			</Alert.Root>
		{/if}
	</div>
</div>

<!-- === MODALS === -->

<!-- Generate Schedule Modal -->
<Dialog.Root bind:open={generateModalOpen}>
	<Dialog.Content class="max-w-4xl">
		<Dialog.Header>
			<Dialog.Title>Generate Schedule for {selectedProgramForGen?.program_name}</Dialog.Title>
			<Dialog.Description>
				Select the rooms and constraints to use for the generation process for {academicYear}, {semester}.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/generateSchedule"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Generating schedule...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						generateModalOpen = false;
						await invalidateAll();
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
				};
			}}
		>
			<div class="py-4 grid grid-cols-1 md:grid-cols-3 gap-6">
				<div class="md:col-span-2 space-y-4">
					<h4 class="font-medium">Rooms to Use</h4>
					<div class="space-y-3 rounded-md border p-4 max-h-72 overflow-y-auto">
						{#each Object.entries(roomsByBuilding) as [building, rooms]}
							<div class="space-y-2">
								<div class="flex items-center justify-between">
									<Label class="font-semibold flex items-center gap-2">
										<Building class="h-4 w-4" />
										{building}
									</Label>
									<Button
										type="button"
										variant="link"
										size="sm"
										class="h-auto p-0"
										onclick={() => toggleAllRooms(building, true)}>Select All</Button
									>
								</div>
								{#each rooms as room}
									<div class="flex items-center gap-2 pl-2">
										<Checkbox
											id="room-{room.id}"
											name="room_ids"
											value={room.id}
											bind:checked={selectedRoomIds[room.id]}
										/>
										<Label for="room-{room.id}" class="font-normal"
											>{room.room_name} ({room.type}, Cap: {room.capacity})</Label
										>
									</div>
								{/each}
							</div>
						{/each}
					</div>
				</div>
				<div class="space-y-4">
					<h4 class="font-medium">Constraints</h4>
					<div class="space-y-4 rounded-md border p-4">
						<div class="space-y-2">
							<Label for="start-time">Schedule Start Time</Label>
							<Select.Root type="single" name="scheduleStartTime" bind:value={startTime}>
								<Select.Trigger id="start-time">
									<span>{startTime}</span>
								</Select.Trigger>
								<Select.Content>
									<Select.Item value="07:00">7:00 AM</Select.Item>
									<Select.Item value="07:30">7:30 AM</Select.Item>
									<Select.Item value="08:00">8:00 AM</Select.Item>
									<Select.Item value="08:30">8:30 AM</Select.Item>
									<Select.Item value="09:00">9:00 AM</Select.Item>
								</Select.Content>
							</Select.Root>
						</div>
						<Separator />
						<div class="flex items-center gap-2">
							<Checkbox
								id="c-cap"
								name="enforceCapacity"
								bind:checked={constraints.enforceCapacity}
							/>
							<Label for="c-cap" class="font-normal">Enforce Room Capacity</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="c-type"
								name="enforceRoomType"
								bind:checked={constraints.enforceRoomType}
							/>
							<Label for="c-type" class="font-normal">Enforce Room Type</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="c-inst"
								name="enforceInstructor"
								bind:checked={constraints.enforceInstructor}
							/>
							<Label for="c-inst" class="font-normal">Enforce Instructor Availability</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox id="c-block" name="enforceBlock" bind:checked={constraints.enforceBlock} />
							<Label for="c-block" class="font-normal">Enforce Block Availability</Label>
						</div>
					</div>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (generateModalOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Start Generation
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

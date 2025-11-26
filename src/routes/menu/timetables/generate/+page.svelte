<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import {
		Calendar,
		BookOpen,
		Wand2,
		Building,
		LoaderCircle,
		ClipboardX,
		BookCheck,
		Users,
		PackageOpen,
		Info
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils.js';
	import { animateInView } from '$lib/actions/animate-in-view.js';

	// Shadcn Components
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Collapsible from '$lib/components/ui/collapsible';

	type Program = PageData['programs'][number];

	let { data, form } = $props<{ data: PageData; form?: ActionData }>();

	// --- Page State ---
	let isSubmitting = $state(false);
	let failedClassesModalOpen = $state(false);

	// --- Form State ---
	const currentYear = new Date().getFullYear();
	let academicYear = $state(`${currentYear}-${currentYear + 1}`);
	let semester = $state<'1st Semester' | '2nd Semester' | 'Summer'>('1st Semester');

	// --- Derived State ---
	const programIdFromUrl = $derived($page.url.searchParams.get('program_id'));

	const selectedProgram = $derived(
		data.programs.find((p) => p.id.toString() === programIdFromUrl)
	);

	let selectedRoomIds = $state(
		Object.fromEntries((data.allRooms || []).map((room) => [room.id, false]))
	);
	let constraints = $state({
		enforceCapacity: true,
		enforceRoomType: true,
		enforceInstructor: true,
		enforceBlock: true
	});
	let startTime = $state('07:30');
	let endTime = $state('17:30');
	let breakTime = $state('12:00-13:00');
	let algorithm = $state<'memetic' | 'cp'>('memetic');

	const programsByCollege = $derived.by(() => {
		if (data.profile?.role !== 'Admin') return null;
		return data.programs.reduce(
			(acc, program) => {
				const collegeName = program.colleges?.college_name || 'No College';
				if (!acc[collegeName]) {
					acc[collegeName] = [];
				}
				acc[collegeName].push(program);
				return acc;
			},
			{} as Record<string, Program[]>
		);
	});

	// --- Event Handlers ---
	function generateAcademicYears() {
		const years = [];
		for (let i = -2; i <= 3; i++) {
			const startYear = currentYear + i;
			years.push(`${startYear}-${startYear + 1}`);
		}
		return years;
	}

	function handleProgramChange(programId: string | undefined) {
		const params = new URLSearchParams($page.url.searchParams);
		if (programId) {
			params.set('program_id', programId);
		} else {
			params.delete('program_id');
		}
		// Pass academic term to load health stats
		params.set('academic_year', academicYear);
		params.set('semester', semester);

		goto(`?${params.toString()}`, { noScroll: true, keepData: true });
	}

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

	function toggleAllRooms(building: string, checked: boolean) {
		roomsByBuilding[building].forEach((room) => {
			selectedRoomIds[room.id] = checked;
		});
		selectedRoomIds = { ...selectedRoomIds };
	}

	// Smart Room Selection
	$effect(() => {
		const newSelectedRoomIds: Record<string, boolean> = {};
		const programCollegeId = selectedProgram?.college_id;

		for (const room of data.allRooms) {
			if (selectedProgram) {
				// If a program is selected, apply smart selection logic
				newSelectedRoomIds[room.id] = !!(
					room.is_general_use || room.owner_college_id === programCollegeId
				);
			} else {
				// If no program is selected, default all to false
				newSelectedRoomIds[room.id] = false;
			}
		}
		selectedRoomIds = newSelectedRoomIds;
	});
</script>

<svelte:head>
	<title>Generate Timetable | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Generate Timetable</h1>
		<p class="text-muted-foreground mt-1">
			A step-by-step tool to generate a new class schedule from scratch.
		</p>
	</header>

	<form
		method="POST"
		action="?/generateSchedule"
		use:enhance={() => {
			isSubmitting = true;
			const toastId = toast.loading('Starting schedule generation...');

			return async ({ update, result }) => {
				isSubmitting = false;
				await update();

				if (result.type === 'success' && result.data?.success) {
					toast.success(result.data.message, {
						id: toastId,
						action: {
							label: 'View Timetable',
							onClick: () => goto(`/menu/timetables/view/${result.data?.generatedTimetableId}`)
						}
					});
					if (result.data.failedClasses && result.data.failedClasses.length > 0) {
						failedClassesModalOpen = true;
					}
				} else if (
					result.type === 'failure' ||
					(result.type === 'success' && !result.data?.success)
				) {
					const message = result.data?.message || 'An unknown error occurred.';
					toast.error(message, { id: toastId });
				}
			};
		}}
	>
		<Card.Root>
			<Card.Header>
				<Card.Title>Step 1: Select Program and Term</Card.Title>
				<Card.Description>
					Choose the academic program and term you want to generate a schedule for.
				</Card.Description>
			</Card.Header>
			<Card.Content class="grid grid-cols-1 md:grid-cols-3 gap-4">
				<!-- Program Select -->
				<div class="space-y-2">
					<Label for="program">Program</Label>
					{#if data.profile?.role === 'Admin'}
						<Select.Root
							type="single"
							name="program_id"
							onValueChange={(v) => handleProgramChange(v)}
							value={programIdFromUrl}
						>
							<Select.Trigger id="program" class="w-full">
								<span>{selectedProgram?.program_name || 'Select a program'}</span>
							</Select.Trigger>
							<Select.Content>
								{#if programsByCollege}
									{#each Object.keys(programsByCollege) as college}
										{@const programs = programsByCollege[college]}
										<Select.Group>
											<Select.Label>{college}</Select.Label>
											{#each programs as program}
												<Select.Item value={program.id.toString()}
													>{program.program_name}</Select.Item
												>
											{/each}
										</Select.Group>
									{/each}
								{/if}
							</Select.Content>
						</Select.Root>
					{:else if data.programs.length > 1}
						<Select.Root
							type="single"
							name="program_id"
							onValueChange={(v) => handleProgramChange(v)}
							value={programIdFromUrl}
						>
							<Select.Trigger id="program" class="w-full">
								<span>{selectedProgram?.program_name || 'Select a program'}</span>
							</Select.Trigger>
							<Select.Content>
								{#each data.programs as program}
									<Select.Item value={program.id.toString()}>{program.program_name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					{:else if data.programs.length === 1}
						<input type="hidden" name="program_id" value={data.programs[0].id} />
						<div class="flex h-10 w-full items-center justify-between rounded-md border px-3 py-2">
							<p>{data.programs[0].program_name}</p>
						</div>
					{:else}
						<div class="flex h-10 w-full items-center justify-between rounded-md border px-3 py-2">
							<p class="text-muted-foreground">No programs available.</p>
						</div>
					{/if}
				</div>

				<!-- Academic Year Select -->
				<div class="space-y-2">
					<Label for="academic_year">Academic Year</Label>
					<Select.Root type="single" name="academic_year" bind:value={academicYear}>
						<Select.Trigger id="academic_year" class="w-full">
							<span>{academicYear}</span>
						</Select.Trigger>
						<Select.Content>
							{#each generateAcademicYears() as year}
								<Select.Item value={year}>{year}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<!-- Semester Select -->
				<div class="space-y-2">
					<Label for="semester">Semester</Label>
					<Select.Root type="single" name="semester" bind:value={semester}>
						<Select.Trigger id="semester" class="w-full">
							<span>{semester}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="1st Semester">1st Semester</Select.Item>
							<Select.Item value="2nd Semester">2nd Semester</Select.Item>
							<Select.Item value="Summer">Summer</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</Card.Content>

			{#if selectedProgram && data.healthStats}
				<Card.Footer class="grid gap-4 grid-cols-2 md:grid-cols-4 p-4 border-t">
					<div class="p-4 border rounded-lg bg-background">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium text-muted-foreground">Total Classes</h3>
							<BookCheck class="h-4 w-4 text-muted-foreground" />
						</div>
						<p class="text-2xl font-bold">{data.healthStats.totalClasses}</p>
					</div>
					<div
						class={cn(
							'p-4 border rounded-lg',
							data.healthStats.unassignedClasses > 0 && 'border-destructive'
						)}
					>
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium">Unassigned</h3>
							<Users
								class={cn(
									'h-4 w-4',
									data.healthStats.unassignedClasses > 0
										? 'text-destructive'
										: 'text-muted-foreground'
								)}
							/>
						</div>
						<p
							class={cn(
								'text-2xl font-bold',
								data.healthStats.unassignedClasses > 0 && 'text-destructive'
							)}
						>
							{data.healthStats.unassignedClasses}
						</p>
					</div>
					<div
						class={cn(
							'p-4 border rounded-lg',
							data.healthStats.emptyBlocks > 0 && 'border-amber-500'
						)}
					>
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium">Empty Blocks</h3>
							<ClipboardX
								class={cn(
									'h-4 w-4',
									data.healthStats.emptyBlocks > 0 ? 'text-amber-600' : 'text-muted-foreground'
								)}
							/>
						</div>
						<p
							class={cn('text-2xl font-bold', data.healthStats.emptyBlocks > 0 && 'text-amber-600')}
						>
							{data.healthStats.emptyBlocks}
						</p>
					</div>
					<div class="p-4 border rounded-lg bg-background">
						<div class="flex items-center justify-between">
							<h3 class="text-sm font-medium text-muted-foreground">Total Blocks</h3>
							<PackageOpen class="h-4 w-4 text-muted-foreground" />
						</div>
						<p class="text-2xl font-bold">{data.healthStats.totalBlocks}</p>
					</div>
				</Card.Footer>
			{/if}

			<!-- All other steps will be added here -->
			<fieldset class="contents" disabled={!selectedProgram}>
				<!-- Step 2: Room Selection -->
				<div class={cn('border-t', !selectedProgram && 'opacity-50')}>
					<Card.Header>
						<Card.Title>Step 2: Select Rooms</Card.Title>
						<Card.Description>
							Choose the rooms that can be used for scheduling. Rooms for your college and
							general-use rooms are selected by default.
						</Card.Description>
					</Card.Header>
					<Card.Content>
						<Collapsible.Root class="space-y-2">
							<Collapsible.Trigger class="w-full">
								<div class="flex items-center justify-between rounded-lg border p-4">
									<span class="font-semibold">
										{Object.values(selectedRoomIds).filter(Boolean).length} /
										{data.allRooms.length} rooms selected
									</span>
									<Button variant="outline">View & Edit Rooms</Button>
								</div>
							</Collapsible.Trigger>
							<Collapsible.Content class="space-y-4 rounded-md border p-4 max-h-96 overflow-y-auto">
								{#each Object.keys(roomsByBuilding) as building}
									{@const rooms = roomsByBuilding[building]}
									<div class="space-y-2">
										<div class="flex items-center justify-between">
											<Label class="font-semibold flex items-center gap-2">
												<Building class="h-4 w-4" />
												{building}
											</Label>
											<div class="flex items-center gap-2">
												<Button
													type="button"
													variant="link"
													size="sm"
													class="h-auto p-0"
													onclick={() => toggleAllRooms(building, true)}>Select All</Button
												>
												<span class="text-sm text-muted-foreground">/</span>
												<Button
													type="button"
													variant="link"
													size="sm"
													class="h-auto p-0"
													onclick={() => toggleAllRooms(building, false)}>None</Button
												>
											</div>
										</div>
										<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pl-2">
											{#each rooms as room}
												<div class="flex items-center gap-2">
													<Checkbox
														id="room-{room.id}"
														name="room_ids"
														value={room.id}
														bind:checked={selectedRoomIds[room.id]}
													/>
													<Label
														for="room-{room.id}"
														class="font-normal truncate"
														title="{room.room_name} ({room.type}, Cap: {room.capacity})"
													>
														{room.room_name}
														<span class="text-muted-foreground"
															>({room.type}, Cap: {room.capacity})</span
														>
													</Label>
												</div>
											{/each}
										</div>
									</div>
								{/each}
							</Collapsible.Content>
						</Collapsible.Root>
					</Card.Content>
				</div>

				<!-- Step 3: Define Constraints -->
				<div class={cn('border-t', !selectedProgram && 'opacity-50')}>
					<Card.Header>
						<Card.Title>Step 3: Define Constraints</Card.Title>
						<Card.Description>
							Set the rules and time boundaries for the schedule generation.
						</Card.Description>
					</Card.Header>
					<Card.Content class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<!-- Time Constraints -->
						<div class="space-y-4 rounded-md border p-4">
							<h4 class="font-semibold">Time Rules</h4>
							<div class="grid grid-cols-2 gap-4">
								<div class="space-y-2">
									<Label for="start-time">Start Time</Label>
									<Select.Root type="single" name="scheduleStartTime" bind:value={startTime}>
										<Select.Trigger id="start-time">
											<span>{startTime}</span>
										</Select.Trigger>
										<Select.Content>
											{#each ['07:00', '07:30', '08:00', '08:30', '09:00'] as t}
												<Select.Item value={t}>{t}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-2">
									<Label for="end-time">End Time</Label>
									<Select.Root type="single" name="scheduleEndTime" bind:value={endTime}>
										<Select.Trigger id="end-time">
											<span>{endTime}</span>
										</Select.Trigger>
										<Select.Content>
											{#each ['16:00', '16:30', '17:00', '17:30', '18:00', '18:30', '19:00', '19:30', '20:00', '20:30', '21:00'] as t}
												<Select.Item value={t}>{t}</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
							</div>
							<div class="space-y-2">
								<Label for="break-time">Break Time</Label>
								<Select.Root type="single" name="breakTime" bind:value={breakTime}>
									<Select.Trigger id="break-time">
										<span>{breakTime === 'none' ? 'No Break' : breakTime}</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="none">No Break</Select.Item>
										<Select.Item value="11:30-12:30">11:30 - 12:30</Select.Item>
										<Select.Item value="12:00-13:00">12:00 - 13:00</Select.Item>
										<Select.Item value="12:30-13:30">12:30 - 13:30</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
						<!-- Solver Constraints -->
						<div class="space-y-4 rounded-md border p-4">
							<h4 class="font-semibold">Solver Rules</h4>
							<div class="space-y-3">
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
									<Label for="c-type" class="font-normal">Enforce Room Type (Lec/Lab)</Label>
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
									<Checkbox
										id="c-block"
										name="enforceBlock"
										bind:checked={constraints.enforceBlock}
									/>
									<Label for="c-block" class="font-normal">Enforce Block/Section Availability</Label
									>
								</div>
							</div>
						</div>
					</Card.Content>
				</div>
			</fieldset>

			<!-- Step 4: Generate -->
			<div class={cn('border-t', !selectedProgram && 'opacity-50')}>
				<Card.Header>
					<Card.Title>Step 4: Generate</Card.Title>
					<Card.Description>
						Choose the algorithm and start the generation process.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					<fieldset class="contents" disabled={!selectedProgram}>
						<RadioGroup.Root
							class="grid grid-cols-1 md:grid-cols-2 gap-4"
							name="algorithm"
							bind:value={algorithm}
						>
							<Label
								for="memetic"
								class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
							>
								<RadioGroup.Item value="memetic" id="memetic" class="sr-only" />
								<span class="text-lg font-semibold">Memetic Algorithm</span>
								<p class="text-sm text-muted-foreground mt-2 text-center">
									A hybrid approach combining a genetic algorithm with local search. Good for
									finding high-quality solutions, but can be slower.
								</p>
							</Label>
							<Label
								for="cp"
								class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
							>
								<RadioGroup.Item value="cp" id="cp" class="sr-only" />
								<span class="text-lg font-semibold">Constraint Programming</span>
								<p class="text-sm text-muted-foreground mt-2 text-center">
									A solver that finds a feasible solution by systematically exploring possibilities.
									Faster, but may not be the most optimal solution.
								</p>
							</Label>
						</RadioGroup.Root>
					</fieldset>
				</Card.Content>
				<Card.Footer class="border-t pt-6">
					<Button
						type="submit"
						class="w-full md:w-auto"
						disabled={!selectedProgram || isSubmitting}
					>
						{#if isSubmitting}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							Generating...
						{:else}
							<Wand2 class="mr-2 h-4 w-4" />
							Generate Schedule
						{/if}
					</Button>
				</Card.Footer>
			</div>
		</Card.Root>
	</form>
</div>

<!-- Failed Classes Modal -->
<Dialog.Root bind:open={failedClassesModalOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Generation Issues Detected</Dialog.Title>
			<Dialog.Description>
				The following classes could not be scheduled due to conflicting constraints or lack of
				available slots.
			</Dialog.Description>
		</Dialog.Header>
		<div class="max-h-80 overflow-y-auto space-y-2 py-4">
			{#if form?.failedClasses && form.failedClasses.length > 0}
				{#each form.failedClasses as failed}
					<Alert.Root variant="destructive">
						<ClipboardX class="h-4 w-4" />
						<Alert.AlertTitle>{failed.class}</Alert.AlertTitle>
						<Alert.AlertDescription>{failed.reason}</Alert.AlertDescription>
					</Alert.Root>
				{/each}
			{:else}
				<p>No specific failures were reported.</p>
			{/if}
		</div>
		<Dialog.Footer>
			<Button onclick={() => (failedClassesModalOpen = false)}>Close</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

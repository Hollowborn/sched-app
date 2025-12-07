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
		Info,
		Rocket,
		Cpu,
		Check,
		ChevronRight,
		ChevronLeft
	} from 'lucide-svelte';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { cn } from '$lib/utils.js';
	import { animateInView } from '$lib/actions/animate-in-view.js';

	// Shadcn Components
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Item from '$lib/components/ui/item';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Alert from '$lib/components/ui/alert';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import * as Collapsible from '$lib/components/ui/collapsible';
	import * as Field from '$lib/components/ui/field';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import * as Tabs from '$lib/components/ui/tabs';

	type Program = PageData['programs'][number];

	let { data, form } = $props<{ data: PageData; form?: ActionData }>();

	// --- Page State ---
	let isSubmitting = $state(false);

	// Stepper State
	const totalSteps = 4;
	// If healthStats exist, we likely just loaded programs, so jump to step 2. Otherwise step 1.
	let currentStep = $state(data.healthStats ? 2 : 1);

	let failedClassesModalOpen = $state(false);
	let reportData = $state<any>(null);

	// --- Form State ---
	const urlParams = $page.url.searchParams;
	const currentYear = new Date().getFullYear();
	let academicYear = $state(urlParams.get('academic_year') || `${currentYear}-${currentYear + 1}`);
	let semester = $state<'1st Semester' | '2nd Semester' | 'Summer'>(
		(urlParams.get('semester') as '1st Semester' | '2nd Semester' | 'Summer') || '1st Semester'
	);

	// Parse initial program IDs from URL (comma separated)
	let initialProgramIds = urlParams.get('program_ids')?.split(',').filter(Boolean) || [];
	// Fallback to single program_id for backward compatibility or if user just has one
	if (initialProgramIds.length === 0 && urlParams.get('program_id')) {
		initialProgramIds = [urlParams.get('program_id')!];
	} else if (initialProgramIds.length === 0 && data.profile?.program_id) {
		initialProgramIds = [data.profile.program_id.toString()];
	}

	let selectedProgramIds = $state<string[]>(initialProgramIds);

	// --- Derived State ---
	const selectedPrograms = $derived(
		data.programs.filter((p: Program) => selectedProgramIds.includes(p.id.toString()))
	);

	let selectedRoomIds = $state(
		Object.fromEntries((data.allRooms || []).map((room: any) => [room.id, false]))
	);
	let constraints = $state({
		enforceCapacity: true,
		roomTypeConstraint: 'soft',
		enforceInstructor: true,
		enforceBlock: true
	});
	let startTime = $state('07:30');
	let endTime = $state('17:30');
	let breakTime = $state('12:00-13:00');
	let algorithm = $state<'memetic' | 'cp' | 'smart_cp'>('smart_cp');

	const programsByCollege = $derived.by(() => {
		if (data.profile?.role !== 'Admin') return null;
		return data.programs.reduce(
			(acc: Record<string, Program[]>, program: Program) => {
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

	function loadProgramDetails() {
		if (selectedProgramIds.length === 0) return;
		const params = new URLSearchParams();
		// Use program_ids parameter
		params.set('program_ids', selectedProgramIds.join(','));
		params.set('academic_year', academicYear);
		params.set('semester', semester);

		goto(`?${params.toString()}`, { noScroll: true, invalidateAll: true });
	}

	function toggleProgram(id: string, checked: boolean) {
		if (checked) {
			selectedProgramIds = [...selectedProgramIds, id];
		} else {
			selectedProgramIds = selectedProgramIds.filter((p) => p !== id);
		}
	}

	function toggleCollege(collegeName: string, checked: boolean) {
		const programsInCollege = programsByCollege?.[collegeName] || [];
		const programIds = programsInCollege.map((p) => p.id.toString());

		if (checked) {
			// Add all programs from this college that aren't already selected
			const newIds = programIds.filter((id) => !selectedProgramIds.includes(id));
			selectedProgramIds = [...selectedProgramIds, ...newIds];
		} else {
			// Remove all programs from this college
			selectedProgramIds = selectedProgramIds.filter((id) => !programIds.includes(id));
		}
	}

	function nextStep() {
		if (currentStep < totalSteps) currentStep++;
	}

	function prevStep() {
		if (currentStep > 1) currentStep--;
	}

	// Group rooms by building
	const roomsByBuilding = $derived.by(() => {
		return (data.allRooms || []).reduce(
			(acc: Record<string, typeof data.allRooms>, room: any) => {
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
		// Get all college IDs from selected programs
		const selectedCollegeIds = new Set(selectedPrograms.map((p: Program) => p.college_id));

		for (const room of data.allRooms) {
			if (selectedPrograms.length > 0) {
				// If a program is selected, apply smart selection logic
				// Select if general use OR owned by ANY of the selected programs' colleges
				newSelectedRoomIds[room.id] = !!(
					room.is_general_use ||
					(room.owner_college_id && selectedCollegeIds.has(room.owner_college_id))
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
		<!-- Stepper Indicator -->
		<div class="flex items-center justify-between mb-8 relative max-w-3xl mx-auto">
			<!-- Background Line -->
			<div class="absolute top-1/2 left-0 w-full h-1 bg-muted"></div>
			<!-- Progress Line -->
			<div
				class="absolute top-1/2 left-0 h-1 bg-primary transition-all duration-300 ease-in-out"
				style="width: {((currentStep - 1) / (totalSteps - 1)) * 100}%"
			></div>

			{#each [1, 2, 3, 4] as step}
				<div class="flex flex-col items-center bg-background px-2 relative z-10">
					<div
						class="w-8 h-8 rounded-full flex items-center justify-center border-2 font-bold transition-colors
						{step < currentStep ? 'bg-primary border-primary text-primary-foreground' : ''}
						{step === currentStep ? 'border-primary text-primary' : 'border-muted text-muted-foreground'}"
					>
						{#if step < currentStep}
							<Check class="h-4 w-4" />
						{:else}
							{step}
						{/if}
					</div>
					<span
						class="text-xs mt-2 font-medium {step === currentStep
							? 'text-foreground'
							: 'text-muted-foreground'}"
					>
						{#if step === 1}Program{:else if step === 2}Rooms{:else if step === 3}Constraints{:else}Generate{/if}
					</span>
				</div>
			{/each}
		</div>
	</header>

	<form
		method="POST"
		action="?/generateSchedule"
		use:enhance={() => {
			isSubmitting = true;
			const toastId = toast.loading('Starting schedule generation...');

			return async ({ update, result }) => {
				// await update(); // Skip default update to prevent global skeleton loading
				isSubmitting = false;

				if (result.type === 'success' && result.data?.success) {
					// Store report data locally to ensure modal shows it regardless of form update quirks
					if (result.data.report) {
						reportData = {
							report: result.data.report,
							failedClasses: result.data.failedClasses,
							generatedTimetableId: result.data.generatedTimetableId,
							success: result.data.success
						};
						failedClassesModalOpen = true;
					}

					toast.success('Generation complete!', {
						id: toastId,
						description: result.data.message,
						action: {
							label: 'View Timetable',
							onClick: () => goto(`/menu/timetables/view/${result.data?.generatedTimetableId}`)
						}
					});
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
		<Card.Root class="max-w-3xl mx-auto min-h-[500px] flex flex-col">
			<Card.Header>
				<Card.Title>
					{#if currentStep === 1}Step 1: Select Program & Term
					{:else if currentStep === 2}Step 2: Select Rooms
					{:else if currentStep === 3}Step 3: Define Constraints
					{:else}Step 4: Generate Schedule{/if}
				</Card.Title>
				<Card.Description>
					{#if currentStep === 1}Choose the academic year, semester, and programs to schedule.
					{:else if currentStep === 2}Select the rooms available for this schedule.
					{:else if currentStep === 3}Set time boundaries and solver rules.
					{:else}Review summary and start generation.{/if}
				</Card.Description>
			</Card.Header>
			<Card.Content class="flex-1">
				<div class={currentStep === 1 ? 'block' : 'hidden'}>
					<!-- Program Select (Tabs) -->
					<div class="space-y-2 md:col-span-3">
						<Label>Programs</Label>
						<Tabs.Root value="program" class="w-full">
							<Tabs.List class="grid w-full grid-cols-2">
								<Tabs.Trigger value="program">By Program</Tabs.Trigger>
								<Tabs.Trigger value="college" disabled={!programsByCollege}>By College</Tabs.Trigger
								>
							</Tabs.List>
							<Tabs.Content value="program">
								<Item.Group class="gap-2 max-h-64 overflow-auto">
									<!-- <div class="rounded-md border p-4 max-h-60 overflow-y-auto bg-card mt-2"> -->
									{#if programsByCollege}
										{#each Object.keys(programsByCollege) as college}
											<Item.Root variant="muted">
												<Item.Header>
													<Item.Title class="text-sm font-semibold">{college}</Item.Title>
													<div class="bg-blue-500 size-2 rounded-full"></div>
												</Item.Header>
												<Separator />
												<Item.Content>
													{#each programsByCollege[college] as program}
														<Item.Description class="flex gap-4">
															<Checkbox
																id="prog-{program.id}"
																checked={selectedProgramIds.includes(program.id.toString())}
																onCheckedChange={(v) =>
																	toggleProgram(program.id.toString(), v as boolean)}
															/>
															<input
																type="hidden"
																name="program_ids"
																value={program.id}
																disabled={!selectedProgramIds.includes(program.id.toString())}
															/>
															<Label
																for="prog-{program.id}"
																class="font-normal cursor-pointer tracking-wide"
																>{program.program_name}</Label
															>
														</Item.Description>
													{/each}
												</Item.Content>
											</Item.Root>
										{/each}
									{:else if data.programs.length > 0}
										<!-- Fallback for non-admin or flat list -->
										<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
											{#each data.programs as program}
												<div class="flex items-center gap-2">
													<Checkbox
														id="prog-{program.id}"
														checked={selectedProgramIds.includes(program.id.toString())}
														onCheckedChange={(v) =>
															toggleProgram(program.id.toString(), v as boolean)}
													/>
													<input
														type="hidden"
														name="program_ids"
														value={program.id}
														disabled={!selectedProgramIds.includes(program.id.toString())}
													/>
													<Label for="prog-{program.id}" class="font-normal cursor-pointer"
														>{program.program_name}</Label
													>
												</div>
											{/each}
										</div>
									{:else}
										<div
											class="flex h-10 w-full items-center justify-between rounded-md border px-3 py-2"
										>
											<p class="text-muted-foreground">No programs available.</p>
										</div>
									{/if}
								</Item.Group>
								<!-- </div> -->
							</Tabs.Content>
							<Tabs.Content value="college">
								<div class="rounded-md border p-4 max-h-60 overflow-y-auto bg-card mt-2">
									{#if programsByCollege}
										<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
											{#each Object.keys(programsByCollege) as college}
												{@const programs = programsByCollege[college]}
												{@const allSelected = programs.every((p) =>
													selectedProgramIds.includes(p.id.toString())
												)}
												{@const someSelected = programs.some((p) =>
													selectedProgramIds.includes(p.id.toString())
												)}

												<div
													class="flex items-center gap-2 p-2 border rounded-md hover:bg-accent/50 transition-colors"
												>
													<Checkbox
														id="col-{college}"
														checked={allSelected ? true : someSelected ? 'indeterminate' : false}
														onCheckedChange={(v) => toggleCollege(college, v as boolean)}
													/>
													<div class="flex flex-col">
														<Label for="col-{college}" class="font-semibold cursor-pointer"
															>{college}</Label
														>
														<span class="text-xs text-muted-foreground"
															>{programs.length} programs</span
														>
													</div>
												</div>
											{/each}
										</div>
									{:else}
										<p class="text-muted-foreground p-4 text-center">
											College selection is only available for Admins.
										</p>
									{/if}
								</div>
							</Tabs.Content>
						</Tabs.Root>
						<p class="text-xs text-muted-foreground">
							Select one or more programs to schedule together.
						</p>
					</div>

					<!-- Academic Year Select -->
					<div class="gap-2 justify-between mt-4">
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
					</div>

					<!-- Load Details Button -->
					<div class="md:col-span-3 pt-2">
						<Button
							variant="secondary"
							class="w-full"
							onclick={loadProgramDetails}
							disabled={selectedProgramIds.length === 0}
						>
							Load Program Details
						</Button>
					</div>
				</div>

				<div class={currentStep === 2 ? 'block' : 'hidden'}>
					<!-- Step 2: Room Selection -->
					<div class="space-y-4">
						<div class="flex items-center justify-between rounded-lg border p-4">
							<span class="font-semibold">
								{Object.values(selectedRoomIds).filter(Boolean).length} /
								{data.allRooms.length} rooms selected
							</span>
							<Button variant="outline" size="sm">View & Edit Rooms</Button>
						</div>

						<div class="space-y-4 rounded-md border p-4 max-h-96 overflow-y-auto">
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
													title="{room.room_name} ({room.type})"
												>
													{room.room_name}
													<span class="text-muted-foreground">({room.type})</span>
												</Label>
											</div>
										{/each}
									</div>
								</div>
							{/each}
						</div>
					</div>
				</div>

				<div class={currentStep === 3 ? 'block' : 'hidden'}>
					<!-- Step 3: Define Constraints -->
					<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						<!-- Day Rules -->
						<div class="space-y-4 rounded-md border p-4">
							<h4 class="font-semibold">Day Rules</h4>
							<div class="space-y-2">
								<Label class="text-sm text-muted-foreground">Exclude Days</Label>
								<div class="flex flex-wrap gap-2">
									{#each ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as day}
										<div class="flex items-center gap-2">
											<Checkbox id="exclude-{day}" name="excluded_days" value={day} />
											<Label for="exclude-{day}" class="font-normal">{day}</Label>
										</div>
									{/each}
								</div>
								<p class="relative bottom-0 text-xs text-muted-foreground mt-2">
									Classes with specific <code>lecture_days</code> will bypass this rule.
								</p>
							</div>
						</div>

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
								<div class="space-y-2 pt-2">
									<Label class="text-sm font-medium">Room Type Rules</Label>
									<RadioGroup.Root
										bind:value={constraints.roomTypeConstraint}
										name="roomTypeConstraint"
									>
										<div class="flex items-center space-x-2">
											<RadioGroup.Item value="strict" id="rt-strict" />
											<Label for="rt-strict" class="font-normal"
												>Strictly Enforce (Lec → Lec Room)</Label
											>
										</div>
										<div class="flex items-center space-x-2">
											<RadioGroup.Item value="soft" id="rt-soft" />
											<Label for="rt-soft" class="font-normal"
												>Allow Overflow (Prefer correct type)</Label
											>
										</div>
									</RadioGroup.Root>
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
					</div>
				</div>

				<div class={currentStep === 4 ? 'block' : 'hidden'}>
					<!-- Step 4: Generate -->
					<div class="space-y-6">
						<!-- Health Stats (Moved from Footer) -->
						{#if data.healthStats}
							<div class="grid gap-4 grid-cols-2 md:grid-cols-4">
								<div class="flex flex-col p-4 border rounded-lg bg-background">
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-medium text-muted-foreground">Total Classes</h3>
										<BookCheck class="h-4 w-4 text-muted-foreground" />
									</div>
									<p class="text-2xl font-bold">{data.healthStats.totalClasses}</p>
									<p class="text-xs text-muted-foreground mt-1">offerings for selected programs</p>
								</div>
								<div
									class={cn(
										'flex flex-col p-4 border rounded-lg',
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
									<p class="text-xs text-muted-foreground mt-1">classes have no instructor</p>
								</div>
								<div
									class={cn(
										'flex flex-col p-4 border rounded-lg',
										data.healthStats.emptyBlocks > 0 && 'border-amber-500'
									)}
								>
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-medium">Empty Blocks</h3>
										<ClipboardX
											class={cn(
												'h-4 w-4',
												data.healthStats.emptyBlocks > 0
													? 'text-amber-600'
													: 'text-muted-foreground'
											)}
										/>
									</div>
									<p
										class={cn(
											'text-2xl font-bold',
											data.healthStats.emptyBlocks > 0 && 'text-amber-600'
										)}
									>
										{data.healthStats.emptyBlocks}
									</p>
									<p class="text-xs text-muted-foreground mt-1">blocks have no classes</p>
								</div>
								<div class="flex flex-col p-4 border rounded-lg bg-background">
									<div class="flex items-center justify-between">
										<h3 class="text-sm font-medium text-muted-foreground">Total Blocks</h3>
										<PackageOpen class="h-4 w-4 text-muted-foreground" />
									</div>
									<p class="text-2xl font-bold">{data.healthStats.totalBlocks}</p>
									<p class="text-xs text-muted-foreground mt-1">in selected programs</p>
								</div>
							</div>
						{/if}

						<div class="space-y-2 mb-4">
							<Label for="custom_name" class="mt-2 ml-2 text-muted-foreground"
								>Timetable Name (Optional)</Label
							>
							<input
								type="text"
								name="custom_name"
								id="custom_name"
								placeholder="e.g., Draft Schedule v1"
								class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background file:border-0 file:bg-transparent file:text-sm file:font-medium placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
							/>
							<p class="text-sm text-muted-foreground ml-2">
								Leave blank to auto-generate a name (e.g., TT-Program-Year-Sem).
							</p>
						</div>
						<RadioGroup.Root
							class="grid grid-cols-1 md:grid-cols-3 gap-4 pb-4"
							name="algorithm"
							bind:value={algorithm}
						>
							<Label
								for="cp"
								class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
							>
								<RadioGroup.Item value="cp" id="cp" class="sr-only" />
								<Label class="text-lg font-semibold"
									>Constraint Programming <Badge variant="secondary"><Rocket /> fast</Badge></Label
								>
								<Separator />
								<p class="text-sm text-muted-foreground mt-2 text-center">
									A solver that finds a feasible solution by systematically exploring possibilities.
									Faster, but may not be the most optimal solution.
								</p>
							</Label>
							<Label
								for="smart_cp"
								class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
							>
								<RadioGroup.Item value="smart_cp" id="smart_cp" class="sr-only" />
								<Label class="text-lg font-semibold"
									>Smart CP <Badge variant="default"><Wand2 class="w-3 h-3 mr-1" />balanced</Badge
									></Label
								>
								<Separator />
								<p class="text-sm text-muted-foreground mt-2 text-center">
									An enhanced CP solver that optimizes for preferred rooms and minimizes gaps. Best
									balance of speed and quality.
								</p>
							</Label>
							<Label
								for="memetic"
								class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary"
							>
								<RadioGroup.Item value="memetic" id="memetic" class="sr-only" />
								<Label class="text-lg font-semibold"
									>Memetic Algorithm <Badge variant="secondary"><Cpu />slow</Badge></Label
								>
								<Separator />
								<p class="text-sm text-muted-foreground mt-2 text-center">
									A hybrid approach combining a genetic algorithm with local search. Good for
									finding high-quality solutions, but can be slower.
								</p>
							</Label>
						</RadioGroup.Root>
					</div>
				</div>
			</Card.Content>

			<Card.Footer class="flex justify-between border-t pt-6">
				<Button type="button" variant="outline" onclick={prevStep} disabled={currentStep === 1}>
					<ChevronLeft class="mr-2 h-4 w-4" /> Back
				</Button>

				{#if currentStep < totalSteps}
					<Button
						type="button"
						onclick={nextStep}
						disabled={currentStep === 1 && !data.healthStats}
					>
						Next <ChevronRight class="ml-2 h-4 w-4" />
					</Button>
				{:else}
					<Button type="submit" disabled={selectedPrograms.length === 0 || isSubmitting}>
						{#if isSubmitting}
							<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
							Generating...
						{:else}
							<Wand2 class="mr-2 h-4 w-4" />
							Generate Schedule
						{/if}
					</Button>
				{/if}
			</Card.Footer>
		</Card.Root>
	</form>
</div>

<!-- Generation Report Modal -->
<Dialog.Root bind:open={failedClassesModalOpen}>
	<Dialog.Content class="sm:max-w-[600px]">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">Generation Statistics</Dialog.Title>
			<Dialog.Description>Performance metrics for this generation run.</Dialog.Description>
		</Dialog.Header>

		{#if reportData?.report}
			<Field.Group class="py-4">
				<Field.Set>
					<div class="grid grid-cols-3 gap-4 pt-2">
						<div
							class="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg border"
						>
							<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
								>Time</span
							>
							<span class="text-2xl font-bold">{reportData.report.timeTakenSec}</span>
						</div>
						<div
							class="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg border"
						>
							<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
								>Success Rate</span
							>
							<span
								class={cn(
									'text-2xl font-bold',
									reportData.report.successRate === 100 ? 'text-green-600' : 'text-amber-600'
								)}
							>
								{reportData.report.successRate}%
							</span>
							<span class="text-xs text-muted-foreground"
								>{reportData.report.scheduledCount}/{reportData.report.totalClasses}</span
							>
						</div>
						<div
							class="flex flex-col items-center justify-center p-4 bg-muted/50 rounded-lg border"
						>
							<span class="text-xs font-medium text-muted-foreground uppercase tracking-wider"
								>Rooms</span
							>
							<span class="text-2xl font-bold">{reportData.report.roomsUsed}</span>
						</div>
					</div>
					<Field.Description class="text-muted-foreground flex items-center gap-2 ">
						{#if reportData?.report?.successRate === 100}
							<BookCheck class="h-4 w-4 text-green-600" />
							<span class="text-green-600">Generation Complete!</span>
						{:else}
							<Info class="h-4 w-4 text-amber-600" />
							<span class="text-amber-600">Generation Complete with Issues</span>
						{/if}
					</Field.Description>
				</Field.Set>

				<Field.Separator />

				<Field.Set>
					<Field.Legend class="flex items-center gap-2">
						{#if reportData?.failedClasses && reportData.failedClasses.length > 0}
							<ClipboardX class="h-4 w-4 text-destructive" />
							<span class="text-destructive"
								>Failed Classes ({reportData.failedClasses.length})</span
							>
						{:else}
							<BookCheck class="h-4 w-4 text-green-600" />
							<span class="text-green-600">Status</span>
						{/if}
					</Field.Legend>
					<Field.Description>
						{#if reportData?.failedClasses && reportData.failedClasses.length > 0}
							The following classes could not be scheduled.
						{:else}
							All classes were scheduled successfully.
						{/if}
					</Field.Description>

					{#if reportData?.failedClasses && reportData.failedClasses.length > 0}
						<div class="max-h-60 overflow-y-auto space-y-2 pr-2 pt-2">
							{#each reportData.failedClasses as failed}
								<Alert.Root variant="destructive" class="py-2">
									<Alert.AlertTitle class="text-sm font-semibold">{failed.class}</Alert.AlertTitle>
									<Alert.AlertDescription class="text-xs">{failed.reason}</Alert.AlertDescription>
								</Alert.Root>
							{/each}
						</div>
					{/if}
				</Field.Set>
			</Field.Group>
		{/if}

		<Dialog.Footer class="sm:justify-between gap-2">
			<Button variant="outline" onclick={() => (failedClassesModalOpen = false)}>Close</Button>
			{#if reportData?.success}
				<Button
					onclick={() =>
						goto(`/menu/timetables/view/${reportData?.generatedTimetableId}`, {
							invalidateAll: true
						})}
				>
					View Timetable
				</Button>
			{/if}
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

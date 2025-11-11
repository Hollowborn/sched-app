<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		Calendar,
		BookOpen,
		Wand2,
		LoaderCircle,
		CheckCircle,
		AlertTriangle,
		Eye,
		Building,
		PlusCircle
	} from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Separator } from '$lib/components/ui/separator';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Alert, AlertTitle, AlertDescription } from '$lib/components/ui/alert';

	// Define the room interface
	interface Room {
		id: string | number;
		room_name: string;
		type: string;
		capacity: number;
	}

	// Define the shape of your data including roomsByBuilding
	interface PageDataExtended extends PageData {
		roomsByBuilding: Record<string, Room[]>;
	}

	let { data, form } = $props<{ data: PageDataExtended; form: ActionData }>();

	// --- Component State ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let selectedTimetableId = $state<string | undefined>(undefined);
	let isSubmitting = $state(false);

	// Modal State
	let createTimetableOpen = $state(false);
	let newTimetableName = $state('');

	// Input State
	let selectedCollegeIds = $state<Record<string, boolean>>({});
	let selectedRoomIds = $state<Record<string, boolean>>({});

	// Constraint State
	let constraints = $state({
		enforceCapacity: true,
		enforceRoomType: true,
		enforceInstructor: true,
		enforceBlock: true
	});

	// Time start
	let startTime = $state('07:30');

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
		// Don't auto-select timetable, let user choose
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true, keepData: true });
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
		data.roomsByBuilding[building].forEach((room) => {
			selectedRoomIds[room.id] = checked;
		});
		selectedRoomIds = { ...selectedRoomIds };
	}
</script>

<svelte:head>
	<title>Automatic Schedule Generator | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Automatic Schedule Generator</h1>
		<p class="text-muted-foreground mt-1">
			Let SmartSched generate a draft timetable for you based on your selected constraints.
		</p>
	</header>

	<form
		method="POST"
		action="?/generateSchedule"
		use:enhance={() => {
			isSubmitting = true;
			const toastId = toast.loading('Generating schedule... This may take a moment.');
			return async ({ update, result }) => {
				isSubmitting = false;
				if (result.type === 'success') {
					toast.success(result.data?.message, { id: toastId });
					// Invalidate to refresh data, e.g., if we were to show stats
					invalidateAll();
				} else if (result.type === 'failure') {
					toast.error(result.data?.message, { id: toastId });
				}
				await update();
			};
		}}
	>
		<div class="grid grid-cols-1 lg:grid-cols-3 gap-6">
			<!-- Column 1: Control Panel & Inputs -->
			<div class="lg:col-span-2 space-y-6">
				<!-- Control Panel -->
				<Card.Root>
					<Card.Header>
						<Card.Title>1. Select Context</Card.Title>
						<Card.Description>
							Choose the academic term and the draft timetable you want to generate into.
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div class="space-y-2">
								<Label>Academic Year</Label>
								<Select.Root
									type="single"
									name="academic_year"
									value={academicYear}
									onValueChange={(v) => {
										if (v) academicYear = v;
										selectedTimetableId = undefined; // Reset
										handleFilterChange();
									}}
								>
									<Select.Trigger><span>{academicYear}</span></Select.Trigger>
									<Select.Content>
										{#each generateAcademicYears() as year}
											<Select.Item value={year}>{year}</Select.Item>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>
							<div class="space-y-2">
								<Label>Semester</Label>
								<Select.Root
									type="single"
									name="semester"
									value={semester}
									onValueChange={(v) => {
										if (v) semester = v;
										selectedTimetableId = undefined; // Reset
										handleFilterChange();
									}}
								>
									<Select.Trigger><span>{semester}</span></Select.Trigger>
									<Select.Content>
										<Select.Item value="1st Semester">1st Semester</Select.Item>
										<Select.Item value="2nd Semester">2nd Semester</Select.Item>
										<Select.Item value="Summer">Summer</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>
						</div>
						<div class="space-y-2">
							<Label>Target Timetable</Label>
							<div class="flex gap-2">
								<Select.Root type="single" name="timetable_id" bind:value={selectedTimetableId}>
									<Select.Trigger class="flex-1">
										<span class="truncate">
											{data.availableTimetables.find((t) => t.id.toString() === selectedTimetableId)
												?.name || 'Select a draft timetable'}
										</span>
									</Select.Trigger>
									<Select.Content>
										{#if data.availableTimetables.length === 0}
											<p class="p-2 text-sm text-muted-foreground text-center">
												No drafts for this term.
											</p>
										{:else}
											{#each data.availableTimetables as tt}
												<Select.Item value={tt.id.toString()}>{tt.name} ({tt.status})</Select.Item>
											{/each}
										{/if}
									</Select.Content>
								</Select.Root>
								<Button
									type="button"
									variant="outline"
									onclick={() => (createTimetableOpen = true)}
								>
									<PlusCircle class="mr-2 h-4 w-4" /> Create New
								</Button>
							</div>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Inputs -->
				<Card.Root>
					<Card.Header>
						<Card.Title>2. Select Inputs</Card.Title>
						<Card.Description
							>Choose which classes and rooms to include in the generation.</Card.Description
						>
					</Card.Header>
					<Card.Content class="grid grid-cols-1 md:grid-cols-2 gap-6">
						<div class="space-y-4">
							<h4 class="font-medium">Colleges to Schedule</h4>
							<div class="space-y-2 rounded-md border p-4 max-h-48 overflow-y-auto">
								{#each data.colleges as college}
									<div class="flex items-center gap-2">
										<Checkbox
											id="col-{college.id}"
											name="college_ids"
											value={college.id}
											checked={selectedCollegeIds[college.id]}
										/>
										<Label for="col-{college.id}" class="font-normal">{college.college_name}</Label>
									</div>
								{/each}
							</div>
						</div>
						<div class="space-y-4">
							<h4 class="font-medium">Rooms to Use</h4>
							<div class="space-y-3 rounded-md border p-4 max-h-48 overflow-y-auto">
								{#each Object.entries(data.roomsByBuilding) as [building, rooms]}
									<div class="space-y-2">
										<div class="flex items-center justify-between">
											<Label class="font-semibold">{building}</Label>
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
													checked={selectedRoomIds[room.id]}
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
					</Card.Content>
				</Card.Root>
			</div>

			<!-- Column 2: Constraints & Action -->
			<div class="lg:col-span-1 space-y-6">
				<!-- Constraints -->
				<Card.Root>
					<Card.Header>
						<Card.Title>3. Set Constraints</Card.Title>
						<Card.Description>
							Define the "hard rules" for the solver. All are enforced by default.
						</Card.Description>
					</Card.Header>
					<Card.Content class="space-y-4">
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
							<Checkbox id="c-cap" name="enforceCapacity" checked={constraints.enforceCapacity} />
							<Label for="c-cap" class="font-normal">Enforce Room Capacity</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox id="c-type" name="enforceRoomType" checked={constraints.enforceRoomType} />
							<Label for="c-type" class="font-normal"
								>Enforce Room Type (e.g., Labs in Lab rooms)</Label
							>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox
								id="c-inst"
								name="enforceInstructor"
								checked={constraints.enforceInstructor}
							/>
							<Label for="c-inst" class="font-normal">Enforce Instructor Availability</Label>
						</div>
						<div class="flex items-center gap-2">
							<Checkbox id="c-block" name="enforceBlock" checked={constraints.enforceBlock} />
							<Label for="c-block" class="font-normal">Enforce Block/Section Availability</Label>
						</div>
					</Card.Content>
				</Card.Root>

				<!-- Action -->
				<Card.Root>
					<Card.Header>
						<Card.Title>4. Generate Schedule</Card.Title>
					</Card.Header>
					<Card.Content>
						<Button type="submit" class="w-full" disabled={!selectedTimetableId || isSubmitting}>
							{#if isSubmitting}
								<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								Generating...
							{:else}
								<Wand2 class="mr-2 h-4 w-4" />
								Generate Schedule
							{/if}
						</Button>
						{#if !selectedTimetableId}
							<p class="text-xs text-destructive text-center mt-2">
								You must select a target timetable first.
							</p>
						{/if}
					</Card.Content>
				</Card.Root>

				<!-- Results -->
				{#if form?.success}
					<Card.Root>
						<Card.Header>
							<Card.Title class="flex items-center gap-2">
								<CheckCircle class="h-5 w-5 text-green-500" />
								Generation Complete
							</Card.Title>
						</Card.Header>
						<Card.Content class="space-y-4">
							<p>{form.message}</p>
							{#if form.failedClasses && form.failedClasses.length > 0}
								<Alert variant="destructive">
									<AlertTriangle class="h-4 w-4" />
									<AlertTitle>Failed to Schedule</AlertTitle>
									<AlertDescription class="max-h-32 overflow-y-auto">
										<ul class="list-disc pl-5 text-xs">
											{#each form.failedClasses as failed}
												<li>
													<strong>{failed.class}</strong>: {failed.reason}
												</li>
											{/each}
										</ul>
									</AlertDescription>
								</Alert>
							{/if}
							<Button
								href="/menu/timetables/scheduler?year={academicYear}&semester={semester}&timetableId={form.generatedTimetableId}"
								class="w-full"
							>
								<Eye class="mr-2 h-4 w-4" />
								Review & Finalize in Master Scheduler
							</Button>
						</Card.Content>
					</Card.Root>
				{/if}
			</div>
		</div>
	</form>
</div>

<!-- "Create Timetable" Modal -->
<Dialog.Root bind:open={createTimetableOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Timetable</Dialog.Title>
			<Dialog.Description>
				Give this new timetable a name for {academicYear}, {semester}.
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
					await update({ reset: false });
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
					placeholder="e.g., Draft 1"
					required
				/>
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (createTimetableOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={!newTimetableName || isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create & Select
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

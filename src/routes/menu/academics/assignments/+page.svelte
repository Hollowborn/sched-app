<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { cn } from '$lib/utils';
	import {
		Calendar,
		BookOpen,
		List,
		UserCheck,
		UserX,
		Filter,
		Pencil,
		Check
	} from '@lucide/svelte';
	import { tick } from 'svelte';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';

	// Shadcn Components
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { Label } from '$lib/components/ui/label';
	import { Switch } from '$lib/components/ui/switch';
	import { Checkbox } from '$lib/components/ui/checkbox';

	type Instructor = PageData['instructors'][number];
	type ClassOffering = PageData['classes'][number];

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let collegeFilterId = $state(data.filters.college);
	let statusFilter = $state<'all' | 'assigned' | 'unassigned'>('all');

	let selectedInstructorIds = $state<{ [key: number]: string | undefined }>({});
	let selectedRoomIds = $state<{ [key: number]: string | undefined }>({});

	// --- Edit Popover State ---
	let editingClassId = $state<number | null>(null);
	let editSplitLecture = $state(false);
	let editLectureDays = $state<string[]>([]);
	let filterOpen = $state(false);

	const atEditLectureDaysLimit = $derived(editLectureDays.length >= 2);

	$effect(() => {
		const initialIds: { [key: number]: string | undefined } = {};
		const initialRoomIds: { [key: number]: string | undefined } = {};
		if (data.classes) {
			for (const c of data.classes) {
				initialIds[c.id] = c.instructors?.id.toString() ?? '0';
				initialRoomIds[c.id] = c.pref_room_id?.toString() ?? '0';
			}
		}
		selectedInstructorIds = initialIds;
		selectedRoomIds = initialRoomIds;
	});

	// --- Derived State ---
	const filteredClasses: ClassOffering[] = $derived.by(() => {
		let classes = data.classes || [];

		if (statusFilter === 'assigned') {
			classes = classes.filter((c) => c.instructors !== null);
		} else if (statusFilter === 'unassigned') {
			classes = classes.filter((c) => c.instructors === null);
		}

		return classes;
	});

	// --- Event Handlers ---
	function getQualifiedInstructors(
		subjectId: number | null,
		currentInstructorId: number | null
	): (Instructor & { isQualified: boolean })[] {
		if (!subjectId) return [];

		const qualified =
			data.instructors?.filter((i) =>
				i.instructor_subjects.some((is) => is.subject_id === subjectId)
			) || [];

		const qualifiedIds = new Set(qualified.map((i) => i.id));
		const results = qualified.map((i) => ({ ...i, isQualified: true }));

		if (currentInstructorId && !qualifiedIds.has(currentInstructorId)) {
			const currentInstructor = data.instructors.find((i) => i.id === currentInstructorId);
			if (currentInstructor) {
				results.unshift({ ...currentInstructor, isQualified: false });
			}
		}

		return results;
	}

	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
		if (collegeFilterId) {
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

	async function handleAssignmentChange(classId: number) {
		await tick();

		const form = document.getElementById(`assign-form-${classId}`) as HTMLFormElement;
		if (form) {
			form.requestSubmit();
		}
	}

	async function handleRoomChange(classId: number) {
		await tick();

		const form = document.getElementById(`room-form-${classId}`) as HTMLFormElement;
		if (form) {
			form.requestSubmit();
		}
	}

	const dayColorMap: Record<string, string> = {
		Monday: 'var(--chart-1)',
		Tuesday: 'var(--chart-2)',
		Wednesday: 'var(--chart-3)',
		Thursday: 'var(--chart-4)',
		Friday: 'var(--chart-5)'
	};

	const columns: ColumnDef<ClassOffering>[] = [
		{
			accessorKey: 'subjects',
			header: 'Subject',
			cell: ({ row }) => renderSnippet(subjectCell, { rowData: row.original })
		},
		{
			accessorFn: (d) => d.blocks?.block_name,
			header: 'Block'
		},
		{
			accessorFn: (d) => d.blocks?.programs?.colleges?.college_name,
			header: 'College',
			cell: ({ row }) => renderSnippet(collegeCell, { rowData: row.original })
		},
		{
			id: 'instructor',
			accessorFn: (d) => d.instructors?.name || '',
			header: 'Instructor',
			cell: ({ row }) => renderSnippet(instructorCell, { rowData: row.original }),
			meta: {
				class: 'w-[30%]'
			}
		},
		{
			id: 'room',
			accessorFn: (d) => d.rooms?.room_name || '',
			header: 'Preferred Room',
			cell: ({ row }) => renderSnippet(roomCell, { rowData: row.original }),
			meta: {
				class: 'w-[20%]'
			}
		}
	];
</script>

{#snippet subjectCell({ rowData }: { rowData: ClassOffering })}
	<div class="flex flex-col gap-1">
		<div class="flex items-center justify-between">
			<div class="flex items-center gap-2">
				<span class="font-medium">{rowData.subjects?.subject_code}</span>
				{#if rowData.split_lecture && rowData.lecture_days}
					<div class="flex gap-1">
						{#if rowData.lecture_days.length > 0}
							{#each rowData.lecture_days as day}
								<Badge
									variant="outline"
									class="border font-mono"
									style="background-color: oklch(from {dayColorMap[
										day
									]} l c h / 0.1); color: {dayColorMap[day]}; border-color: oklch(from {dayColorMap[
										day
									]} l c h / 0.2);"
								>
									{day.slice(0, 3)}
								</Badge>
							{/each}
						{:else if rowData.split_lecture}
							<Badge variant="secondary" class="border font-mono">/</Badge>
						{/if}
					</div>
				{/if}
			</div>

			<Popover.Root>
				<Popover.Trigger
					class="text-muted-foreground hover:text-foreground"
					onclick={() => {
						editingClassId = rowData.id;
						editSplitLecture = rowData.split_lecture ?? false;
						editLectureDays = rowData.lecture_days ?? [];
					}}
				>
					<Pencil class="h-4 w-4" />
				</Popover.Trigger>
				<Popover.Content class="w-80">
					<form
						method="POST"
						action="?/updateLectureSplit"
						use:enhance={() => {
							const toastId = toast.loading('Updating settings...');
							return async ({ update, result }) => {
								if (result.type === 'success') {
									toast.success(result.data?.message, { id: toastId });
									await invalidateAll();
								} else {
									toast.error(result.data?.message, { id: toastId });
								}
								// Close popover on completion
								document
									.querySelector('[data-radix-popover-content-wrapper]')
									?.parentElement?.click();
								editingClassId = null;
							};
						}}
					>
						<div class="grid gap-4">
							<div class="space-y-2">
								<h4 class="font-medium leading-none">Lecture Split Settings</h4>
								<p class="text-sm text-muted-foreground">
									Configure how this lecture is scheduled.
								</p>
							</div>
							<input type="hidden" name="classId" value={editingClassId} />
							<div class="flex items-center space-x-2 rounded-md border p-4">
								<Switch id="edit-split-lecture" bind:checked={editSplitLecture} />
								<input type="hidden" name="split_lecture" value={editSplitLecture} />
								<Label for="edit-split-lecture" class="ml-2">Split Lecture into two sessions</Label>
							</div>
							{#if editSplitLecture}
								<div class="space-y-2 pt-2">
									<Label>Lecture Days</Label>
									<div class="flex flex-wrap gap-4">
										{#each ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as day}
											<div class="flex items-center space-x-2">
												<Checkbox
													id="edit-{day}"
													checked={editLectureDays.includes(day)}
													disabled={atEditLectureDaysLimit && !editLectureDays.includes(day)}
													onCheckedChange={(checked) => {
														if (checked) {
															editLectureDays = [...editLectureDays, day];
														} else {
															editLectureDays = editLectureDays.filter((d) => d !== day);
														}
													}}
												/>
												<Label
													for="edit-{day}"
													class={atEditLectureDaysLimit && !editLectureDays.includes(day)
														? 'text-muted-foreground'
														: ''}>{day}</Label
												>
											</div>
										{/each}
									</div>
									<p class="text-sm text-muted-foreground">Select up to 2 days.</p>
									<input
										type="hidden"
										name="lecture_days"
										value={JSON.stringify(editLectureDays)}
									/>
								</div>
							{/if}
							<Button type="submit">Save changes</Button>
						</div>
					</form>
				</Popover.Content>
			</Popover.Root>
		</div>
		<div class="text-sm text-muted-foreground">{rowData.subjects?.subject_name}</div>
	</div>
{/snippet}

{#snippet collegeCell({ rowData }: { rowData: ClassOffering })}
	<Badge variant="secondary">{rowData.blocks?.programs?.colleges?.college_name || 'N/A'}</Badge>
{/snippet}

{#snippet instructorCell({ rowData }: { rowData: ClassOffering })}
	{@const qualifiedInstructors = getQualifiedInstructors(
		rowData.subjects?.id ?? null,
		rowData.instructors?.id ?? null
	)}
	<form
		method="POST"
		action="?/assignInstructor"
		id="assign-form-{rowData.id}"
		use:enhance={() => {
			const toastId = toast.loading('Saving assignment...');
			return async ({ update, result }) => {
				if (result.type === 'success') {
					toast.success(result.data?.message, { id: toastId });
					// No full invalidateAll() needed, just update the data
					await update({ reset: false });
				} else if (result.type === 'failure') {
					toast.error(result.data?.message, { id: toastId });
					// On failure, reset the select to its original value
					await invalidateAll();
				}
			};
		}}
	>
		<input type="hidden" name="classId" value={rowData.id} />
		<Select.Root
			type="single"
			name="instructorId"
			value={selectedInstructorIds[rowData.id]}
			onValueChange={(v) => {
				selectedInstructorIds[rowData.id] = v;
				handleAssignmentChange(rowData.id);
			}}
		>
			<Select.Trigger class="w-full">
				{#if selectedInstructorIds[rowData.id] && selectedInstructorIds[rowData.id] !== '0'}
					{@const instructor = data.instructors.find(
						(i) => i.id.toString() === selectedInstructorIds[rowData.id]
					)}
					{#if instructor}
						<span
							class:text-destructive={!qualifiedInstructors.find((qi) => qi.id === instructor.id)
								?.isQualified}
							>{instructor.name} ({instructor.current_load} / {instructor.max_load})</span
						>
					{:else}
						<span class="text-muted-foreground">Unassigned</span>
					{/if}
				{:else}
					<span class="text-muted-foreground">Unassigned</span>
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="0">Unassigned</Select.Item>
				{#if qualifiedInstructors.length > 0}
					{#each qualifiedInstructors as instructor}
						<Select.Item value={instructor.id.toString()}>
							{instructor.name} ({instructor.current_load} / {instructor.max_load})
							{#if !instructor.isQualified}
								<span class="text-destructive ml-2">(Unqualified)</span>
							{/if}
						</Select.Item>
					{/each}
				{:else}
					<div class="p-2 text-sm text-muted-foreground text-center">
						No qualified instructors found.
					</div>
				{/if}
			</Select.Content>
		</Select.Root>
	</form>
{/snippet}

{#snippet roomCell({ rowData }: { rowData: ClassOffering })}
	{@const collegeId = rowData.blocks?.programs?.college_id}
	{@const relevantRooms = data.rooms?.filter(
		(r) => r.is_general_use || (collegeId && r.owner_college_id === collegeId)
	)}
	{@const collegeRooms = relevantRooms?.filter((r) => r.owner_college_id === collegeId)}
	{@const generalRooms = relevantRooms?.filter(
		(r) => r.is_general_use && r.owner_college_id !== collegeId
	)}

	<form
		method="POST"
		action="?/assignRoom"
		id="room-form-{rowData.id}"
		use:enhance={() => {
			const toastId = toast.loading('Saving room preference...');
			return async ({ update, result }) => {
				if (result.type === 'success') {
					toast.success(result.data?.message, { id: toastId });
					await update({ reset: false });
				} else if (result.type === 'failure') {
					toast.error(result.data?.message, { id: toastId });
					await invalidateAll();
				}
			};
		}}
	>
		<input type="hidden" name="classId" value={rowData.id} />
		<Select.Root
			type="single"
			name="roomId"
			value={selectedRoomIds[rowData.id]}
			onValueChange={(v) => {
				selectedRoomIds[rowData.id] = v;
				handleRoomChange(rowData.id);
			}}
		>
			<Select.Trigger class="w-full">
				{#if selectedRoomIds[rowData.id] && selectedRoomIds[rowData.id] !== '0'}
					{data.rooms?.find((r) => r.id.toString() === selectedRoomIds[rowData.id])?.room_name ||
						'Unknown Room'}
				{:else}
					<span class="text-muted-foreground">No Preference</span>
				{/if}
			</Select.Trigger>
			<Select.Content>
				<Select.Item value="0">No Preference</Select.Item>
				{#if collegeRooms && collegeRooms.length > 0}
					<Select.Group>
						<Select.Label>College Rooms</Select.Label>
						{#each collegeRooms as room}
							<Select.Item value={room.id.toString()}>{room.room_name}</Select.Item>
						{/each}
					</Select.Group>
				{/if}
				{#if generalRooms && generalRooms.length > 0}
					<Select.Group>
						<Select.Label>General Use Rooms</Select.Label>
						{#each generalRooms as room}
							<Select.Item value={room.id.toString()}>{room.room_name}</Select.Item>
						{/each}
					</Select.Group>
				{/if}
			</Select.Content>
		</Select.Root>
	</form>
{/snippet}

<svelte:head>
	<title>Instructor Assignments | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Instructor Assignments</h1>
		<p class="text-muted-foreground mt-1">
			Assign instructors to class offerings for the selected academic term.
		</p>
	</header>

	<DataTable data={filteredClasses} {columns}>
		<div slot="filters" class="flex items-center gap-2">
			<Popover.Root bind:open={filterOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" class="w-[200px] justify-between" {...props}>
							Filter...
							<Filter class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-[250px] p-0" align="start">
					<Command.Root>
						<Command.Input placeholder="Search filters..." />
						<Command.List>
							<Command.Empty>No filter found.</Command.Empty>
							<Command.Group heading="Academic Year">
								{#each generateAcademicYears() as year}
									<Command.Item
										value={`year:${year}`}
										onSelect={() => {
											academicYear = year;
											handleFilterChange();
											filterOpen = false;
										}}
									>
										<Check
											class={cn(
												'mr-2 h-4 w-4',
												academicYear === year ? 'opacity-100' : 'opacity-0'
											)}
										/>
										{year}
									</Command.Item>
								{/each}
							</Command.Group>
							<Command.Group heading="Semester">
								{#each ['1st Semester', '2nd Semester', 'Summer'] as sem}
									<Command.Item
										value={`sem:${sem}`}
										onSelect={() => {
											semester = sem;
											handleFilterChange();
											filterOpen = false;
										}}
									>
										<Check
											class={cn('mr-2 h-4 w-4', semester === sem ? 'opacity-100' : 'opacity-0')}
										/>
										{sem}
									</Command.Item>
								{/each}
							</Command.Group>
							<Command.Group heading="College">
								<Command.Item
									value="col:all"
									onSelect={() => {
										collegeFilterId = '';
										handleFilterChange();
										filterOpen = false;
									}}
								>
									<Check
										class={cn('mr-2 h-4 w-4', !collegeFilterId ? 'opacity-100' : 'opacity-0')}
									/>
									All Colleges
								</Command.Item>
								{#each data.colleges || [] as college}
									<Command.Item
										value={`col:${college.college_name}`}
										onSelect={() => {
											collegeFilterId = college.id.toString();
											handleFilterChange();
											filterOpen = false;
										}}
									>
										<Check
											class={cn(
												'mr-2 h-4 w-4',
												collegeFilterId === college.id.toString() ? 'opacity-100' : 'opacity-0'
											)}
										/>
										{college.college_name}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
		</div>
		<div slot="toolbar" class="flex items-center">
			<ToggleGroup.Root type="single" variant="outline" bind:value={statusFilter}>
				<ToggleGroup.Item value="all"><List /></ToggleGroup.Item>
				<ToggleGroup.Item value="assigned"><UserCheck /></ToggleGroup.Item>
				<ToggleGroup.Item value="unassigned"><UserX /></ToggleGroup.Item>
			</ToggleGroup.Root>
		</div>
	</DataTable>

	<div class="text-center text-sm text-muted-foreground">
		Showing results for <span class="font-bold">{semester}</span> of Academic Year:
		<span class="font-bold">{academicYear}</span>
	</div>
</div>

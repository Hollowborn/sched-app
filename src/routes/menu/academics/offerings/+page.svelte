<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { PlusCircle, Trash2, LoaderCircle, Calendar, BookOpen, Filter } from '@lucide/svelte';
	import type { ColumnDef, RowSelectionState } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';
	import DataTable from '$lib/components/data-table/data-table.svelte';

	// Shadcn Components
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';

	type Subject = PageData['subjects'][number];
	type Block = PageData['blocks'][number];
	type Instructor = PageData['instructors'][number];
	type Room = PageData['rooms'][number];
	type ClassOffering = PageData['classes'][number] & {
		split_lecture?: boolean;
		lecture_days?: string[];
	};

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedClass = $state<ClassOffering | null>(null);
	let isSubmitting = $state(false);
	let rowSelection = $state<RowSelectionState>({});
	let selectedClasses = $state<ClassOffering[]>([]);

	// Filters
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let collegeFilterId = $state(data.filters.college);

	// --- Form State ---
	let createSubjectId = $state('');
	let createBlockId = $state('');
	let createInstructorId = $state('');
	let createPrefRoomId = $state('');
	let createOfferingCollegeId = $state('');
	let createSplitLecture = $state(false);
	let createLectureDays = $state<string[]>([]);

	// --- Derived State ---
	const selectedRowsCount = $derived(Object.keys(rowSelection).length);

	const createSubject = $derived(data.subjects?.find((s) => s.id.toString() === createSubjectId));
	const createBlockName = $derived(
		data.blocks?.find((b) => b.id.toString() === createBlockId)?.block_name
	);
	const atLectureDaysLimit = $derived(createLectureDays.length >= 2);

	const filteredClasses: ClassOffering[] = $derived.by(() => {
		if (!collegeFilterId) return data.classes || [];
		return (
			data.classes?.filter((c) => c.blocks?.programs?.college_id.toString() === collegeFilterId) ||
			[]
		);
	});

	// --- Create Modal Derived Logic ---
	let availableBlocks = $state<Block[]>([]);
	$effect(() => {
		const collegeIdToFilter =
			createSubject?.colleges.length === 1
				? createSubject.colleges[0].id
				: Number(createOfferingCollegeId);

		if (!collegeIdToFilter) {
			availableBlocks = [];
			return;
		}

		availableBlocks = data.blocks.filter((b) => b.programs?.college_id === collegeIdToFilter);
	});

	const qualifiedInstructors = $derived.by(() => {
		if (!createSubjectId) return [];
		const subjectId = Number(createSubjectId);
		return (
			data.instructors?.filter((i) =>
				i.instructor_subjects.some((is) => is.subject_id === subjectId)
			) || []
		);
	});

	$effect(() => {
		if (
			createInstructorId &&
			!qualifiedInstructors.find((i) => i.id.toString() === createInstructorId)
		) {
			createInstructorId = '';
		}
	});

	// --- Event Handlers ---
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

	function openDeleteModal(classItem: ClassOffering) {
		selectedClass = classItem; // For single delete
		deleteOpen = true;
	}

	function resetCreateForm() {
		createSubjectId = '';
		createBlockId = '';
		createInstructorId = '';
		createPrefRoomId = '';
		createOfferingCollegeId = '';
		createSplitLecture = false;
		createLectureDays = [];
	}

	$effect(() => {
		if (createSubject?.colleges.length === 1) {
			createOfferingCollegeId = createSubject.colleges[0].id.toString();
		} else {
			createOfferingCollegeId = '';
		}
		createBlockId = '';
	});

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
			header: 'Code',
			cell: ({ row }) => renderSnippet(codeBadge, { rowData: row.original })
		},
		{
			accessorFn: (d) => d.subjects?.subject_name,
			header: 'Subject Name',
			cell: ({ row }) => renderSnippet(subjectNameCell, { rowData: row.original })
		},
		{
			accessorFn: (d) => d.blocks?.block_name,
			header: 'Block'
		},
		{
			accessorKey: 'instructors',
			header: 'Instructor',
			cell: ({ row }) => renderSnippet(instructorCell, { rowData: row.original })
		},
		{
			accessorFn: (d) =>
				data.colleges?.find((c) => c.id === d.blocks?.programs?.college_id)?.college_name,
			header: 'College',
			cell: ({ row }) => renderSnippet(collegeBadge, { rowData: row.original })
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) => renderSnippet(actionsCell, { rowData: row.original }),
			meta: {
				class: 'text-right'
			}
		}
	];
</script>

{#snippet codeBadge({ rowData }: { rowData: ClassOffering })}
	<Badge variant="outline">{rowData.subjects?.subject_code || 'N/A'}</Badge>
{/snippet}

{#snippet subjectNameCell({ rowData }: { rowData: ClassOffering })}
	<div class="flex items-center gap-2">
		<span>{rowData.subjects?.subject_name || 'N/A'}</span>
		<div class="flex gap-1">
			{#if rowData.split_lecture && rowData.lecture_days}
				{#each rowData.lecture_days as day}
					<Badge
						variant="outline"
						class="border font-mono"
						style={`
							background-color: oklch(from ${dayColorMap[day]} l c h / 0.15);
							color: ${dayColorMap[day]};
							border-color: oklch(from ${dayColorMap[day]} l c h / 0.2);
						`}
					>
						{day.slice(0, 3)}
					</Badge>
				{/each}
			{/if}
		</div>
	</div>
{/snippet}

{#snippet instructorCell({ rowData }: { rowData: ClassOffering })}
	{#if rowData.instructors?.name}
		{rowData.instructors.name}
	{:else}
		<span class="text-muted-foreground italic">Unassigned</span>
	{/if}
{/snippet}

{#snippet collegeBadge({ rowData }: { rowData: ClassOffering })}
	<Badge variant="secondary">
		{data.colleges?.find((c) => c.id === rowData.blocks?.programs?.college_id)?.college_name ||
			'N/A'}
	</Badge>
{/snippet}

{#snippet actionsCell({ rowData }: { rowData: ClassOffering })}
	<div class="flex justify-end">
		<Button
			onclick={() => openDeleteModal(rowData)}
			variant="ghost"
			size="icon"
			class="text-destructive hover:text-destructive"
			disabled={isSubmitting}
		>
			<Trash2 class="h-4 w-4" />
		</Button>
	</div>
{/snippet}

<svelte:head>
	<title>Class Offerings | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Class Offerings</h1>
		<p class="text-muted-foreground mt-1">
			Manage which subjects are offered for a specific academic year and semester.
		</p>
	</header>

	<DataTable
		data={filteredClasses}
		{columns}
		showCheckbox={true}
		bind:rowSelection
		bind:selectedRowsData={selectedClasses}
	>
		<div slot="filters" class="flex flex-wrap items-center gap-4">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={academicYear}
					onValueChange={(v) => {
						if (v) {
							academicYear = v;
							handleFilterChange();
						}
					}}
				>
					<Select.Trigger class="w-full sm:w-[150px]">
						<span>{academicYear || 'Academic Year'}</span>
					</Select.Trigger>
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
						if (v) {
							semester = v;
							handleFilterChange();
						}
					}}
				>
					<Select.Trigger class="w-full sm:w-[150px]">
						<span>{semester || 'Semester'}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="1st Semester">1st Semester</Select.Item>
						<Select.Item value="2nd Semester">2nd Semester</Select.Item>
						<Select.Item value="Summer">Summer</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<Filter class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={collegeFilterId}
					onValueChange={(v) => {
						collegeFilterId = v;
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-full sm:w-[200px]">
						<span class="truncate max-w-[200px]"
							>{data.colleges?.find((c) => c.id.toString() === collegeFilterId)?.college_name ||
								'All Colleges'}</span
						>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="">All Colleges</Select.Item>
						{#each data.colleges || [] as college}
							<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<div slot="toolbar" class="flex items-center gap-2">
			<Button
				variant={selectedRowsCount > 0 ? 'destructive' : 'outline'}
				class={selectedRowsCount === 0 ? 'text-muted-foreground' : ''}
				disabled={isSubmitting || selectedRowsCount === 0}
				onclick={() => {
					selectedClass = null; // Ensure bulk delete mode
					deleteOpen = true;
				}}
			>
				<Trash2 class="mr-2 h-4 w-4" />
				Delete ({selectedRowsCount})
			</Button>

			<Button onclick={() => (createOpen = true)} disabled={isSubmitting}>
				<PlusCircle class="mr-2 h-4 w-4" />
				Create Offering
			</Button>
		</div>
	</DataTable>

	<div class="flex justify-end items-center text-sm text-muted-foreground">
		<div>
			Showing results for <span class="font-bold">{semester}</span> of Academic Year:
			<span class="font-bold">{academicYear}</span>
		</div>
	</div>
</div>

<!-- === MODALS === -->
<Dialog.Root bind:open={createOpen} onOpenChange={(open) => !open && resetCreateForm()}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Class Offering</Dialog.Title>
			<Dialog.Description>
				Assign a subject from the catalog to a block for {academicYear}, {semester}.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createClass"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating offering...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						createOpen = false;
						await invalidateAll();
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="academic_year" value={academicYear} />
			<input type="hidden" name="semester" value={semester} />
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label>Subject</Label>
					<Select.Root name="subject_id" type="single" bind:value={createSubjectId}>
						<Select.Trigger>
							<span class="placeholder:text-muted-foreground">
								{createSubject?.subject_name || 'Select a subject'}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#each data.subjects as subject}
								<Select.Item value={subject.id.toString()}>
									{subject.subject_code} - {subject.subject_name}
								</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				{#if createSubject && createSubject.colleges.length > 1}
					<div class="space-y-2">
						<Label>Offered By College</Label>
						<Select.Root
							name="offering_college_id"
							type="single"
							bind:value={createOfferingCollegeId}
						>
							<Select.Trigger>
								<span class="placeholder:text-muted-foreground">
									{data.colleges.find((c) => c.id.toString() === createOfferingCollegeId)
										?.college_name || 'Select a college'}
								</span>
							</Select.Trigger>
							<Select.Content>
								{#each createSubject.colleges as college}
									<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}

				<div class="space-y-2">
					<Label>Block Section</Label>
					<Select.Root
						name="block_id"
						type="single"
						bind:value={createBlockId}
						disabled={!createOfferingCollegeId}
					>
						<Select.Trigger disabled={!createOfferingCollegeId}>
							<span class="placeholder:text-muted-foreground"
								>{createBlockName || 'Select a block'}</span
							>
						</Select.Trigger>
						<Select.Content>
							{#if !createOfferingCollegeId}
								<div class="p-2 text-sm text-muted-foreground text-center">
									Select a subject first
								</div>
							{:else if availableBlocks.length === 0}
								<div class="p-2 text-sm text-muted-foreground text-center">
									No blocks for this college
								</div>
							{:else}
								{#each availableBlocks as block}
									<Select.Item value={block.id.toString()}>{block.block_name}</Select.Item>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Instructor (Optional)</Label>
					<Select.Root
						type="single"
						name="instructor_id"
						bind:value={createInstructorId}
						disabled={!createSubjectId}
					>
						<Select.Trigger disabled={!createSubjectId}>
							<span class="placeholder:text-muted-foreground">
								{qualifiedInstructors.find((i) => i.id.toString() === createInstructorId)?.name ||
									'Assign an instructor'}
							</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="0">Unassigned</Select.Item>
							{#if qualifiedInstructors.length > 0}
								{#each qualifiedInstructors as instructor}
									<Select.Item value={instructor.id.toString()}>{instructor.name}</Select.Item>
								{/each}
							{:else if createSubjectId}
								<div class="p-2 text-sm text-muted-foreground text-center">
									No qualified instructors for this subject.
								</div>
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Preferred Room (Optional)</Label>
					<Select.Root type="single" name="pref_room_id" bind:value={createPrefRoomId}>
						<Select.Trigger>
							<span class="placeholder:text-muted-foreground"
								>{data.rooms.find((r) => r.id.toString() === createPrefRoomId)?.room_name ||
									'Select a preferred room'}</span
							>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="0">No Preference</Select.Item>
							{#each data.rooms || [] as room}
								<Select.Item value={room.id.toString()}
									>{room.room_name} ({room.building})</Select.Item
								>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>

				<div class="flex items-center space-x-2 rounded-md border p-4">
					<Switch id="split-lecture-switch" bind:checked={createSplitLecture} />
					<input type="hidden" name="split_lecture" value={createSplitLecture} />
					<Label for="split-lecture-switch" class="ml-2">Split Lecture into two sessions</Label>
				</div>

				{#if createSplitLecture}
					<div class="space-y-2 pt-2">
						<Label>Lecture Days</Label>
						<div class="flex flex-wrap gap-4">
							{#each ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'] as day}
								<div class="flex items-center space-x-2">
									<Checkbox
										id={day}
										checked={createLectureDays.includes(day)}
										disabled={atLectureDaysLimit && !createLectureDays.includes(day)}
										onCheckedChange={(checked) => {
											if (checked) {
												createLectureDays = [...createLectureDays, day];
											} else {
												createLectureDays = createLectureDays.filter((d) => d !== day);
											}
										}}
									/>
									<Label
										for={day}
										class={atLectureDaysLimit && !createLectureDays.includes(day)
											? 'text-muted-foreground'
											: ''}>{day}</Label
									>
								</div>
							{/each}
						</div>
						<p class="text-sm text-muted-foreground">Select up to 2 days.</p>
						<input type="hidden" name="lecture_days" value={JSON.stringify(createLectureDays)} />
					</div>
				{/if}
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create Offering
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure?</Dialog.Title>
			<Dialog.Description>
				{#if selectedClass}
					This will permanently delete the class offering for <strong
						>{selectedClass.subjects?.subject_code}</strong
					>
					for block <strong>{selectedClass.blocks?.block_name}</strong>.
				{:else if selectedRowsCount > 0}
					This will permanently delete <strong>{selectedRowsCount}</strong> selected class offerings.
				{/if}
				This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/deleteClass"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Deleting offering...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						deleteOpen = false;
						await invalidateAll();
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			{#if selectedClass}
				<input type="hidden" name="id" value={selectedClass.id} />
			{:else}
				<input type="hidden" name="ids" value={selectedClasses.map((c) => c.id).join(',')} />
			{/if}
			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						deleteOpen = false;
						if (!selectedClass) rowSelection = {};
					}}
					disabled={isSubmitting}>Cancel</Button
				>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Yes, Delete {selectedClass ? 'Offering' : `${selectedRowsCount} Offerings`}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

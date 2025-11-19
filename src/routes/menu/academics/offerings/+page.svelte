<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		AlertCircle,
		PlusCircle,
		Trash2,
		LoaderCircle,
		Search,
		Calendar,
		BookOpen,
		Filter
	} from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as ButtonGroup from '$lib/components/ui/button-group';
	import { Badge } from '$lib/components/ui/badge';

	type Subject = PageData['subjects'][number];
	type Block = PageData['blocks'][number];
	type Instructor = PageData['instructors'][number];
	type Room = PageData['rooms'][number];
	type ClassOffering = PageData['classes'][number];

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedClass = $state<ClassOffering | null>(null);
	let isSubmitting = $state(false);
	let selectedRows = $state<number[]>([]);

	// Filters
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let collegeFilterId = $state(data.filters.college);
	let searchQuery = $state('');

	// --- Form State ---
	let createSubjectId = $state('');
	let createBlockId = $state('');
	let createInstructorId = $state('');
	let createPrefRoomId = $state('');
	let createOfferingCollegeId = $state(''); // For subjects in multiple colleges

	// --- Derived State ---
	const selectedRowCount = $derived(selectedRows.length);
	const hasSelection = $derived(selectedRowCount > 0);

	const createSubject = $derived(data.subjects?.find((s) => s.id.toString() === createSubjectId));
	const createBlockName = $derived(
		data.blocks?.find((b) => b.id.toString() === createBlockId)?.block_name
	);

	const filteredClasses: ClassOffering[] = $derived.by(() => {
		const classes = data.classes || [];
		if (!searchQuery) return classes;
		const lowerQuery = searchQuery.toLowerCase();
		return classes.filter((c) => {
			const subjectCode = c.subjects?.subject_code.toLowerCase() || '';
			const subjectName = c.subjects?.subject_name.toLowerCase() || '';
			const instructorName = c.instructors?.name.toLowerCase() || '';
			const blockName = c.blocks?.block_name.toLowerCase() || '';
			return (
				subjectCode.includes(lowerQuery) ||
				subjectName.includes(lowerQuery) ||
				instructorName.includes(lowerQuery) ||
				blockName.includes(lowerQuery)
			);
		});
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
		// If the selected instructor is not in the new list of qualified instructors, reset the selection.
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
		selectedClass = classItem;
		deleteOpen = true;
	}

	function toggleSelectAll(checked: boolean) {
		selectedRows = checked ? filteredClasses.map((c) => c.id) : [];
	}

	function toggleSelectRow(id: number, checked: boolean) {
		if (checked) {
			selectedRows = [...selectedRows, id];
		} else {
			selectedRows = selectedRows.filter((rowId) => rowId !== id);
		}
	}

	let isAllSelected = $derived(
		filteredClasses?.length > 0 && selectedRowCount === filteredClasses?.length
	);
	let isIndeterminate = $derived(
		selectedRowCount > 0 && selectedRowCount < (filteredClasses?.length || 0)
	);

	function resetCreateForm() {
		createSubjectId = '';
		createBlockId = '';
		createInstructorId = '';
		createPrefRoomId = '';
		createOfferingCollegeId = '';
	}

	$effect(() => {
		if (createSubject?.colleges.length === 1) {
			createOfferingCollegeId = createSubject.colleges[0].id.toString();
		} else {
			createOfferingCollegeId = '';
		}
		createBlockId = '';
	});
</script>

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

	<Card.Root>
		<Card.Content class="p-4 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
			<div class="flex flex-col sm:flex-row flex-wrap flex-1 items-center gap-4 w-full md:w-auto">
				<div class="flex w-full sm:w-auto items-center gap-2">
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
						<Select.Trigger class="w-full sm:w-[150px] shadow-sm">
							<span>{academicYear || 'Academic Year'}</span>
						</Select.Trigger>
						<Select.Content>
							{#each generateAcademicYears() as year}
								<Select.Item value={year}>{year}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex w-full sm:w-auto items-center gap-2">
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
						<Select.Trigger class="w-full sm:w-[150px] shadow-sm">
							<span>{semester || 'Semester'}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="1st Semester">1st Semester</Select.Item>
							<Select.Item value="2nd Semester">2nd Semester</Select.Item>
							<Select.Item value="Summer">Summer</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				<div class="flex w-full sm:w-auto items-center gap-2">
					<Filter class="h-4 w-4 text-muted-foreground" />
					<Select.Root
						type="single"
						value={collegeFilterId}
						onValueChange={(v) => {
							collegeFilterId = v;
							handleFilterChange();
						}}
					>
						<Select.Trigger class="w-full sm:w-[200px] shadow-sm">
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
				<div class="relative w-full sm:max-w-sm">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search code, subject, instructor..."
						class="pl-8 shadow"
						bind:value={searchQuery}
					/>
				</div>
			</div>

			<div class="flex flex-col md:flex-row gap-2">
				<ButtonGroup.Root>
					{#if hasSelection}
						<Button
							class="w-full md:w-auto"
							variant="destructive"
							disabled={isSubmitting}
							onclick={() => {
								selectedClass = null;
								deleteOpen = true;
							}}
						>
							<Trash2 class="mr-2 h-4 w-4" />
							Delete ({selectedRowCount})
						</Button>
					{:else}
						<Button variant="outline" disabled={true} class="w-full md:w-auto">
							<Trash2 class="mr-2 h-4 w-4" />
							Delete (0)
						</Button>
					{/if}

					<Button onclick={() => (createOpen = true)} class="w-full md:w-auto">
						<PlusCircle class="mr-2 h-4 w-4" />
						Create Offering
					</Button>
				</ButtonGroup.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<div class="border rounded-md">
		<Table.Root>
			<Table.Header class="bg-muted/50">
				<Table.Row>
					<Table.Head class="w-[50px]">
						<Checkbox
							checked={isAllSelected}
							indeterminate={isIndeterminate}
							onCheckedChange={toggleSelectAll}
						/>
					</Table.Head>
					<Table.Head>Code</Table.Head>
					<Table.Head>Subject Name</Table.Head>
					<Table.Head>Block</Table.Head>
					<Table.Head>Instructor</Table.Head>
					<Table.Head>College</Table.Head>
					<Table.Head class="text-right pr-6">Actions</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredClasses.length > 0}
					{#each filteredClasses as classItem (classItem.id)}
						<Table.Row selected={selectedRows.includes(classItem.id)}>
							<Table.Cell>
								<Checkbox
									checked={selectedRows.includes(classItem.id)}
									onCheckedChange={(checked) => toggleSelectRow(classItem.id, checked)}
								/>
							</Table.Cell>
							<Table.Cell class="font-medium"
								>{classItem.subjects?.subject_code || 'N/A'}</Table.Cell
							>
							<Table.Cell>{classItem.subjects?.subject_name || 'N/A'}</Table.Cell>
							<Table.Cell>{classItem.blocks?.block_name || 'N/A'}</Table.Cell>
							<Table.Cell>
								{#if classItem.instructors?.name}
									{classItem.instructors.name}
								{:else}
									<span class="text-muted-foreground italic">Unassigned</span>
								{/if}
							</Table.Cell>
							<Table.Cell>
								<Badge variant="secondary">
									{data.colleges?.find((c) => c.id === classItem.blocks?.programs?.college_id)
										?.college_name || 'N/A'}
								</Badge>
							</Table.Cell>
							<Table.Cell class="text-right">
								<Button
									onclick={() => openDeleteModal(classItem)}
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive"
									disabled={isSubmitting}
								>
									<Trash2 class="h-4 w-4" />
								</Button>
							</Table.Cell>
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={7} class="h-24 text-center">
							No class offerings found for this period/college.
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
	<div class="flex justify-between items-center text-sm text-muted-foreground">
		<div>
			{selectedRowCount} of {filteredClasses.length} row{selectedRowCount === 1 ? '' : 's'} selected
		</div>
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
				{:else if selectedRows.length > 0}
					This will permanently delete <strong>{selectedRows.length}</strong> selected class offerings.
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
				<input type="hidden" name="ids" value={selectedRows.join(',')} />
			{/if}
			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						deleteOpen = false;
						if (!selectedClass) selectedRows = [];
					}}
					disabled={isSubmitting}>Cancel</Button
				>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Yes, Delete {selectedClass ? 'Offering' : `${selectedRows.length} Offerings`}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

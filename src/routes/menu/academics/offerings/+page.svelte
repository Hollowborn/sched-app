<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { page } from '$app/stores';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		PlusCircle,
		Trash2,
		LoaderCircle,
		Calendar,
		BookOpen,
		Filter,
		Check,
		ChevronsUpDown,
		CopyPlus
	} from '@lucide/svelte';
	import type { ColumnDef, RowSelectionState } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import { cn } from '$lib/utils';
	import { tick } from 'svelte';

	// Shadcn Components
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { Switch } from '$lib/components/ui/switch';
	import * as Command from '$lib/components/ui/command';
	import * as Popover from '$lib/components/ui/popover';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { Input } from '$lib/components/ui/input';
	import * as ButtonGroup from '$lib/components/ui/button-group';

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
	let bulkCreateOpen = $state(false);

	// Filters
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let collegeFilterId = $state(data.filters.college);

	// --- Form State ---
	let createSubjectId = $state('');
	let createBlockId = $state('');
	let createInstructorId = $state('');

	let createPriorityRoomId = $state('');
	let createOptionRoomIds = $state<number[]>([]);
	let createOfferingCollegeId = $state('');
	let createSplitLecture = $state(false);
	let createLectureDays = $state<string[]>([]);

	// --- Bulk Form State ---
	let bulkCollegeId = $state('');
	let bulkBlockId = $state('');
	let bulkSubjectIds = $state<number[]>([]);
	let bulkSubjectSearch = $state('');
	let bulkSplitLecture = $state(false);
	let bulkDefaultOptionRoomIds = $state<number[]>([]);
	let bulkPriorityRoomId = $state('');

	// --- Combobox Open States ---
	let subjectOpen = $state(false);
	let collegeOpen = $state(false);
	let blockOpen = $state(false);
	let instructorOpen = $state(false);

	let priorityRoomOpen = $state(false);
	let optionRoomOpen = $state(false);
	let filterOpen = $state(false);
	let bulkCollegeOpen = $state(false);
	let bulkBlockOpen = $state(false);
	let bulkOptionRoomOpen = $state(false);
	let bulkPriorityRoomOpen = $state(false);

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

	// --- Bulk Create Modal Derived Logic ---
	const bulkAvailableBlocks = $derived(
		data.blocks.filter((b) => b.programs?.college_id.toString() === bulkCollegeId)
	);
	const bulkBlockName = $derived(
		data.blocks.find((b) => b.id.toString() === bulkBlockId)?.block_name
	);

	const bulkAvailableSubjects = $derived.by(() => {
		if (!bulkCollegeId) return [];
		const collegeIdNum = Number(bulkCollegeId);

		let subjects = data.subjects.filter((s) => s.colleges.some((c) => c.id === collegeIdNum));

		if (bulkSubjectSearch) {
			const lowerQuery = bulkSubjectSearch.toLowerCase();
			subjects = subjects.filter(
				(subject) =>
					subject.subject_name.toLowerCase().includes(lowerQuery) ||
					subject.subject_code.toLowerCase().includes(lowerQuery)
			);
		}

		return subjects.sort((a, b) => {
			const a_selected = bulkSubjectIds.includes(a.id);
			const b_selected = bulkSubjectIds.includes(b.id);

			if (a_selected === b_selected) {
				return a.subject_name.localeCompare(b.subject_name);
			}
			return a_selected ? -1 : 1;
		});
	});

	// Auto-select college for non-admins or if a filter is set
	$effect(() => {
		if (data.profile?.role === 'Dean' || data.profile?.role === 'Chairperson') {
			bulkCollegeId = data.userCollegeId?.toString() ?? '';
		} else if (collegeFilterId) {
			bulkCollegeId = collegeFilterId;
		} else {
			bulkCollegeId = ''; // Reset for admin if no filter is applied
		}
	});

	$effect(() => {
		if (bulkCollegeId) {
			bulkBlockId = '';
			bulkSubjectIds = [];
		}
	});

	// --- Create Modal Derived Logic ---
	let availableBlocks = $state<Block[]>([]);

	// Quick Action, Create
	$effect(() => {
		if ($page.url.searchParams.get('action') === 'create') {
			createOpen = true;
		}
	});

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
		createInstructorId = '';
		createPriorityRoomId = '';
		createOptionRoomIds = [];
		createOfferingCollegeId = '';
		createSplitLecture = false;
		createLectureDays = [];
	}

	function resetBulkCreateForm() {
		if (data.profile?.role !== 'Admin' && !collegeFilterId) {
			bulkCollegeId = data.userCollegeId?.toString() ?? '';
		} else if (!collegeFilterId) {
			bulkCollegeId = '';
		}
		bulkBlockId = '';
		bulkSubjectIds = [];
		bulkSubjectSearch = '';
		bulkSplitLecture = false;
		bulkDefaultOptionRoomIds = [];
		bulkPriorityRoomId = '';
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
		{#if rowData.split_lecture && rowData.lecture_days}
			<div class="flex gap-1">
				{#if rowData.lecture_days.length > 0}
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
				{:else if rowData.split_lecture}
					<Badge variant="secondary" class="border font-mono">/</Badge>
				{/if}
			</div>
		{/if}
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
	<Badge variant="outline">
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
							{#if data.profile?.role === 'Admin'}
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
							{/if}
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>
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
			<ButtonGroup.Root>
				<Button variant="outline" onclick={() => (createOpen = true)} disabled={isSubmitting}>
					<PlusCircle class="mr-2 h-4 w-4" />
					Create
				</Button>
				<Button onclick={() => (bulkCreateOpen = true)} variant="outline" disabled={isSubmitting}>
					<CopyPlus class="mr-2 h-4 w-4" />
					Bulk Create
				</Button>
			</ButtonGroup.Root>
		</div>
	</DataTable>

	<div class="text-center text-sm text-muted-foreground">
		Showing results for <span class="font-bold">{semester}</span> of Academic Year:
		<span class="font-bold">{academicYear}</span>
	</div>
</div>

<!-- === MODALS === -->
<Dialog.Root
	bind:open={createOpen}
	onOpenChange={(open) => {
		!open && resetCreateForm();

		if ($page.url.searchParams.get('action') === 'create') {
			const newUrl = new URL($page.url);
			newUrl.searchParams.delete('action');
			window.history.replaceState({}, '', newUrl);
		}
	}}
>
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
				<div class="space-y-2 flex flex-col">
					<Label>Subject</Label>
					<Popover.Root bind:open={subjectOpen}>
						<Popover.Trigger>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class="w-full justify-between"
									{...props}
									role="combobox"
									aria-expanded={subjectOpen}
								>
									<span class="truncate max-w-64"
										>{createSubject?.subject_name || 'Select a subject'}</span
									>
									<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-[400px] p-0">
							<Command.Root>
								<Command.Input placeholder="Search subject..." />
								<Command.List>
									<Command.Empty>No subject found.</Command.Empty>
									<Command.Group>
										{#each data.subjects as subject}
											<Command.Item
												value={subject.subject_name}
												onSelect={() => {
													createSubjectId = subject.id.toString();
													subjectOpen = false;
												}}
											>
												<Check
													class={cn(
														'mr-2 h-4 w-4',
														createSubjectId === subject.id.toString() ? 'opacity-100' : 'opacity-0'
													)}
												/>
												{subject.subject_code} - {subject.subject_name}
											</Command.Item>
										{/each}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
					<input type="hidden" name="subject_id" value={createSubjectId} />
				</div>

				{#if createSubject && createSubject.colleges.length > 1}
					<div class="space-y-2 flex flex-col">
						<Label>Offered By College</Label>
						<Popover.Root bind:open={collegeOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={collegeOpen}
									>
										<span class="truncate"
											>{data.colleges.find((c) => c.id.toString() === createOfferingCollegeId)
												?.college_name || 'Select a college'}</span
										>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[400px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search college..." />
									<Command.List>
										<Command.Empty>No college found.</Command.Empty>
										<Command.Group>
											{#each createSubject.colleges as college}
												<Command.Item
													value={college.college_name}
													onSelect={() => {
														createOfferingCollegeId = college.id.toString();
														collegeOpen = false;
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															createOfferingCollegeId === college.id.toString()
																? 'opacity-100'
																: 'opacity-0'
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
						<input type="hidden" name="offering_college_id" value={createOfferingCollegeId} />
					</div>
				{/if}

				<div class="space-y-2 flex flex-col">
					<Label>Block Section</Label>
					<Popover.Root bind:open={blockOpen}>
						<Popover.Trigger disabled={!createOfferingCollegeId}>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class="w-full justify-between"
									{...props}
									role="combobox"
									aria-expanded={blockOpen}
									disabled={!createOfferingCollegeId}
								>
									<span class="truncate">{createBlockName || 'Select a block'}</span>
									<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-[400px] p-0">
							<Command.Root>
								<Command.Input placeholder="Search block..." />
								<Command.List>
									<Command.Empty>No block found.</Command.Empty>
									<Command.Group>
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
												<Command.Item
													value={block.block_name}
													onSelect={() => {
														createBlockId = block.id.toString();
														blockOpen = false;
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															createBlockId === block.id.toString() ? 'opacity-100' : 'opacity-0'
														)}
													/>
													{block.block_name}
												</Command.Item>
											{/each}
										{/if}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
					<input type="hidden" name="block_id" value={createBlockId} />
				</div>
				<div class="space-y-2 flex flex-col">
					<Label>Instructor (Optional)</Label>
					<Popover.Root bind:open={instructorOpen}>
						<Popover.Trigger disabled={!createSubjectId}>
							{#snippet child({ props })}
								<Button
									variant="outline"
									class="w-full justify-between"
									{...props}
									role="combobox"
									aria-expanded={instructorOpen}
									disabled={!createSubjectId}
								>
									<span class="truncate"
										>{qualifiedInstructors.find((i) => i.id.toString() === createInstructorId)
											?.name || 'Assign an instructor'}</span
									>
									<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
								</Button>
							{/snippet}
						</Popover.Trigger>
						<Popover.Content class="w-[400px] p-0">
							<Command.Root>
								<Command.Input placeholder="Search instructor..." />
								<Command.List>
									<Command.Empty>No instructor found.</Command.Empty>
									<Command.Group>
										<Command.Item
											value="Unassigned"
											onSelect={() => {
												createInstructorId = '0';
												instructorOpen = false;
											}}
										>
											<Check
												class={cn(
													'mr-2 h-4 w-4',
													createInstructorId === '0' ? 'opacity-100' : 'opacity-0'
												)}
											/>
											Unassigned
										</Command.Item>
										{#if qualifiedInstructors.length > 0}
											{#each qualifiedInstructors as instructor}
												<Command.Item
													value={instructor.name}
													onSelect={() => {
														createInstructorId = instructor.id.toString();
														instructorOpen = false;
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															createInstructorId === instructor.id.toString()
																? 'opacity-100'
																: 'opacity-0'
														)}
													/>
													{instructor.name}
												</Command.Item>
											{/each}
										{:else if createSubjectId}
											<div class="p-2 text-sm text-muted-foreground text-center">
												No qualified instructors for this subject.
											</div>
										{/if}
									</Command.Group>
								</Command.List>
							</Command.Root>
						</Popover.Content>
					</Popover.Root>
					<input type="hidden" name="instructor_id" value={createInstructorId} />
				</div>
				<!-- Room Preferences -->
				<div class="space-y-3 border rounded-md p-3">
					<Label class="font-semibold">Room Preferences</Label>

					<!-- Priority Room -->
					<div class="space-y-2 flex flex-col">
						<Label class="text-xs text-muted-foreground">Priority Room (Best Choice)</Label>
						<Popover.Root bind:open={priorityRoomOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={priorityRoomOpen}
									>
										<span class="truncate"
											>{data.rooms.find((r) => r.id.toString() === createPriorityRoomId)
												?.room_name || 'Select priority room'}</span
										>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[400px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search room..." />
									<Command.List>
										<Command.Empty>No room found.</Command.Empty>
										<Command.Group>
											<Command.Item
												value="None"
												onSelect={() => {
													createPriorityRoomId = '';
													priorityRoomOpen = false;
												}}
											>
												<Check
													class={cn(
														'mr-2 h-4 w-4',
														createPriorityRoomId === '' ? 'opacity-100' : 'opacity-0'
													)}
												/>
												None
											</Command.Item>
											{#each data.rooms as room}
												<Command.Item
													value={room.room_name}
													onSelect={() => {
														createPriorityRoomId = room.id.toString();
														priorityRoomOpen = false;
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															createPriorityRoomId === room.id.toString()
																? 'opacity-100'
																: 'opacity-0'
														)}
													/>
													{room.room_name} ({room.type}, Cap: {room.capacity})
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<input type="hidden" name="priority_room_id" value={createPriorityRoomId} />
					</div>

					<!-- Alternative Rooms -->
					<div class="space-y-2 flex flex-col">
						<Label class="text-xs text-muted-foreground">Alternative Rooms (Options)</Label>
						<Popover.Root bind:open={optionRoomOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={optionRoomOpen}
									>
										<span class="truncate">
											{#if createOptionRoomIds.length === 0}
												Select alternatives...
											{:else}
												{createOptionRoomIds.length} room(s) selected
											{/if}
										</span>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[400px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search room..." />
									<Command.List>
										<Command.Empty>No room found.</Command.Empty>
										<Command.Group>
											{#each data.rooms as room}
												<Command.Item
													value={room.room_name}
													onSelect={() => {
														if (createOptionRoomIds.includes(room.id)) {
															createOptionRoomIds = createOptionRoomIds.filter(
																(id) => id !== room.id
															);
														} else {
															createOptionRoomIds = [...createOptionRoomIds, room.id];
														}
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															createOptionRoomIds.includes(room.id) ? 'opacity-100' : 'opacity-0'
														)}
													/>
													{room.room_name}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<input
							type="hidden"
							name="option_room_ids"
							value={JSON.stringify(createOptionRoomIds)}
						/>
						<div class="flex flex-wrap gap-1 mt-2">
							{#each createOptionRoomIds as optId}
								{@const r = data.rooms.find((rm) => rm.id === optId)}
								{#if r}
									<Badge variant="secondary" class="text-xs">
										{r.room_name}
										<button
											type="button"
											class="ml-1 hover:text-destructive"
											onclick={() =>
												(createOptionRoomIds = createOptionRoomIds.filter((id) => id !== optId))}
										>
											×
										</button>
									</Badge>
								{/if}
							{/each}
						</div>
					</div>
				</div>

				{#if createSubject?.lecture_hours > 0}
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

<!-- === BULK CREATE MODAL === -->
<Dialog.Root
	bind:open={bulkCreateOpen}
	onOpenChange={(open) => {
		!open && resetBulkCreateForm();
	}}
>
	<Dialog.Content class="max-w-2xl max-h-9/12 overflow-auto">
		<Dialog.Header>
			<Dialog.Title>Bulk Create Class Offerings</Dialog.Title>
			<Dialog.Description>
				Quickly create multiple class offerings for a single block for {academicYear}, {semester}.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createBulkClasses"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating offerings...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						bulkCreateOpen = false;
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
			<input type="hidden" name="subject_ids" value={bulkSubjectIds.join(',')} />
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2 flex flex-col">
						<Label>College</Label>
						<Popover.Root bind:open={bulkCollegeOpen}>
							<Popover.Trigger disabled={data.profile?.role !== 'Admin' || !!collegeFilterId}>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={bulkCollegeOpen}
										disabled={data.profile?.role !== 'Admin' || !!collegeFilterId}
									>
										<span class="truncate">
											{data.colleges.find((c) => c.id.toString() === bulkCollegeId)?.college_name ||
												'Select a college'}
										</span>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[300px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search college..." />
									<Command.List>
										<Command.Empty>No college found.</Command.Empty>
										<Command.Group>
											{#each data.colleges as college}
												<Command.Item
													value={college.college_name}
													onSelect={() => {
														bulkCollegeId = college.id.toString();
														bulkCollegeOpen = false;
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															bulkCollegeId === college.id.toString() ? 'opacity-100' : 'opacity-0'
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

					<div class="space-y-2 flex flex-col">
						<Label>Block Section</Label>
						<Popover.Root bind:open={bulkBlockOpen}>
							<Popover.Trigger disabled={!bulkCollegeId}>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={bulkBlockOpen}
										disabled={!bulkCollegeId}
									>
										<span class="truncate">{bulkBlockName || 'Select a block'}</span>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[300px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search block..." />
									<Command.List>
										<Command.Empty>No block found.</Command.Empty>
										<Command.Group>
											{#if bulkAvailableBlocks.length === 0}
												<div class="p-2 text-sm text-muted-foreground text-center">
													No blocks for this college.
												</div>
											{:else}
												{#each bulkAvailableBlocks as block}
													<Command.Item
														value={block.block_name}
														onSelect={() => {
															bulkBlockId = block.id.toString();
															bulkBlockOpen = false;
														}}
													>
														<Check
															class={cn(
																'mr-2 h-4 w-4',
																bulkBlockId === block.id.toString() ? 'opacity-100' : 'opacity-0'
															)}
														/>
														{block.block_name}
													</Command.Item>
												{/each}
											{/if}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<input type="hidden" name="block_id" value={bulkBlockId} />
					</div>
				</div>

				<div class="flex items-center space-x-2 rounded-md border p-4 mb-4">
					<Switch id="bulk-split-lecture" bind:checked={bulkSplitLecture} />
					<input type="hidden" name="split_lecture" value={bulkSplitLecture} />
					<Label for="bulk-split-lecture" class="ml-2 space-y-1">
						<span class="font-medium">Split lectures for all applicable subjects</span>
						<p class="text-xs text-muted-foreground">
							Only applies to selected subjects with lecture units. The scheduler will auto-assign
							days.
						</p>
					</Label>
				</div>

				<!-- Bulk Room Preferences -->
				<div class="space-y-3 border rounded-md p-3 mb-4">
					<Label class="font-semibold">Default Room Preferences</Label>

					<!-- Priority Room -->
					<div class="space-y-2 flex flex-col">
						<Label class="text-xs text-muted-foreground">Priority Room (Best Choice)</Label>
						<Popover.Root bind:open={bulkPriorityRoomOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={bulkPriorityRoomOpen}
									>
										<span class="truncate"
											>{data.rooms.find((r) => r.id.toString() === bulkPriorityRoomId)?.room_name ||
												'Select priority room'}</span
										>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[400px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search room..." />
									<Command.List>
										<Command.Empty>No room found.</Command.Empty>
										<Command.Group>
											<Command.Item
												value="None"
												onSelect={() => {
													bulkPriorityRoomId = '';
													bulkPriorityRoomOpen = false;
												}}
											>
												<Check
													class={cn(
														'mr-2 h-4 w-4',
														bulkPriorityRoomId === '' ? 'opacity-100' : 'opacity-0'
													)}
												/>
												None
											</Command.Item>
											{#each data.rooms as room}
												<Command.Item
													value={room.room_name}
													onSelect={() => {
														bulkPriorityRoomId = room.id.toString();
														bulkPriorityRoomOpen = false;
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															bulkPriorityRoomId === room.id.toString()
																? 'opacity-100'
																: 'opacity-0'
														)}
													/>
													{room.room_name} ({room.type}, Cap: {room.capacity})
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<input type="hidden" name="bulk_priority_room_id" value={bulkPriorityRoomId} />
					</div>

					<!-- Alternative Rooms -->
					<div class="space-y-2 flex flex-col">
						<Label class="text-xs text-muted-foreground">Alternative Rooms (Options)</Label>
						<Popover.Root bind:open={bulkOptionRoomOpen}>
							<Popover.Trigger>
								{#snippet child({ props })}
									<Button
										variant="outline"
										class="w-full justify-between"
										{...props}
										role="combobox"
										aria-expanded={bulkOptionRoomOpen}
									>
										<span class="truncate">
											{#if bulkDefaultOptionRoomIds.length === 0}
												Select alternatives...
											{:else}
												{bulkDefaultOptionRoomIds.length} room(s) selected
											{/if}
										</span>
										<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
									</Button>
								{/snippet}
							</Popover.Trigger>
							<Popover.Content class="w-[400px] p-0">
								<Command.Root>
									<Command.Input placeholder="Search room..." />
									<Command.List>
										<Command.Empty>No room found.</Command.Empty>
										<Command.Group>
											{#each data.rooms as room}
												<Command.Item
													value={room.room_name}
													onSelect={() => {
														if (bulkDefaultOptionRoomIds.includes(room.id)) {
															bulkDefaultOptionRoomIds = bulkDefaultOptionRoomIds.filter(
																(id) => id !== room.id
															);
														} else {
															bulkDefaultOptionRoomIds = [...bulkDefaultOptionRoomIds, room.id];
														}
													}}
												>
													<Check
														class={cn(
															'mr-2 h-4 w-4',
															bulkDefaultOptionRoomIds.includes(room.id)
																? 'opacity-100'
																: 'opacity-0'
														)}
													/>
													{room.room_name}
												</Command.Item>
											{/each}
										</Command.Group>
									</Command.List>
								</Command.Root>
							</Popover.Content>
						</Popover.Root>
						<input
							type="hidden"
							name="default_option_room_ids"
							value={JSON.stringify(bulkDefaultOptionRoomIds)}
						/>
						<div class="flex flex-wrap gap-1 mt-2">
							{#each bulkDefaultOptionRoomIds as optId}
								{@const r = data.rooms.find((rm) => rm.id === optId)}
								{#if r}
									<Badge variant="secondary" class="text-xs">
										{r.room_name}
										<button
											type="button"
											class="ml-1 hover:text-destructive"
											onclick={() =>
												(bulkDefaultOptionRoomIds = bulkDefaultOptionRoomIds.filter(
													(id) => id !== optId
												))}
										>
											×
										</button>
									</Badge>
								{/if}
							{/each}
						</div>
					</div>
				</div>

				<div class="space-y-2">
					<Label>Subjects</Label>
					<div class="rounded-md border">
						<div class="p-2">
							<Input
								placeholder="Search subjects..."
								bind:value={bulkSubjectSearch}
								disabled={!bulkCollegeId}
							/>
						</div>
						<div class="border-t">
							<ScrollArea class="h-64">
								<div class="p-4 space-y-2">
									{#if bulkAvailableSubjects.length > 0}
										{#each bulkAvailableSubjects as subject (subject.id)}
											<div class="flex items-center gap-2">
												<Checkbox
													id="bulk-subj-{subject.id}"
													checked={bulkSubjectIds.includes(subject.id)}
													onCheckedChange={(checked) => {
														if (checked) {
															bulkSubjectIds = [...bulkSubjectIds, subject.id];
														} else {
															bulkSubjectIds = bulkSubjectIds.filter((id) => id !== subject.id);
														}
													}}
												/>
												<Label for="bulk-subj-{subject.id}" class="font-normal w-full">
													{subject.subject_name}
													<Badge variant="secondary" class="ml-2">
														{subject.subject_code}
													</Badge>
												</Label>
											</div>
										{/each}
									{:else}
										<p class="text-sm text-muted-foreground text-center p-4">
											{#if !bulkCollegeId}
												Select a college to see available subjects.
											{:else if bulkSubjectSearch}
												No subjects match your search.
											{:else}
												No subjects found for this college.
											{/if}
										</p>
									{/if}
								</div>
							</ScrollArea>
						</div>
					</div>
					<p class="text-sm text-muted-foreground">
						Selected {bulkSubjectIds.length} subject(s).
					</p>
				</div>
			</div>
			<Dialog.Footer>
				<Button
					type="submit"
					disabled={isSubmitting || !bulkBlockId || bulkSubjectIds.length === 0}
				>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create {bulkSubjectIds.length} Offering(s)
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

					if (selectedRowsCount > 0) {
						rowSelection = {};
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

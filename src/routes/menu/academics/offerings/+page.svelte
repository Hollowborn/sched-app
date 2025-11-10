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
	import { Badge } from '$lib/components/ui/badge';

	// --- Type Definition ---
	type ClassOffering = {
		id: number;
		semester: '1st Semester' | '2nd Semester' | 'Summer';
		academic_year: string;
		subjects: { id: number; subject_code: string; subject_name: string; college_id: number } | null;
		instructors: { id: number; name: string } | null;
		blocks: {
			id: number;
			block_name: string;
			program_id: number;
			year_level: number;
			programs: {
				id: number;
				program_name: string;
				college_id: number;
			};
		} | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedClass = $state<ClassOffering | null>(null);
	let isSubmitting = $state(false);

	// Multi-select state
	let selectedRows = $state<number[]>([]); // Changed from Set to array for better reactivity
	let selectedRowCount = $derived(selectedRows.length);

	let hasSelection = $derived(selectedRowCount > 0);

	// Filters
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let colleges = $state(data.filters.college);
	let searchQuery = $state('');

	// Form State
	let createSubjectId = $state('');
	let createInstructorId = $state('');
	let createBlockId = $state('');

	// --- Derived State ---
	const createSubjectName = $derived(
		data.subjects?.find((s) => s.id.toString() === createSubjectId)?.subject_name
	);
	const createInstructorName = $derived(
		data.instructors?.find((i) => i.id.toString() === createInstructorId)?.name
	);
	const createBlockName = $derived(
		data.blocks?.find((b) => b.id.toString() === createBlockId)?.block_name
	);

	// Filter blocks based on selected subject's college
	let availableBlocks = $derived(() => {
		const blocks = data.blocks || [];
		$inspect('Initial blocks:', blocks);

		if (!createSubjectId) return [];

		const selectedSubject = data.subjects?.find((s) => s.id.toString() === createSubjectId);
		$inspect('Selected subject:', selectedSubject);

		if (!selectedSubject?.college_id) return [];

		$inspect('Looking for programs with college_id:', selectedSubject.college_id);
		const collegePrograms = (data.programs || []).filter(
			(p) => p.college_id === selectedSubject.college_id
		);
		$inspect('Found college programs:', collegePrograms);

		const programIds = new Set(collegePrograms.map((p) => p.id));
		console.log('Program IDs to filter by:', Array.from(programIds));

		// Get blocks from all programs in the college
		const filteredBlocks = blocks.filter((block) => {
			console.log('Checking block:', block);
			const isValid = block.programs && programIds.has(block.program_id); // Changed from block.programs.id to block.program_id
			console.log('Is valid block?', isValid);
			return isValid;
		});

		console.log('Filtered blocks:', filteredBlocks);

		return filteredBlocks.sort((a, b) => {
			if (!a.programs || !b.programs) return 0;
			// First sort by program name
			const programCompare = a.programs.program_name.localeCompare(b.programs.program_name);
			if (programCompare !== 0) return programCompare;
			// Then by year level
			return a.year_level - b.year_level;
		});
	});
	$inspect(availableBlocks);
	// Group or filter subjects based on selected college
	const availableSubjects = $derived(() => {
		const subjects = data.subjects || [];
		console.log('All subjects:', subjects); // Debug log

		// If a college is selected, filter subjects for that college
		if (colleges) {
			const filtered = subjects.filter((s) => s.college_id && s.college_id.toString() === colleges);
			console.log('Filtered subjects:', filtered); // Debug log
			return filtered;
		}

		return subjects;
	});

	const groupedSubjects = $derived(() => {
		const subjects = availableSubjects;
		if (!subjects.length) return {};

		// Group subjects by college
		const grouped = subjects.reduce(
			(acc, subject) => {
				const college = data.colleges?.find((c) => c.id === subject.college_id);
				const collegeName = college?.college_name || 'Uncategorized';

				if (!acc[collegeName]) {
					acc[collegeName] = [];
				}
				acc[collegeName].push(subject);
				return acc;
			},
			{} as Record<string, typeof subjects>
		);

		// Sort colleges alphabetically
		return Object.keys(grouped)
			.sort()
			.reduce(
				(acc, key) => {
					acc[key] = grouped[key];
					return acc;
				},
				{} as Record<string, typeof subjects>
			);
	});

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

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
		if (colleges) {
			params.set('college', colleges);
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

	// Multi-select handlers
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

	// console log (reactive)
	$inspect(data.blocks);
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
		<Card.Content class="m-2 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
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
						value={colleges}
						onValueChange={(v) => {
							colleges = v;
							createSubjectId = ''; // Reset subject selection when changing colleges
							handleFilterChange();
						}}
					>
						<Select.Trigger class="w-full sm:w-[200px] shadow-sm">
							<span class="truncate max-w-[200px]"
								>{data.colleges?.find((c) => c.id.toString() === colleges)?.college_name ||
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
				{#if hasSelection}
					<Button
						class="w-full md:w-auto"
						variant="destructive"
						disabled={isSubmitting}
						onclick={() => {
							selectedClass = null; // Clear single selection
							deleteOpen = true; // Open modal for bulk delete
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
									{data.programs?.find((p) => p.id === classItem.subjects?.program_id)
										?.program_name || 'N/A'}
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
<Dialog.Root bind:open={createOpen}>
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
					<Select.Root
						type="single"
						name="subject_id"
						bind:value={createSubjectId}
						onValueChange={() => {
							createBlockId = ''; // Reset block selection when subject changes
						}}
					>
						<Select.Trigger>
							<span class="placeholder:text-muted-foreground">
								{createSubjectName || 'Select a subject'}
							</span>
						</Select.Trigger>
						<Select.Content>
							{#if !data.subjects?.length}
								<div class="p-2 text-sm text-muted-foreground text-center">
									No subjects available
								</div>
							{:else if colleges && colleges !== ''}
								<!-- Filtered view for selected college -->
								{@const collegeSubjects = data.subjects.filter(
									(s) => s.college_id?.toString() === colleges
								)}
								{#if collegeSubjects.length === 0}
									<div class="p-2 text-sm text-muted-foreground text-center">
										No subjects available for selected college
									</div>
								{:else}
									{#each collegeSubjects as subject}
										<Select.Item value={subject.id.toString()}>
											{subject.subject_code} - {subject.subject_name}
										</Select.Item>
									{/each}
								{/if}
							{:else}
								<!-- Grouped view for all colleges -->
								{#each data.colleges || [] as college}
									{@const collegeSubjects = data.subjects.filter(
										(s) => s.college_id === college.id
									)}
									{#if collegeSubjects.length}
										<Select.Group>
											<Select.Label class="px-2 py-1.5 text-sm font-semibold bg-muted/50">
												{college.college_name}
											</Select.Label>
											{#each collegeSubjects as subject}
												<Select.Item class="pl-2" value={subject.id.toString()}>
													{subject.subject_code} - {subject.subject_name}
												</Select.Item>
											{/each}
										</Select.Group>
									{/if}
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Block Section</Label>
					<Select.Root type="single" name="block_id" bind:value={createBlockId}>
						<Select.Trigger>
							<span class="placeholder:text-muted-foreground"
								>{createBlockName || 'Select a block'}</span
							>
						</Select.Trigger>
						<Select.Content>
							{#if !createSubjectId}
								<div class="p-2 text-sm text-muted-foreground text-center">
									Please select a subject first
								</div>
							{:else if availableBlocks.length === 0}
								<div class="p-2 text-sm text-muted-foreground text-center">
									No blocks available for this program
								</div>
							{:else}
								{@const blocksByProgram = availableBlocks.reduce<
									Record<string, Record<number, typeof availableBlocks>>
								>((acc, block) => {
									if (!block.programs) return acc;
									const programName = block.programs.program_name;
									if (!acc[programName]) {
										acc[programName] = {};
									}
									const yearLevel = block.year_level;
									if (!acc[programName][yearLevel]) {
										acc[programName][yearLevel] = [];
									}
									acc[programName][yearLevel].push(block);
									return acc;
								}, {})}

								{#each Object.entries(blocksByProgram) as [programName, yearLevels]}
									<Select.Group>
										<Select.Label class="px-2 py-1.5 text-sm font-semibold bg-accent">
											{programName}
										</Select.Label>
										{#each Object.entries(yearLevels).sort(([a], [b]) => Number(a) - Number(b)) as [yearLevel, blocks]}
											<Select.Label class="pl-4 py-1 text-sm text-muted-foreground">
												Year {yearLevel}
											</Select.Label>
											{#each blocks as block}
												<Select.Item value={block.id.toString()} class="pl-6">
													{block.block_name}
												</Select.Item>
											{/each}
										{/each}
									</Select.Group>
								{/each}
							{/if}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Instructor (Optional)</Label>
					<Select.Root type="single" name="instructor_id" bind:value={createInstructorId}>
						<Select.Trigger>
							<span class="placeholder:text-muted-foreground"
								>{createInstructorName || 'Assign an instructor'}</span
							>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="0">Unassigned</Select.Item>
							{#each data.instructors || [] as instructor}
								<Select.Item value={instructor.id.toString()}>{instructor.name}</Select.Item>
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
						if (!selectedClass) selectedRows = []; // Clear multi-selection when canceling
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

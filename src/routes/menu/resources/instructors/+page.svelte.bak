<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import {
		User,
		LayoutGrid,
		Calendar,
		BookOpen,
		PlusCircle,
		Pencil,
		Trash2,
		LoaderCircle,
		BookMarked
	} from '@lucide/svelte';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';

	// shadcn-svelte components
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import ScrollArea from '$lib/components/ui/scroll-area/scroll-area.svelte';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';

	type Instructor = {
		id: number;
		name: string;
		email: string | null;
		max_load: number;
		min_load: number;
		current_load: number;
		colleges: { id: number; college_name: string }[];
		instructor_subjects: { subject_id: number }[];
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let viewMode: 'table' | 'grid' = $state('table');
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let isSubmitting = $state(false);

	let createOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let qualificationsOpen = $state(false);
	let selectedInstructor = $state<Instructor | null>(null);

	// Data Table State
	let rowSelection = $state<import('@tanstack/table-core').RowSelectionState>({});
	let selectedInstructors = $state<Instructor[]>([]);

	// Form State
	let formName = $state('');
	let formEmail = $state('');
	let formCollegeIds = $state<number[]>([]);
	let formMaxLoad = $state(18);
	let formMinLoad = $state(12);
	let formQualificationIds = $state<number[]>([]);

	// --- Event Handlers ---
	const availableSubjects = $derived.by(() => {
		if (!selectedInstructor) return [];
		const instructorCollegeIds = new Set(selectedInstructor.colleges.map((c) => c.id));
		return (
			data.subjects?.filter((subject) =>
				subject.colleges.some((college) => instructorCollegeIds.has(college.id))
			) || []
		);
	});
	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
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

	function getLoadColor(load: number, max: number) {
		const percentage = max > 0 ? (load / max) * 100 : 0;
		if (percentage > 100) return 'var(--color-destructive)';
		if (percentage >= 80) return 'var(--color-chart-1)';
		return 'var(--color-chart-2)';
	}

	function openEditModal(instructor: Instructor) {
		selectedInstructor = instructor;
		formName = instructor.name;
		formEmail = instructor.email || '';
		formCollegeIds = instructor.colleges.map((c) => c.id);
		formMaxLoad = instructor.max_load;
		formMinLoad = instructor.min_load;
		editOpen = true;
	}

	function openDeleteModal(instructor: Instructor) {
		selectedInstructor = instructor;
		deleteOpen = true;
	}

	function openQualificationsModal(instructor: Instructor) {
		selectedInstructor = instructor;
		formQualificationIds = instructor.instructor_subjects.map((s) => s.subject_id);
		qualificationsOpen = true;
	}

	function handleCreateFormReset() {
		formName = '';
		formEmail = '';
		formMaxLoad = 18;
		// If Dean, pre-select their college
		if (data.profile?.role === 'Dean' && data.profile.college_id) {
			formCollegeIds = [data.profile.college_id];
		} else {
			formCollegeIds = [];
		}
	}

	const columns: ColumnDef<Instructor>[] = [
		{
			accessorKey: 'name',
			header: 'Name'
		},
		{
			accessorKey: 'colleges',
			header: 'College',
			cell: ({ row }) => renderSnippet(collegesCell, { instructor: row.original })
		},
		{
			id: 'workload',
			header: 'Workload',
			cell: ({ row }) => renderSnippet(workloadCell, { instructor: row.original })
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) => renderSnippet(actionsCell, { instructor: row.original }),
			meta: {
				class: 'text-right'
			}
		}
	];
</script>

{#snippet collegesCell({ instructor }: { instructor: Instructor })}
	<div class="flex flex-wrap gap-1">
		{#each instructor.colleges as college}
			<Badge variant="secondary">{college.college_name}</Badge>
		{/each}
	</div>
{/snippet}

{#snippet workloadCell({ instructor }: { instructor: Instructor })}
	<div class="flex items-center gap-2">
		<Progress
			class="w-24"
			value={(instructor.current_load / instructor.max_load) * 100}
			style="--indicator-color: {getLoadColor(instructor.current_load, instructor.max_load)};"
		/>
		<span class="text-xs text-muted-foreground"
			>{instructor.current_load} / {instructor.max_load}</span
		>
	</div>
{/snippet}

{#snippet actionsCell({ instructor }: { instructor: Instructor })}
	<Button variant="ghost" size="sm" onclick={() => openQualificationsModal(instructor)}>
		<BookMarked class="h-4 w-4" />
	</Button>
	<Button variant="ghost" size="sm" onclick={() => openEditModal(instructor)}>
		<Pencil class="h-4 w-4" />
	</Button>
	{#if data.profile?.role === 'Admin'}
		<Button
			variant="ghost"
			size="icon"
			class="text-destructive hover:text-destructive"
			onclick={() => openDeleteModal(instructor)}
		>
			<Trash2 class="h-4 w-4" />
		</Button>
	{/if}
{/snippet}

<svelte:head>
	<title>Instructor Management | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Instructor Management</h1>
		<p class="text-muted-foreground mt-1">
			Manage faculty, their teaching loads, and subject qualifications.
		</p>
	</header>

	{#if viewMode === 'grid'}
		<!-- The existing Grid view remains unchanged -->
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#if data.instructors.length > 0}
				{#each data.instructors as instructor (instructor.id)}
					<div class="hover-lift transition-base">
						<Card.Root class="flex flex-col ">
							<Card.Header>
								<Card.Title>{instructor.name}</Card.Title>
								<Card.Description class="flex flex-wrap gap-1 pt-1">
									{#each instructor.colleges as college}
										<Badge variant="secondary">{college.college_name}</Badge>
									{/each}
								</Card.Description>
							</Card.Header>
							<Card.Content class="flex-grow">
								<div class="space-y-2">
									<Label class="text-xs text-muted-foreground"
										>Workload ({instructor.current_load} / {instructor.max_load} units)</Label
									>
									<Progress
										value={(instructor.current_load / instructor.max_load) * 100}
										style="--indicator-color: {getLoadColor(
											instructor.current_load,
											instructor.max_load
										)};"
									/>
								</div>
							</Card.Content>
							<Card.Footer class="flex justify-end gap-2">
								<Button
									variant="outline"
									size="sm"
									onclick={() => openQualificationsModal(instructor)}>Qualifications</Button
								>
								<Button variant="secondary" size="sm" onclick={() => openEditModal(instructor)}
									>Edit</Button
								>
							</Card.Footer>
						</Card.Root>
					</div>
				{/each}
			{:else}
				<div class="col-span-full text-center text-muted-foreground py-10">
					No instructors found matching your criteria.
				</div>
			{/if}
		</div>
	{:else}
		<DataTable
			data={data.instructors}
			{columns}
			showCheckbox={data.profile?.role === 'Admin'}
			bind:rowSelection
			bind:selectedRowsData={selectedInstructors}
		>
			<div slot="filters" class="flex items-center gap-4">
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
						<Select.Trigger class="w-[150px]">
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
						<Select.Trigger class="w-[150px]">
							<span>{semester || 'Semester'}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="1st Semester">1st Semester</Select.Item>
							<Select.Item value="2nd Semester">2nd Semester</Select.Item>
							<Select.Item value="Summer">Summer</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<div slot="toolbar" class="flex items-center gap-2">
				<Button
					variant={viewMode === 'table' ? 'secondary' : 'ghost'}
					size="icon"
					onclick={() => (viewMode = 'table')}><User class="h-4 w-4" /></Button
				>
				<Button
					variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
					size="icon"
					onclick={() => (viewMode = 'grid')}><LayoutGrid class="h-4 w-4" /></Button
				>
				{#if data.profile?.role === 'Admin' || data.profile?.role === 'Dean'}
					<Button onclick={() => (createOpen = true)}
						><PlusCircle class="mr-2 h-4 w-4" /> Add Instructor</Button
					>
				{/if}
			</div>
		</DataTable>
	{/if}
</div>

<!-- MODALS are unchanged -->
<!-- Create Instructor Modal -->
<Dialog.Root bind:open={createOpen} onOpenChange={(open) => !open && handleCreateFormReset()}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add New Instructor</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createInstructor"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating instructor...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						createOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label for="create-name">Full Name</Label>
					<Input id="create-name" name="name" required />
				</div>
				<div class="space-y-2">
					<Label for="create-email">Email Address</Label>
					<Input id="create-email" name="email" type="email" placeholder="Optional" />
				</div>
				<div class="space-y-2">
					<Label for="create-max-load">Max Load (Units)</Label>
					<Input id="create-max-load" name="max_load" type="number" step="0.5" value={18} />
				</div>
				<div class="space-y-2">
					<Label>Colleges</Label>
					<ScrollArea class="h-32 rounded-md border">
						<div class="p-4 space-y-2">
							{#if data.profile?.role === 'Dean'}
								{@const deanCollege = data.colleges.find((c) => c.id === data.profile?.college_id)}
								{#if deanCollege}
									<div class="flex items-center gap-2">
										<Checkbox
											id="create-col-{deanCollege.id}"
											name="college_ids"
											value={deanCollege.id}
											checked={true}
											disabled={true}
										/>
										<Label for="create-col-{deanCollege.id}" class="font-normal"
											>{deanCollege.college_name}</Label
										>
									</div>
									<!-- Hidden input to ensure the value is submitted even when checkbox is disabled -->
									<input type="hidden" name="college_ids" value={deanCollege.id} />
								{/if}
							{:else}
								{#each data.colleges as college}
									<div class="flex items-center gap-2">
										<Checkbox
											id="create-col-{college.id}"
											name="college_ids"
											value={college.id}
											onCheckedChange={(checked) => {
												if (checked) {
													formCollegeIds = [...formCollegeIds, college.id];
												} else {
													formCollegeIds = formCollegeIds.filter((id) => id !== college.id);
												}
											}}
										/>
										<Label for="create-col-{college.id}" class="font-normal"
											>{college.college_name}</Label
										>
									</div>
								{/each}
							{/if}
						</div>
					</ScrollArea>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create Instructor
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Instructor Modal -->
<Dialog.Root bind:open={editOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Instructor</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateInstructor"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving changes...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						editOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={selectedInstructor?.id} />
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label for="edit-name">Full Name</Label>
					<Input id="edit-name" name="name" bind:value={formName} required />
				</div>
				<div class="space-y-2">
					<Label for="edit-email">Email Address</Label>
					<Input id="edit-email" name="email" type="email" bind:value={formEmail} />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="edit-min-load">Min Load</Label>
						<Input
							id="edit-min-load"
							name="min_load"
							type="number"
							step="0.5"
							bind:value={formMinLoad}
						/>
					</div>
					<div class="space-y-2">
						<Label for="edit-max-load">Max Load</Label>
						<Input
							id="edit-max-load"
							name="max_load"
							type="number"
							step="0.5"
							bind:value={formMaxLoad}
						/>
					</div>
				</div>
				<div class="space-y-2">
					<Label>Colleges</Label>
					<ScrollArea class="h-32 rounded-md border">
						<div class="p-4 space-y-2">
							{#each data.colleges as college}
								<div class="flex items-center gap-2">
									<Checkbox
										id="edit-col-{college.id}"
										name="college_ids"
										value={college.id}
										checked={formCollegeIds.includes(college.id)}
										disabled={data.profile?.role === 'Dean'}
										onCheckedChange={(checked) => {
											if (checked) {
												formCollegeIds = [...formCollegeIds, college.id];
											} else {
												formCollegeIds = formCollegeIds.filter((id) => id !== college.id);
											}
										}}
									/>
									<Label for="edit-col-{college.id}" class="font-normal"
										>{college.college_name}</Label
									>
								</div>
							{/each}
						</div>
					</ScrollArea>
					{#if data.profile?.role === 'Dean'}
						<p class="text-xs text-muted-foreground">
							College affiliations can only be changed by an Administrator.
						</p>
					{/if}
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Manage Qualifications Modal -->
{#if selectedInstructor}
	<Dialog.Root bind:open={qualificationsOpen}>
		<Dialog.Content class="max-w-lg">
			<Dialog.Header>
				<Dialog.Title>Manage Qualifications for {selectedInstructor.name}</Dialog.Title>
				<Dialog.Description>
					Select the subjects this instructor is qualified to teach from their assigned colleges.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/updateQualifications"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Updating qualifications...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							qualificationsOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="instructor_id" value={selectedInstructor.id} />
				<div class="py-4">
					<ScrollArea class="h-64 rounded-md border">
						<div class="p-4 space-y-2">
							{#if availableSubjects.length > 0}
								{#each availableSubjects as subject (subject.id)}
									<div class="flex items-center gap-2">
										<Checkbox
											id="qual-subj-{subject.id}"
											name="subject_ids"
											value={subject.id}
											checked={formQualificationIds.includes(subject.id)}
											onCheckedChange={(checked) => {
												if (checked) {
													formQualificationIds = [...formQualificationIds, subject.id];
												} else {
													formQualificationIds = formQualificationIds.filter(
														(id) => id !== subject.id
													);
												}
											}}
										/>
										<Label for="qual-subj-{subject.id}" class="font-normal"
											>{subject.subject_code} - {subject.subject_name}</Label
										>
									</div>
								{/each}
							{:else}
								<p class="text-sm text-muted-foreground text-center p-4">
									No subjects found for the instructor's assigned college(s).
								</p>
							{/if}
						</div>
					</ScrollArea>
				</div>
				<Dialog.Footer>
					<Button type="submit" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
						Save Qualifications
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Delete Instructor Modal -->
{#if selectedInstructor}
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you absolutely sure?</Dialog.Title>
				<Dialog.Description>
					This action cannot be undone. This will permanently delete
					<strong>{selectedInstructor.name}</strong>.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/deleteInstructor"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Deleting instructor...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							deleteOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedInstructor.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (deleteOpen = false)}
						disabled={isSubmitting}>Cancel</Button
					>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
						Yes, Delete
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<style>
	:global([style*='--indicator-color']) > [data-slot='progress-indicator'] {
		background-color: var(--indicator-color);
	}
</style>

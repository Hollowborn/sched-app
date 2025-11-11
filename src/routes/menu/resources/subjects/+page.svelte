<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { AlertCircle, PlusCircle, Trash2, Pencil, LoaderCircle, Search } from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';

	// --- Type Definition for Clarity and Type Safety ---
	type Subject = {
		id: number;
		subject_code: string;
		subject_name: string;
		lecture_hours: number;
		lab_hours: number;
		colleges: { id: number; college_name: string }[];
	};

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- Component State ---
	let createOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedSubject = $state<Subject | null>(null);
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let selectedCollegeId = $state('all');

	// Multi-select state
	let selectedRows = $state<number[]>([]);
	let selectedRowCount = $derived(selectedRows.length);

	let hasSelection = $derived(selectedRowCount > 0);

	// --- Form State ---
	let createCode = $state('');
	let createName = $state('');
	let createLecHours = $state(3.0);
	let createLabHours = $state(0.0);
	let createCollegeIds = $state<number[]>([]);

	let editCode = $state('');
	let editName = $state('');
	let editLecHours = $state(3.0);
	let editLabHours = $state(0.0);
	let editCollegeIds = $state<number[]>([]);

	// --- Derived State ---
	const selectedCollegeName = $derived(
		data.colleges?.find((c) => c.id.toString() === selectedCollegeId)?.college_name
	);

	const filteredSubjects: Subject[] = $derived.by(() => {
		const subjects = data.subjects || [];

		const collegeFiltered =
			selectedCollegeId === 'all'
				? subjects
				: subjects.filter((s) => s.colleges.some((c) => c.id.toString() === selectedCollegeId));

		if (!searchQuery) {
			return collegeFiltered;
		}
		const lowerQuery = searchQuery.toLowerCase();
		return collegeFiltered.filter(
			(s) =>
				s.subject_code.toLowerCase().includes(lowerQuery) ||
				s.subject_name.toLowerCase().includes(lowerQuery)
		);
	});

	// --- Event Handlers ---
	function openEditModal(subject: Subject) {
		selectedSubject = subject;
		editCode = subject.subject_code;
		editName = subject.subject_name;
		editLecHours = subject.lecture_hours;
		editLabHours = subject.lab_hours;
		editCollegeIds = subject.colleges.map((c) => c.id);
		editOpen = true;
	}

	function openDeleteModal(subject: Subject) {
		selectedSubject = subject;
		deleteOpen = true;
	}

	function toggleSelectAll(checked: boolean) {
		selectedRows = checked ? filteredSubjects.map((s) => s.id) : [];
	}

	function toggleSelectRow(id: number, checked: boolean) {
		if (checked) {
			selectedRows = [...selectedRows, id];
		} else {
			selectedRows = selectedRows.filter((rowId) => rowId !== id);
		}
	}

	function handleCreateFormReset() {
		createCode = '';
		createName = '';
		createLecHours = 3.0;
		createLabHours = 0.0;
		createCollegeIds = [];
	}

	// Reactive stuff
	let isAllSelected = $derived(
		filteredSubjects?.length > 0 && selectedRowCount === filteredSubjects?.length
	);
	let isIndeterminate = $derived(
		selectedRowCount > 0 && selectedRowCount < (filteredSubjects?.length || 0)
	);
</script>

<svelte:head>
	<title>Subjects Management | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Subject & Course Management</h1>
		<p class="text-muted-foreground mt-1">
			A central hub to create, search, and manage all subjects offered by the university.
		</p>
	</header>

	<div class="flex items-center justify-between gap-4">
		<div class="flex flex-1 items-center gap-4">
			<div class="relative w-full max-w-sm">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input
					placeholder="Search by code or name..."
					class="pl-10"
					bind:value={searchQuery}
					disabled={isSubmitting}
				/>
			</div>
			<Select.Root type="single" bind:value={selectedCollegeId}>
				<Select.Trigger disabled={isSubmitting} class="w-[200px]">
					<span>{selectedCollegeName || 'Filter by College'}</span>
				</Select.Trigger>
				<Select.Content>
					<Select.Item value="all">All Colleges</Select.Item>
					{#if data.colleges}
						{#each data.colleges as college}
							<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
						{/each}
					{/if}
				</Select.Content>
			</Select.Root>
		</div>
		<div class="flex items-center gap-2">
			{#if data.profile?.role === 'Admin'}
				{#if hasSelection}
					<Button
						variant="destructive"
						disabled={isSubmitting}
						onclick={() => {
							selectedSubject = null;
							deleteOpen = true;
						}}
					>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete ({selectedRowCount})
					</Button>
				{:else}
					<Button variant="outline" disabled={true}>
						<Trash2 class="mr-2 h-4 w-4" />
						Delete (0)
					</Button>
				{/if}
				<Button onclick={() => (createOpen = true)} disabled={isSubmitting}>
					<PlusCircle class="mr-2 h-4 w-4" />
					Add Subject
				</Button>
			{/if}
		</div>
	</div>

	<div class="border rounded-md">
		<Table.Root>
			<Table.Header class="bg-muted/50">
				<Table.Row>
					{#if data.profile?.role === 'Admin'}
						<Table.Head class="w-[50px]">
							<Checkbox
								checked={isAllSelected}
								indeterminate={isIndeterminate}
								onCheckedChange={(checked) => toggleSelectAll(!!checked)}
							/>
						</Table.Head>
					{/if}
					<Table.Head class="w-[120px]">Code</Table.Head>
					<Table.Head>Subject Name</Table.Head>
					<Table.Head>Offered In</Table.Head>
					<Table.Head class="text-center">Lec Hours</Table.Head>
					<Table.Head class="text-center">Lab Hours</Table.Head>
					{#if data.profile?.role === 'Admin'}
						<Table.Head class="text-right pr-6">Actions</Table.Head>
					{/if}
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredSubjects.length > 0}
					{#each filteredSubjects as subject (subject.id)}
						<Table.Row selected={selectedRows.includes(subject.id)}>
							{#if data.profile?.role === 'Admin'}
								<Table.Cell>
									<Checkbox
										checked={selectedRows.includes(subject.id)}
										onCheckedChange={(checked) => toggleSelectRow(subject.id, !!checked)}
									/>
								</Table.Cell>
							{/if}
							<Table.Cell class="font-medium"
								><Badge variant="outline">{subject.subject_code}</Badge></Table.Cell
							>
							<Table.Cell>{subject.subject_name}</Table.Cell>
							<Table.Cell class="max-w-xs">
								<div class="flex flex-wrap gap-1">
									{#each subject.colleges as college}
										<Badge variant="secondary">{college.college_name}</Badge>
									{/each}
								</div>
							</Table.Cell>
							<Table.Cell class="text-center">{subject.lecture_hours}</Table.Cell>
							<Table.Cell class="text-center">{subject.lab_hours}</Table.Cell>
							{#if data.profile?.role === 'Admin'}
								<Table.Cell class="text-right">
									<Button
										onclick={() => openEditModal(subject)}
										variant="ghost"
										size="icon"
										disabled={isSubmitting}
									>
										<Pencil class="h-4 w-4" />
									</Button>
									<Button
										onclick={() => openDeleteModal(subject)}
										variant="ghost"
										size="icon"
										class="text-destructive hover:text-destructive"
										disabled={isSubmitting}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</Table.Cell>
							{/if}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={7} class="h-24 text-center">
							{#if searchQuery || selectedCollegeId !== 'all'}
								No subjects match your current filter.
							{:else}
								No subjects found. Start by adding a new subject.
							{/if}
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>

	<div class="text-sm text-muted-foreground">
		{selectedRowCount} of {filteredSubjects.length} row{selectedRowCount === 1 ? '' : 's'} selected
	</div>
</div>

<!-- === DIALOGS / MODALS === -->

<!-- Create Subject Dialog -->
<Dialog.Root bind:open={createOpen} onOpenChange={(open) => !open && handleCreateFormReset()}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add New Subject</Dialog.Title>
			<Dialog.Description>Enter the details for the new subject.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createSubject"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating subject...');

				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						await invalidateAll();
						createOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="create-code" class="text-right">Code</Label>
					<Input id="create-code" name="subject_code" bind:value={createCode} class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="create-name" class="text-right">Name</Label>
					<Input id="create-name" name="subject_name" bind:value={createName} class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="create-lec" class="text-right">Lec Hours</Label>
					<Input
						id="create-lec"
						name="lecture_hours"
						type="number"
						step="0.5"
						bind:value={createLecHours}
						class="col-span-3"
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="create-lab" class="text-right">Lab Hours</Label>
					<Input
						id="create-lab"
						name="lab_hours"
						type="number"
						step="0.5"
						bind:value={createLabHours}
						class="col-span-3"
					/>
				</div>
				<div class="grid grid-cols-4 items-start gap-4">
					<Label class="text-right pt-2">Colleges</Label>
					<ScrollArea class="col-span-3 h-32 rounded-md border">
						<div class="p-4 space-y-2">
							{#each data.colleges || [] as college}
								<div class="flex items-center gap-2">
									<Checkbox
										id="create-col-{college.id}"
										name="college_ids"
										value={college.id}
										onCheckedChange={(checked) => {
											if (checked) {
												createCollegeIds = [...createCollegeIds, college.id];
											} else {
												createCollegeIds = createCollegeIds.filter((id) => id !== college.id);
											}
										}}
									/>
									<Label for="create-col-{college.id}" class="font-normal"
										>{college.college_name}</Label
									>
								</div>
							{/each}
						</div>
					</ScrollArea>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Creating...
					{:else}
						Create Subject
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Subject Dialog -->
<Dialog.Root bind:open={editOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Subject: {selectedSubject?.subject_code}</Dialog.Title>
			<Dialog.Description>Update the details for this subject.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateSubject"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving changes...');

				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						await invalidateAll();
						editOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={selectedSubject?.id} />
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="edit-code" class="text-right">Code</Label>
					<Input id="edit-code" name="subject_code" bind:value={editCode} class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="edit-name" class="text-right">Name</Label>
					<Input id="edit-name" name="subject_name" bind:value={editName} class="col-span-3" />
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="edit-lec" class="text-right">Lec Hours</Label>
					<Input
						id="edit-lec"
						name="lecture_hours"
						type="number"
						step="0.5"
						bind:value={editLecHours}
						class="col-span-3"
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="edit-lab" class="text-right">Lab Hours</Label>
					<Input
						id="edit-lab"
						name="lab_hours"
						type="number"
						step="0.5"
						bind:value={editLabHours}
						class="col-span-3"
					/>
				</div>
				<div class="grid grid-cols-4 items-start gap-4">
					<Label class="text-right pt-2">Colleges</Label>
					<ScrollArea class="col-span-3 h-32 rounded-md border">
						<div class="p-4 space-y-2">
							{#each data.colleges || [] as college}
								<div class="flex items-center gap-2">
									<Checkbox
										id="edit-col-{college.id}"
										name="college_ids"
										value={college.id}
										checked={editCollegeIds.includes(college.id)}
										onCheckedChange={(checked) => {
											if (checked) {
												editCollegeIds = [...editCollegeIds, college.id];
											} else {
												editCollegeIds = editCollegeIds.filter((id) => id !== college.id);
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
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Saving...
					{:else}
						Save Changes
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Subject Dialog -->
<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure?</Dialog.Title>
			<Dialog.Description>
				{#if selectedSubject}
					This will permanently delete the subject
					<strong>{selectedSubject.subject_code} - {selectedSubject.subject_name}</strong>.
				{:else if selectedRows.length > 0}
					This will permanently delete <strong>{selectedRows.length}</strong> selected subjects.
				{/if}
				This action cannot be undone.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/deleteSubject"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Deleting subject...');

				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						await invalidateAll();
						deleteOpen = false;
						selectedRows = [];
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			{#if selectedSubject}
				<input type="hidden" name="id" value={selectedSubject.id} />
			{:else}
				<input type="hidden" name="ids" value={selectedRows.join(',')} />
			{/if}
			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						deleteOpen = false;
						if (!selectedSubject) selectedRows = []; // Clear multi-selection when canceling
					}}
					disabled={isSubmitting}>Cancel</Button
				>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Deleting...
					{:else}
						Yes, Delete {selectedSubject ? 'Subject' : `${selectedRows.length} Subjects`}
					{/if}
				</Button>
			</Dialog.Footer>
		</form></Dialog.Content
	>
</Dialog.Root>

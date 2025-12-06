<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { page } from '$app/stores';
	import { PlusCircle, Trash2, Pencil, LoaderCircle } from '@lucide/svelte';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import Checkbox from '$lib/components/ui/checkbox/checkbox.svelte';
	import ButtonGroup from '$lib/components/ui/button-group/button-group.svelte';

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
	let selectedCollegeId = $state('all');
	let rowSelection = $state<import('@tanstack/table-core').RowSelectionState>({});
	let selectedSubjects = $state<Subject[]>([]);

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

		return selectedCollegeId === 'all'
			? subjects
			: subjects.filter((s) => s.colleges.some((c) => c.id.toString() === selectedCollegeId));
	});

	const selectedRowsCount = $derived(Object.keys(rowSelection).length);

	// --- Effects ---
	$effect(() => {
		if ($page.url.searchParams.get('action') === 'create') {
			createOpen = true;
		}
	});

	// --- Event Handlers ---
	function openCreateModal() {
		handleCreateFormReset(); // Always reset before opening
		if (selectedCollegeId !== 'all') {
			// Pre-select the filtered college when creating
			createCollegeIds = [Number(selectedCollegeId)];
		}
		createOpen = true;
	}

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

	function handleCreateFormReset() {
		createCode = '';
		createName = '';
		createLecHours = 3.0;
		createLabHours = 0.0;
		createCollegeIds = [];
	}

	const columns: ColumnDef<Subject>[] = [
		{
			accessorKey: 'subject_code',
			header: 'Code',
			cell: ({ row }) => renderSnippet(codeBadge, { rowData: row.original })
		},
		{
			accessorKey: 'subject_name',
			header: 'Subject Name'
		},
		{
			accessorKey: 'colleges',
			header: 'Offered In',
			cell: ({ row }) => renderSnippet(collegesBadges, { rowData: row.original })
		},
		{
			accessorKey: 'lecture_hours',
			header: 'Lec Hours',
			meta: {
				class: 'text-center'
			}
		},
		{
			accessorKey: 'lab_hours',
			header: 'Lab Hours',
			meta: {
				class: 'text-center'
			}
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

{#snippet codeBadge({ rowData }: { rowData: Subject })}
	<Badge variant="outline">{rowData.subject_code}</Badge>
{/snippet}

{#snippet collegesBadges({ rowData }: { rowData: Subject })}
	<div class="flex flex-wrap gap-1">
		{#each rowData.colleges as college}
			<Badge variant="secondary">{college.college_name}</Badge>
		{/each}
	</div>
{/snippet}

{#snippet actionsCell({ rowData }: { rowData: Subject })}
	{#if data.profile?.role === 'Admin'}
		<Button
			onclick={() => openEditModal(rowData)}
			variant="ghost"
			size="icon"
			disabled={isSubmitting}
		>
			<Pencil class="h-4 w-4" />
		</Button>
		<Button
			onclick={() => openDeleteModal(rowData)}
			variant="ghost"
			size="icon"
			class="text-destructive hover:text-destructive"
			disabled={isSubmitting}
		>
			<Trash2 class="h-4 w-4" />
		</Button>
	{/if}
{/snippet}

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

	<DataTable
		data={filteredSubjects}
		{columns}
		showCheckbox={data.profile?.role === 'Admin'}
		bind:rowSelection
		bind:selectedRowsData={selectedSubjects}
	>
		<div slot="filters">
			<Select.Root type="single" bind:value={selectedCollegeId}>
				<Select.Trigger disabled={isSubmitting} class="truncate max-w-[200px]">
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
		<div slot="toolbar" class="flex items-center gap-2">
			{#if data.profile?.role === 'Admin'}
				<Button
					variant={selectedRowsCount > 0 ? 'destructive' : 'outline'}
					class={selectedRowsCount === 0 ? 'text-muted-foreground' : ''}
					disabled={isSubmitting || selectedRowsCount === 0}
					onclick={() => {
						selectedSubject = null; // Ensure we're in bulk delete mode
						deleteOpen = true;
					}}
				>
					<Trash2 class="mr-2 h-4 w-4" />
					Delete ({selectedRowsCount})
				</Button>
				<Button onclick={openCreateModal} disabled={isSubmitting}>
					<PlusCircle class="mr-2 h-4 w-4" />
					Add Subject
				</Button>
			{/if}
		</div>
	</DataTable>
</div>

<!-- === DIALOGS / MODALS === -->

<!-- Create Subject Dialog -->
<Dialog.Root
	bind:open={createOpen}
	onOpenChange={(open) => {
		if (!open) {
			handleCreateFormReset();
			// Clean up URL if it was opened via param
			if ($page.url.searchParams.get('action') === 'create') {
				const newUrl = new URL($page.url);
				newUrl.searchParams.delete('action');
				window.history.replaceState({}, '', newUrl);
			}
		}
	}}
>
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
					<div class="col-span-3 space-y-2">
						<ButtonGroup>
							<Button
								type="button"
								variant="outline"
								onclick={() => (createCollegeIds = (data.colleges || []).map((c) => c.id))}
							>
								Select All
							</Button>
							<Button type="button" variant="outline" onclick={() => (createCollegeIds = [])}>
								Deselect All
							</Button>
						</ButtonGroup>

						<ScrollArea class="h-32 rounded-md border">
							<div class="p-4 space-y-2">
								{#each data.colleges || [] as college}
									<div class="flex items-center gap-2">
										<Checkbox
											id="create-col-{college.id}"
											name="college_ids"
											value={college.id}
											checked={createCollegeIds.includes(college.id)}
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
					<div class="col-span-3 space-y-2">
						<ButtonGroup>
							<Button
								type="button"
								variant="outline"
								onclick={() => (editCollegeIds = (data.colleges || []).map((c) => c.id))}
							>
								Select All
							</Button>
							<Button type="button" variant="outline" onclick={() => (editCollegeIds = [])}>
								Deselect All
							</Button>
						</ButtonGroup>
						<ScrollArea class="h-32 rounded-md border">
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
				{:else if selectedSubjects.length > 0}
					This will permanently delete <strong>{selectedSubjects.length}</strong> selected subjects.
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
						rowSelection = {};
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
				<input type="hidden" name="ids" value={selectedSubjects.map((s) => s.id).join(',')} />
			{/if}
			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						deleteOpen = false;
					}}
					disabled={isSubmitting}>Cancel</Button
				>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Deleting...
					{:else}
						Yes, Delete {selectedSubject ? 'Subject' : `${selectedRowsCount} Subjects`}
					{/if}
				</Button>
			</Dialog.Footer>
		</form></Dialog.Content
	>
</Dialog.Root>

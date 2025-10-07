<script lang="ts">
	import type { PageData, ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';

	// ShadCN & Lucide Imports
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import { PlusCircle, Edit, Trash2, BookOpen } from 'lucide-svelte';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// Modal State
	let isCreateModalOpen = $state(false);
	let isEditModalOpen = $state(false);
	let isDeleteModalOpen = $state(false);
	let selectedSubject = $state<(typeof data.subjects)[0] | null>(null);

	// Form State
	let subjectCode = $state('');
	let subjectName = $state('');
	let lectureHours = $state(3.0);
	let labHours = $state(0.0);
	let collegeId = $state('');

	function openCreateModal() {
		// Reset form fields
		subjectCode = '';
		subjectName = '';
		lectureHours = 3.0;
		labHours = 0.0;
		collegeId = '';
		isCreateModalOpen = true;
	}

	function openEditModal(subject: (typeof data.subjects)[0]) {
		selectedSubject = subject;
		subjectCode = subject.subject_code;
		subjectName = subject.subject_name;
		lectureHours = subject.lecture_hours;
		labHours = subject.lab_hours;
		collegeId = String(subject.college_id);
		isEditModalOpen = true;
	}

	function openDeleteModal(subject: (typeof data.subjects)[0]) {
		selectedSubject = subject;
		isDeleteModalOpen = true;
	}

	// Handle form action feedback with toasts
	$effect(() => {
		if (form?.success) {
			toast.success(form.message);
			isCreateModalOpen = false;
			isEditModalOpen = false;
			isDeleteModalOpen = false;
		} else if (form?.error) {
			toast.error(form.message);
		}
	});
</script>

<div class="space-y-6">
	<header class="flex items-center justify-between">
		<div>
			<h1 class="text-2xl font-bold tracking-tight">Subject Management</h1>
			<p class="text-muted-foreground">Add, edit, and manage all academic subjects.</p>
		</div>
		<Button onclick={openCreateModal}>
			<PlusCircle class="mr-2 h-4 w-4" />
			Add New Subject
		</Button>
	</header>

	<Card.Root>
		<Card.Content class="p-0">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head class="w-[120px]">Code</Table.Head>
						<Table.Head>Subject Name</Table.Head>
						<Table.Head>College</Table.Head>
						<Table.Head class="text-center">Lec Hours</Table.Head>
						<Table.Head class="text-center">Lab Hours</Table.Head>
						<Table.Head class="text-right">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if data.subjects.length > 0}
						{#each data.subjects as subject (subject.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{subject.subject_code}</Table.Cell>
								<Table.Cell>{subject.subject_name}</Table.Cell>
								<Table.Cell>
									<Badge variant="secondary">{subject.colleges?.college_name || 'N/A'}</Badge>
								</Table.Cell>
								<Table.Cell class="text-center">{subject.lecture_hours}</Table.Cell>
								<Table.Cell class="text-center">{subject.lab_hours}</Table.Cell>
								<Table.Cell class="text-right">
									<div class="flex items-center justify-end gap-2">
										<Button variant="outline" size="icon" onclick={() => openEditModal(subject)}>
											<Edit class="h-4 w-4" />
										</Button>
										<Button
											variant="destructive"
											size="icon"
											onclick={() => openDeleteModal(subject)}
										>
											<Trash2 class="h-4 w-4" />
										</Button>
									</div>
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan={6} class="h-24 text-center">
								No subjects found. Get started by adding a new subject.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</Card.Content>
	</Card.Root>
</div>

<!-- Create Subject Dialog -->
<Dialog.Root bind:open={isCreateModalOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add a New Subject</Dialog.Title>
			<Dialog.Description>
				Fill in the details for the new subject. The code must be unique.
			</Dialog.Description>
		</Dialog.Header>
		<form method="POST" action="?/createSubject" use:enhance>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="subject_code" class="text-right">Code</Label>
					<Input
						id="subject_code"
						name="subject_code"
						class="col-span-3"
						bind:value={subjectCode}
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="subject_name" class="text-right">Name</Label>
					<Input
						id="subject_name"
						name="subject_name"
						class="col-span-3"
						bind:value={subjectName}
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="college_id" class="text-right">College</Label>
					<Select.Root type="single" name="college_id" bind:value={collegeId}>
						<Select.Trigger class="col-span-3">
							<span>Select a college {collegeId}</span>
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={String(college.id)}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="lecture_hours" class="text-right">Lec Hours</Label>
					<Input
						id="lecture_hours"
						name="lecture_hours"
						type="number"
						step="0.5"
						class="col-span-3"
						bind:value={lectureHours}
					/>
				</div>
				<div class="grid grid-cols-4 items-center gap-4">
					<Label for="lab_hours" class="text-right">Lab Hours</Label>
					<Input
						id="lab_hours"
						name="lab_hours"
						type="number"
						step="0.5"
						class="col-span-3"
						bind:value={labHours}
					/>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit">Create Subject</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Edit Subject Dialog -->
{#if selectedSubject}
	<Dialog.Root bind:open={isEditModalOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Edit: {selectedSubject.subject_code}</Dialog.Title>
				<Dialog.Description>Update the details for this subject.</Dialog.Description>
			</Dialog.Header>
			<form method="POST" action="?/updateSubject" use:enhance>
				<input type="hidden" name="id" value={selectedSubject.id} />
				<div class="grid gap-4 py-4">
					<!-- Form fields are identical to create, but pre-filled -->
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="edit_subject_code" class="text-right">Code</Label>
						<Input
							id="edit_subject_code"
							name="subject_code"
							class="col-span-3"
							bind:value={subjectCode}
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="edit_subject_name" class="text-right">Name</Label>
						<Input
							id="edit_subject_name"
							name="subject_name"
							class="col-span-3"
							bind:value={subjectName}
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="edit_college_id" class="text-right">College</Label>
						<Select.Root type="single" name="college_id" bind:value={collegeId}>
							<Select.Trigger class="col-span-3">
								<span>Select a college</span>
							</Select.Trigger>
							<Select.Content>
								{#each data.colleges as college}
									<Select.Item value={String(college.id)}>{college.college_name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="edit_lecture_hours" class="text-right">Lec Hours</Label>
						<Input
							id="edit_lecture_hours"
							name="lecture_hours"
							type="number"
							step="0.5"
							class="col-span-3"
							bind:value={lectureHours}
						/>
					</div>
					<div class="grid grid-cols-4 items-center gap-4">
						<Label for="edit_lab_hours" class="text-right">Lab Hours</Label>
						<Input
							id="edit_lab_hours"
							name="lab_hours"
							type="number"
							step="0.5"
							class="col-span-3"
							bind:value={labHours}
						/>
					</div>
				</div>
				<Dialog.Footer>
					<Button type="submit">Save Changes</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Delete Confirmation Dialog -->
{#if selectedSubject}
	<Dialog.Root bind:open={isDeleteModalOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the subject <span class="font-bold"
						>{selectedSubject.subject_code} - {selectedSubject.subject_name}</span
					>. This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<Dialog.Footer>
				<Button variant="outline" onclick={() => (isDeleteModalOpen = false)}>Cancel</Button>
				<form method="POST" action="?/deleteSubject" use:enhance>
					<input type="hidden" name="id" value={selectedSubject.id} />
					<Button type="submit" variant="destructive">Yes, delete subject</Button>
				</form>
			</Dialog.Footer>
		</Dialog.Content>
	</Dialog.Root>
{/if}

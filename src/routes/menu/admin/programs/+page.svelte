<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { PlusCircle, Trash2, Pencil, LoaderCircle } from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';

	// --- Type Definitions ---
	type Program = {
		id: number;
		program_name: string;
		college_id: number;
		colleges: { college_name: string } | null;
	};

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- Component State ---
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	// Program State
	let programCreateOpen = $state(false);
	let programEditOpen = $state(false);
	let programDeleteOpen = $state(false);
	let selectedProgram = $state<Program | null>(null);
	let programFormName = $state('');
	let programFormCollegeId = $state('');
	let programCreateId = $state('');

	// --- Derived State ---
	const programFormCollegeName = $derived(
		data.colleges?.find((c) => c.id.toString() === programFormCollegeId)?.college_name
	);

	const filteredPrograms: Program[] = $derived.by(() => {
		const programs = data.programs || [];
		if (!searchQuery) return programs;
		const lowerQuery = searchQuery.toLowerCase();
		return programs.filter((p) => p.program_name.toLowerCase().includes(lowerQuery));
	});

	// --- Event Handlers ---
	function openProgramEditModal(program: Program) {
		selectedProgram = program;
		programFormName = program.program_name;
		programFormCollegeId = program.college_id.toString();
		programEditOpen = true;
	}

	function openProgramDeleteModal(program: Program) {
		selectedProgram = program;
		programDeleteOpen = true;
	}
</script>

<svelte:head>
	<title>Program Management | smart-sched</title>
</svelte:head>

<div class="space-y-8">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Programs</h1>
		<p class="text-muted-foreground mt-1">Manage academic programs.</p>
	</header>

	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div>
					<Card.Title>Academic Programs</Card.Title>
					<Card.Description>List of all degree programs offered.</Card.Description>
				</div>
				<Button onclick={() => (programCreateOpen = true)} disabled={isSubmitting}>
					<PlusCircle class="mr-2 h-4 w-4" /> Add Program
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="border rounded-md">
				<Table.Root>
					<Table.Header class="bg-muted/50">
						<Table.Row>
							<Table.Head>Program Name</Table.Head>
							<Table.Head>College</Table.Head>
							<Table.Head class="text-right pr-6">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if filteredPrograms.length > 0}
							{#each filteredPrograms as program (program.id)}
								<Table.Row class="hover:bg-muted/50">
									<Table.Cell class="font-medium">{program.program_name}</Table.Cell>
									<Table.Cell>
										<Badge variant="secondary">{program.colleges?.college_name || 'N/A'}</Badge>
									</Table.Cell>
									<Table.Cell class="text-right">
										<Button
											onclick={() => openProgramEditModal(program)}
											variant="ghost"
											size="icon"
											disabled={isSubmitting}
										>
											<Pencil class="h-4 w-4" />
										</Button>
										<Button
											onclick={() => openProgramDeleteModal(program)}
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
								<Table.Cell colspan={3} class="h-24 text-center">No programs found.</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- === MODALS === -->

<!-- Program Create Modal -->
<Dialog.Root bind:open={programCreateOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Program</Dialog.Title>
			<Dialog.Description>Add a new degree program to the system.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createProgram"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating program...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						programCreateOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label for="program-name">Program Name</Label>
					<Input
						id="program-name"
						name="program_name"
						placeholder="e.g. Bachelor of Science in Computer Science"
					/>
				</div>
				<div class="space-y-2">
					<Label for="program-college">College</Label>
					<Select.Root type="single" name="college_id" bind:value={programCreateId}>
						<Select.Trigger>
							<span
								>{data.colleges?.find((c) => c.id.toString() === programCreateId)?.college_name ||
									'Select a college'}</span
							>
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Create Program
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Program Edit Modal -->
<Dialog.Root bind:open={programEditOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Program</Dialog.Title>
			<Dialog.Description>Update the details for this program.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateProgram"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving changes...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						programEditOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={selectedProgram?.id} />
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label for="edit-program-name">Program Name</Label>
					<Input id="edit-program-name" name="program_name" bind:value={programFormName} />
				</div>
				<div class="space-y-2">
					<Label for="edit-program-college">College</Label>
					<Select.Root name="college_id" type="single" bind:value={programFormCollegeId}>
						<Select.Trigger>
							<span>{programFormCollegeName || 'Select a college'}</span>
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Program Delete Modal -->
{#if selectedProgram}
	<Dialog.Root bind:open={programDeleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the program <strong>{selectedProgram.program_name}</strong>.
					This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/deleteProgram"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Deleting program...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							programDeleteOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedProgram.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (programDeleteOpen = false)}
						disabled={isSubmitting}>Cancel</Button
					>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Yes, Delete
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

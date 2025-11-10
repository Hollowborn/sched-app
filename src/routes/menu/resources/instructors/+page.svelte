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
		Search,
		PlusCircle,
		Pencil,
		Eye,
		Trash2,
		LoaderCircle
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Button } from '$lib/components/ui/button';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Input } from '$lib/components/ui/input';

	type Instructor = {
		id: number;
		name: string;
		email: string;
		college_id: number;
		max_load: number;
		min_load: number;
		current_load: number;
		colleges: { college_name: string } | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let viewMode: 'table' | 'grid' = $state('grid');
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let searchQuery = $state('');
	let isSubmitting = $state(false);

	let createOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedInstructor = $state<Instructor | null>(null);

	// Form State
	let formName = $state('');
	let formEmail = $state('');
	let formCollegeCreateId = $state('');
	let formCollegeId = $state('');
	let formMaxLoad = $state(18);
	let formMinLoad = $state(12);

	const filteredInstructors: Instructor[] = $derived.by(() => {
		const instructors = data.instructors || [];
		if (!searchQuery) return instructors;
		const lowerQuery = searchQuery.toLowerCase();
		return instructors.filter(
			(i) =>
				i.name.toLowerCase().includes(lowerQuery) ||
				i.colleges?.college_name.toLowerCase().includes(lowerQuery)
		);
	});

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
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

	function getLoadColor(load: number, max: number) {
		const percentage = max > 0 ? (load / max) * 100 : 0;
		if (percentage > 100) return 'var(--color-destructive)';
		if (percentage >= 80) return 'var(--color-chart-1)';
		return 'var(--color-chart-2)';
	}

	function openEditModal(instructor: Instructor) {
		selectedInstructor = instructor;
		formName = instructor.name;
		formEmail = instructor.email;
		formCollegeId = instructor.college_id.toString();
		formMaxLoad = instructor.max_load;
		formMinLoad = instructor.min_load;
		editOpen = true;
	}

	function openDeleteModal(instructor: Instructor) {
		selectedInstructor = instructor;
		deleteOpen = true;
	}

	const formCollegeName = $derived(
		data.colleges?.find((c) => c.id.toString() === formCollegeId)?.college_name
	);
	const formCollegeCreateName = $derived(
		data.colleges?.find((c) => c.id.toString() === formCollegeCreateId)?.college_name
	);
</script>

<svelte:head>
	<title>Block Management | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Instructor Management</h1>
		<p class="text-muted-foreground mt-1">
			Manage faculty, their teaching loads, and subject qualifications.
		</p>
	</header>

	<Card.Root>
		<Card.Content class="m-2 flex items-center justify-between gap-4 overflow-auto">
			<div class="flex flex-1 items-center gap-4">
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
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input placeholder="Search by name or college..." class="pl-8" bind:value={searchQuery} />
				</div>
			</div>
			<div class="flex items-center gap-2">
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
				{#if data.profile?.role === 'Admin'}
					<Button onclick={() => (createOpen = true)}
						><PlusCircle class="mr-2 h-4 w-4" /> Add Instructor</Button
					>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	{#if viewMode === 'grid'}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#if filteredInstructors.length > 0}
				{#each filteredInstructors as instructor (instructor.id)}
					<div class="hover-lift transition-base">
						<Card.Root class="flex flex-col ">
							<Card.Header>
								<Card.Title>{instructor.name}</Card.Title>
								<Card.Description>{instructor.colleges?.college_name || 'N/A'}</Card.Description>
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
								<Button variant="outline" size="sm">View Schedule</Button>
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
		<div class="border rounded-md">
			<Table.Root>
				<Table.Header class="bg-muted/50">
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>College</Table.Head>
						<Table.Head>Workload</Table.Head>
						<Table.Head class="text-right pr-6">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#if filteredInstructors.length > 0}
						{#each filteredInstructors as instructor (instructor.id)}
							<Table.Row>
								<Table.Cell class="font-medium">{instructor.name}</Table.Cell>
								<Table.Cell
									><Badge variant="secondary">{instructor.colleges?.college_name || 'N/A'}</Badge
									></Table.Cell
								>
								<Table.Cell>
									<div class="flex items-center gap-2">
										<Progress
											class="w-24"
											value={(instructor.current_load / instructor.max_load) * 100}
											style="--indicator-color: {getLoadColor(
												instructor.current_load,
												instructor.max_load
											)};"
										/>
										<span class="text-xs text-muted-foreground"
											>{instructor.current_load} / {instructor.max_load}</span
										>
									</div>
								</Table.Cell>
								<Table.Cell class="text-right">
									<Button variant="ghost" size="sm"><Eye /></Button>
									<Button variant="ghost" size="sm" onclick={() => openEditModal(instructor)}
										><Pencil /></Button
									>
									<Button
										variant="ghost"
										size="icon"
										class="text-destructive hover:text-destructive"
										onclick={() => openDeleteModal(instructor)}><Trash2 class="h-4 w-4" /></Button
									>
								</Table.Cell>
							</Table.Row>
						{/each}
					{:else}
						<Table.Row>
							<Table.Cell colspan={4} class="h-24 text-center">
								No instructors found matching your criteria.
							</Table.Cell>
						</Table.Row>
					{/if}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>

<!-- Add/Edit/Delete Modals -->
<Dialog.Root bind:open={createOpen}>
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
				<!-- Form fields -->
				<div class="space-y-2">
					<Label for="create-name">Full Name</Label>
					<Input id="create-name" name="name" required />
				</div>
				<div class="space-y-2">
					<Label for="create-email">Email Address</Label>
					<Input id="create-email" name="email" type="email" placeholder="Optional" />
				</div>
				<div class="space-y-2">
					<Label for="create-college">College</Label>
					<Select.Root type="single" name="college_id" bind:value={formCollegeCreateId}>
						<Select.Trigger
							><span class="">{formCollegeCreateName || 'Select a college'}</span></Select.Trigger
						>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label for="create-max-load">Max Load (Units)</Label>
					<Input id="create-max-load" name="max_load" type="number" step="0.5" value={18} />
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
					<Input id="edit-email" name="email" type="email" bind:value={formEmail} required />
				</div>
				<div class="space-y-2">
					<Label for="edit-college">College</Label>
					<Select.Root type="single" name="college_id" bind:value={formCollegeId}>
						<Select.Trigger>
							<span>{formCollegeName || 'Select a college'}</span>
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
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

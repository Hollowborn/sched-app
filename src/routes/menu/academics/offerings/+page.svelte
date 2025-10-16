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
		BookOpen
	} from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
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
		blocks: { id: number; block_name: string } | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let createOpen = $state(false);
	let deleteOpen = $state(false);
	let selectedClass = $state<ClassOffering | null>(null);
	let isSubmitting = $state(false);

	// Filters
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
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
</script>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Class Offerings</h1>
		<p class="text-muted-foreground mt-1">
			Manage which subjects are offered for a specific academic year and semester.
		</p>
	</header>

	<Card.Root>
		<Card.Content class="p-4 flex items-center justify-between gap-4">
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
					<Input
						placeholder="Search code, subject, instructor..."
						class="pl-8"
						bind:value={searchQuery}
					/>
				</div>
			</div>
			{#if data.profile?.role && ['Admin', 'Dean', 'Registrar'].includes(data.profile.role)}
				<Button onclick={() => (createOpen = true)}>
					<PlusCircle class="mr-2 h-4 w-4" />
					Create Offering
				</Button>
			{/if}
		</Card.Content>
	</Card.Root>

	<div class="border rounded-md">
		<Table.Root>
			<Table.Header>
				<Table.Row>
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
						<Table.Row class="hover:bg-muted/50">
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
									{data.colleges?.find((c) => c.id === classItem.subjects?.college_id)
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
						<Table.Cell colspan={6} class="h-24 text-center">
							No class offerings found for this period.
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
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
					<Select.Root type="single" name="subject_id" bind:value={createSubjectId}>
						<Select.Trigger>
							<span class="placeholder:text-muted-foreground"
								>{createSubjectName || 'Select a subject'}</span
							>
						</Select.Trigger>
						<Select.Content>
							{#each data.subjects || [] as subject}
								<Select.Item value={subject.id.toString()}
									>{subject.subject_code} - {subject.subject_name}</Select.Item
								>
							{/each}
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
							{#each data.blocks || [] as block}
								<Select.Item value={block.id.toString()}>{block.block_name}</Select.Item>
							{/each}
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

{#if selectedClass}
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the class offering for <strong
						>{selectedClass.subjects?.subject_code}</strong
					>
					for block <strong>{selectedClass.blocks?.block_name}</strong>. This cannot be undone.
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
				<input type="hidden" name="id" value={selectedClass.id} />
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

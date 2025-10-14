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

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

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
		// Corrected goto call
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true });
	}

	// Use $effect to watch for changes in filter values
	$effect(() => {
		// This block will re-run whenever academicYear or semester changes
		handleFilterChange();
	});

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
</script>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Instructor Management</h1>
		<p class="text-muted-foreground mt-1">
			Manage faculty, their teaching loads, and subject qualifications.
		</p>
	</header>

	<Card.Root>
		<Card.Content class="p-4 flex items-center justify-between gap-4">
			<div class="flex flex-1 items-center gap-4">
				<div class="flex items-center gap-2">
					<Calendar class="h-4 w-4 text-muted-foreground" />
					<Select.Root type="single" bind:value={academicYear}>
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
					<Select.Root type="single" bind:value={semester}>
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
			{#each filteredInstructors as instructor (instructor.id)}
				<Card.Root class="flex flex-col">
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
			{/each}
		</div>
	{:else}
		<div class="border rounded-md">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Name</Table.Head>
						<Table.Head>College</Table.Head>
						<Table.Head>Workload</Table.Head>
						<Table.Head class="text-right pr-6">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
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
								<Button variant="ghost" size="sm">View Schedule</Button>
								<Button variant="ghost" size="sm" onclick={() => openEditModal(instructor)}
									>Edit</Button
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
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>

<!-- Add/Edit/Delete Modals go here -->
<style>
	:global([style*='--indicator-color']) > [data-slot='progress-indicator'] {
		background-color: var(--indicator-color);
	}
</style>

<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { Calendar, BookOpen, Search, Filter, List, UserCheck, UserX } from '@lucide/svelte';
	import { tick } from 'svelte'; // Import tick from svelte

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import Label from '$lib/components/ui/label/label.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import { Badge } from '$lib/components/ui/badge';
	import * as ToggleGroup from '$lib/components/ui/toggle-group';
	import * as Tooltip from '$lib/components/ui/tooltip/index.js';

	type ClassOffering = {
		id: number;
		subjects: {
			subject_code: string;
			subject_name: string;
			college_id: number; // Added for easier lookup
			colleges: { college_name: string };
		} | null;
		instructors: { id: number; name: string } | null;
		blocks: { block_name: string } | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let colleges = $state(data.filters.college);
	let searchQuery = $state('');
	let statusFilter = $state<'all' | 'assigned' | 'unassigned'>('all');

	let selectedInstructorIds = $state<{ [key: number]: string | undefined }>({});

	$effect(() => {
		const initialIds: { [key: number]: string | undefined } = {};
		if (data.classes) {
			for (const c of data.classes) {
				initialIds[c.id] = c.instructors?.id.toString() ?? '0';
			}
		}
		selectedInstructorIds = initialIds;
	});

	// --- Derived State ---
	const filteredClasses: ClassOffering[] = $derived.by(() => {
		let classes = data.classes || [];

		if (statusFilter === 'assigned') {
			classes = classes.filter((c) => c.instructors !== null);
		} else if (statusFilter === 'unassigned') {
			classes = classes.filter((c) => c.instructors === null);
		}

		if (!searchQuery) return classes;
		const lowerQuery = searchQuery.toLowerCase();
		return classes.filter((c) => {
			const subjectCode = c.subjects?.subject_code.toLowerCase() || '';
			const subjectName = c.subjects?.subject_name.toLowerCase() || '';
			const blockName = c.blocks?.block_name.toLowerCase() || '';
			return (
				subjectCode.includes(lowerQuery) ||
				subjectName.includes(lowerQuery) ||
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

	// --- THE FIX IS HERE ---
	// Make the function async and add `await tick()`
	async function handleAssignmentChange(classId: number) {
		// Wait for Svelte to flush pending state changes to the DOM.
		// This ensures the hidden input inside the Select component has the new value.
		await tick();

		const form = document.getElementById(`assign-form-${classId}`) as HTMLFormElement;
		if (form) {
			form.requestSubmit();
		}
	}
</script>

<svelte:head>
	<title>Instructor Assignments | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Instructor Assignments</h1>
		<p class="text-muted-foreground mt-1">
			Assign instructors to class offerings for the selected academic term.
		</p>
	</header>

	<Card.Root>
		<Card.Content class="m-2 flex items-center justify-between gap-4 overflow-auto ">
			<div class="flex flex-1 items-center gap-4">
				<!-- Term Filters -->
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
						<Select.Trigger class="w-[150px]"><span>{academicYear}</span></Select.Trigger>
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
						<Select.Trigger class="w-[150px]"><span>{semester}</span></Select.Trigger>
						<Select.Content>
							<Select.Item value="1st Semester">1st Semester</Select.Item>
							<Select.Item value="2nd Semester">2nd Semester</Select.Item>
							<Select.Item value="Summer">Summer</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
				{#if data.profile?.role === 'Admin' && data.colleges?.length > 0}
					<div class="flex items-center gap-2">
						<Filter class="h-4 w-4 text-muted-foreground" />
						<Select.Root
							type="single"
							value={colleges}
							onValueChange={(v) => {
								colleges = v;
								handleFilterChange();
							}}
						>
							<Select.Trigger class="w-[200px]">
								<span class="truncate max-w-[200px]">
									{data.colleges?.find((c) => c.id.toString() === colleges)?.college_name ||
										'All Colleges'}
								</span>
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="">All Colleges</Select.Item>
								{#each data.colleges as college}
									<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
								{/each}
							</Select.Content>
						</Select.Root>
					</div>
				{/if}
				<!-- Search -->
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by subject or block..."
						class="pl-8"
						bind:value={searchQuery}
					/>
				</div>
			</div>
			<!-- Status Toggles -->
			<ToggleGroup.Root type="single" variant="outline" bind:value={statusFilter}>
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger
							><ToggleGroup.Item value="all"><List /></ToggleGroup.Item></Tooltip.Trigger
						>
						<Tooltip.Content>
							<p>All</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger
							><ToggleGroup.Item value="assigned"><UserCheck /></ToggleGroup.Item></Tooltip.Trigger
						>
						<Tooltip.Content>
							<p>Assigned</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
				<Tooltip.Provider>
					<Tooltip.Root>
						<Tooltip.Trigger
							><ToggleGroup.Item value="unassigned"><UserX /></ToggleGroup.Item></Tooltip.Trigger
						>
						<Tooltip.Content>
							<p>Unassigned</p>
						</Tooltip.Content>
					</Tooltip.Root>
				</Tooltip.Provider>
			</ToggleGroup.Root>
		</Card.Content>
	</Card.Root>

	<div class="border rounded-md">
		<Table.Root>
			<Table.Header>
				<Table.Row class="bg-muted/50">
					<Table.Head>Subject</Table.Head>
					<Table.Head>Block</Table.Head>
					<Table.Head class="w-[40%]">Instructor</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredClasses.length > 0}
					{#each filteredClasses as classItem (classItem.id)}
						<Table.Row class="hover:bg-muted/50">
							<Table.Cell>
								<div class="font-medium">{classItem.subjects?.subject_code}</div>
								<div class="text-sm text-muted-foreground">
									{classItem.subjects?.subject_name}
								</div>
							</Table.Cell>
							<Table.Cell>{classItem.blocks?.block_name}</Table.Cell>
							<Table.Cell>
								<form
									method="POST"
									action="?/assignInstructor"
									id="assign-form-{classItem.id}"
									use:enhance={() => {
										const toastId = toast.loading('Saving assignment...');
										return async ({ update, result }) => {
											if (result.type === 'success') {
												toast.success(result.data?.message, { id: toastId });
												await invalidateAll();
											} else if (result.type === 'failure') {
												toast.error(result.data?.message, { id: toastId });
											}
											await update({ reset: false });
										};
									}}
								>
									<input type="hidden" name="classId" value={classItem.id} />
									<Select.Root
										type="single"
										name="instructorId"
										bind:value={selectedInstructorIds[classItem.id]}
										onValueChange={() => {
											handleAssignmentChange(classItem.id);
										}}
									>
										<Select.Trigger class="w-full">
											{#if selectedInstructorIds[classItem.id] && selectedInstructorIds[classItem.id] !== '0'}
												{@const instructor = data.instructors.find(
													(i) => i.id.toString() === selectedInstructorIds[classItem.id]
												)}
												{#if instructor}
													<span
														>{instructor.name} ({instructor.current_load} / {instructor.max_load})</span
													>
												{:else}
													<span class="text-muted-foreground">Unassigned</span>
												{/if}
											{:else}
												<span class="text-muted-foreground">Unassigned</span>
											{/if}
										</Select.Trigger>
										<Select.Content>
											<Select.Item value="0">Unassigned</Select.Item>
											{#each data.instructors as instructor}
												<Select.Item value={instructor.id.toString()}>
													{instructor.name} ({instructor.current_load} / {instructor.max_load})
												</Select.Item>
											{/each}
										</Select.Content>
									</Select.Root>
								</form>
							</Table.Cell>
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={3} class="h-24 text-center">
							No class offerings match your current filters.
						</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
	<div class="text-center text-sm text-muted-foreground">
		Showing results for <span class="font-bold">{semester}</span> of Academic Year:
		<span class="font-bold">{academicYear}</span>
	</div>
</div>

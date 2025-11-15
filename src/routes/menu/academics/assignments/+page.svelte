<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll, goto } from '$app/navigation';
	import { Calendar, BookOpen, Search, Filter, List, UserCheck, UserX } from '@lucide/svelte';
	import { tick } from 'svelte';

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

	type Instructor = PageData['instructors'][number];

	type ClassOffering = {
		id: number;
		subjects: {
			id: number;
			subject_code: string;
			subject_name: string;
		} | null;
		instructors: { id: number; name: string } | null;
		blocks: {
			id: number;
			block_name: string;
			programs: {
				college_id: number;
				colleges: { college_name: string };
			};
		} | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- State Management ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let collegeFilterId = $state(data.filters.college); // Renamed to avoid conflict
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
	function getQualifiedInstructors(
		subjectId: number | null,
		currentInstructorId: number | null
	): (Instructor & { isQualified: boolean })[] {
		if (!subjectId) return [];

		const qualified =
			data.instructors?.filter((i) =>
				i.instructor_subjects.some((is) => is.subject_id === subjectId)
			) || [];

		const qualifiedIds = new Set(qualified.map((i) => i.id));
		const results = qualified.map((i) => ({ ...i, isQualified: true }));

		// If there's a currently assigned instructor who is NOT qualified,
		// add them to the list so they are still visible in the dropdown.
		if (currentInstructorId && !qualifiedIds.has(currentInstructorId)) {
			const currentInstructor = data.instructors.find((i) => i.id === currentInstructorId);
			if (currentInstructor) {
				results.unshift({ ...currentInstructor, isQualified: false });
			}
		}

		return results;
	}

	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('year', academicYear);
		params.set('semester', semester);
		if (collegeFilterId) {
			params.set('college', collegeFilterId);
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

	async function handleAssignmentChange(classId: number) {
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
							value={collegeFilterId}
							onValueChange={(v) => {
								collegeFilterId = v;
								handleFilterChange();
							}}
						>
							<Select.Trigger class="w-[200px]">
								<span class="truncate max-w-[200px]">
									{data.colleges?.find((c) => c.id.toString() === collegeFilterId)?.college_name ||
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
					<Table.Head>College</Table.Head>
					<Table.Head class="w-[40%]">Instructor</Table.Head>
				</Table.Row>
			</Table.Header>
			<Table.Body>
				{#if filteredClasses.length > 0}
					{#each filteredClasses as classItem (classItem.id)}
						{@const qualifiedInstructors = getQualifiedInstructors(
							classItem.subjects?.id ?? null,
							classItem.instructors?.id ?? null
						)}
						<Table.Row class="hover:bg-muted/50">
							<Table.Cell>
								<div class="font-medium">{classItem.subjects?.subject_code}</div>
								<div class="text-sm text-muted-foreground">
									{classItem.subjects?.subject_name}
								</div>
							</Table.Cell>
							<Table.Cell>{classItem.blocks?.block_name}</Table.Cell>
							<Table.Cell>
								<Badge variant="secondary"
									>{classItem.blocks?.programs?.colleges?.college_name || 'N/A'}</Badge
								>
							</Table.Cell>
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
												// No full invalidateAll() needed, just update the data
												await update({ reset: false });
											} else if (result.type === 'failure') {
												toast.error(result.data?.message, { id: toastId });
												// On failure, reset the select to its original value
												await invalidateAll();
											}
										};
									}}
								>
									<input type="hidden" name="classId" value={classItem.id} />
									<Select.Root
										type="single"
										name="instructorId"
										value={selectedInstructorIds[classItem.id]}
										onValueChange={(v) => {
											selectedInstructorIds[classItem.id] = v;
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
														class:text-destructive={!qualifiedInstructors.find(
															(qi) => qi.id === instructor.id
														)?.isQualified}
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
											{#if qualifiedInstructors.length > 0}
												{#each qualifiedInstructors as instructor}
													<Select.Item value={instructor.id.toString()}>
														{instructor.name} ({instructor.current_load} / {instructor.max_load})
														{#if !instructor.isQualified}
															<span class="text-destructive ml-2">(Unqualified)</span>
														{/if}
													</Select.Item>
												{/each}
											{:else}
												<div class="p-2 text-sm text-muted-foreground text-center">
													No qualified instructors found.
												</div>
											{/if}
										</Select.Content>
									</Select.Root>
								</form>
							</Table.Cell>
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={4} class="h-24 text-center">
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
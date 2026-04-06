<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { Trash2, LoaderCircle, Plus, FileEdit, Settings2, Network } from 'lucide-svelte';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet, renderComponent } from '$lib/components/ui/data-table';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	let isSubmitting = $state(false);

	// Curriculum State
	let addCurriculumOpen = $state(false);
	let deleteOpen = $state(false);
	let rowSelection = $state<import('@tanstack/table-core').RowSelectionState>({});
	let selectedCurriculums = $state<any[]>([]);

	let selectedCurriculumForSubjects = $state<any>(null);
	let subjectsOpen = $state(false);

	let selectedSubjectIds = $state<string[]>([]);
	let searchQuery = $state('');

    let selectedProgramId = $state('');
    let selectedProgramName = $derived(data.programs.find((p: any) => p.id.toString() === selectedProgramId)?.program_name || 'Select Program');
    
    let selectedYearLevel = $state('');
    let selectedYearLevelLabel = $derived(
        selectedYearLevel === '1' ? '1st Year' :
        selectedYearLevel === '2' ? '2nd Year' :
        selectedYearLevel === '3' ? '3rd Year' :
        selectedYearLevel === '4' ? '4th Year' :
        selectedYearLevel === '5' ? '5th Year' : 'Select Level'
    );
    
    let selectedSemester = $state('');

	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'programs.program_name',
			header: 'Program',
			cell: ({ row }) => {
				const programName = row.original.programs?.program_name;
				if (!programName) return 'N/A';
				return renderSnippet(programBadge, { programName });
			}
		},
		{
			accessorKey: 'revision_year',
			header: 'Revision Year'
		},
		{
			accessorKey: 'year_level',
			header: 'Year Level',
			cell: ({ row }) => {
				return `${row.original.year_level}${
					['st', 'nd', 'rd', 'th'][((((row.original.year_level + 90) % 100) - 10) % 10) - 1] || 'th'
				} Year`;
			}
		},
		{
			accessorKey: 'semester',
			header: 'Semester'
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) => {
				return renderSnippet(actionButtons, { row: row.original });
			}
		}
	];

	const selectedRowsCount = $derived(Object.keys(rowSelection).length);

	const filteredSubjects = $derived(
		data.subjects.filter(
			(s: any) => {
                const matchesSearch = s.subject_code.toLowerCase().includes(searchQuery.toLowerCase()) ||
				s.subject_name.toLowerCase().includes(searchQuery.toLowerCase());
                
                if (!matchesSearch) return false;
                
                if (selectedCurriculumForSubjects?.programs?.college_id) {
                    const reqCollegeId = selectedCurriculumForSubjects.programs.college_id;
                    return s.subject_colleges?.some((sc: any) => sc.college_id === reqCollegeId);
                }
                
                return true;
            }
		)
	);

	function toggleSubject(id: string) {
		if (selectedSubjectIds.includes(id)) {
			selectedSubjectIds = selectedSubjectIds.filter((s) => s !== id);
		} else {
			selectedSubjectIds = [...selectedSubjectIds, id];
		}
	}
</script>

{#snippet actionButtons({ row }: { row: any })}
	<Button
		variant="outline"
		size="sm"
		onclick={(e) => {
			e.stopPropagation();
			selectedCurriculumForSubjects = row;
			const prev = data.curriculumSubjects
				.filter((cs: any) => cs.curriculum_id === row.id)
				.map((cs: any) => cs.subject_id.toString());
			selectedSubjectIds = [...prev];
			subjectsOpen = true;
		}}
	>
		<FileEdit class="size-4 mr-2" />
		Manage Subjects
	</Button>
{/snippet}

{#snippet programBadge({ programName }: { programName: string })}
	{@const chartColors = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5']}
	{@const getProgramColorVar = (name: string) => {
		let hash = 0;
		for (let i = 0; i < name.length; i++) {
			hash = name.charCodeAt(i) + ((hash << 5) - hash);
		}
		const index = Math.abs(hash % chartColors.length);
		return chartColors[index];
	}}
	{@const colorVar = getProgramColorVar(programName)}
	<Badge variant="outline" class="flex gap-2 items-center">
		<div class="size-2 rounded-full" style={`background-color: var(${colorVar})`}></div>
		{programName}
	</Badge>
{/snippet}

<svelte:head>
	<title>Curriculums | smart-sched</title>
</svelte:head>

<div class="space-y-8">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Curriculums</h1>
		<p class="text-muted-foreground mt-1">Manage standard coursework definitions for programs.</p>
	</header>

	<DataTable
		data={data.curriculums}
		{columns}
		showCheckbox={true}
		bind:rowSelection
		bind:selectedRowsData={selectedCurriculums}
	>
		<div slot="toolbar">
			<Button
				variant={selectedRowsCount > 0 ? 'destructive' : 'outline'}
				class={selectedRowsCount === 0 ? 'text-muted-foreground' : ''}
				disabled={isSubmitting || selectedRowsCount === 0}
				onclick={() => {
					deleteOpen = true;
				}}
			>
				<Trash2 class="mr-2 h-4 w-4" />
				Delete ({selectedRowsCount})
			</Button>

			<Button variant="default" onclick={() => (addCurriculumOpen = true)}>
				<Plus class="mr-2 h-4 w-4" /> Add Curriculum
			</Button>
		</div>
	</DataTable>
</div>

<!-- === MODALS === -->

<!-- Add Curriculum Dialog -->
<Dialog.Root bind:open={addCurriculumOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create Curriculum Blueprint</Dialog.Title>
			<Dialog.Description>Define a new term outline for a specific program.</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/createCurriculum"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating curriculum...');

				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success((result.data as any)?.message, { id: toastId });
						addCurriculumOpen = false;
						invalidateAll();
					} else if (result.type === 'failure') {
						toast.error((result.data as any)?.message, { id: toastId });
					}
					await update();
				};
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label>Program</Label>
				<Select.Root type="single" name="program_id" bind:value={selectedProgramId}>
					<Select.Trigger><span>{selectedProgramName}</span></Select.Trigger>
					<Select.Content>
						{#each data.programs as program}
							<Select.Item value={program.id.toString()}>{program.program_name}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<div class="space-y-2">
				<Label>Revision Year</Label>
				<Input name="revision_year" placeholder="e.g. 2024-2025" required />
			</div>

			<div class="grid grid-cols-2 gap-4">
				<div class="space-y-2">
					<Label>Year Level</Label>
					<Select.Root type="single" name="year_level" bind:value={selectedYearLevel}>
						<Select.Trigger><span>{selectedYearLevelLabel}</span></Select.Trigger>
						<Select.Content>
							<Select.Item value="1">1st Year</Select.Item>
							<Select.Item value="2">2nd Year</Select.Item>
							<Select.Item value="3">3rd Year</Select.Item>
							<Select.Item value="4">4th Year</Select.Item>
							<Select.Item value="5">5th Year</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>

				<div class="space-y-2">
					<Label>Semester</Label>
					<Select.Root type="single" name="semester" bind:value={selectedSemester}>
						<Select.Trigger><span>{selectedSemester || 'Select Term'}</span></Select.Trigger>
						<Select.Content>
							<Select.Item value="1st Semester">1st Semester</Select.Item>
							<Select.Item value="2nd Semester">2nd Semester</Select.Item>
							<Select.Item value="Summer">Summer</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<Dialog.Footer class="mt-4">
				<Button type="button" variant="outline" onclick={() => (addCurriculumOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Create
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Manage Subjects Dialog -->
<Dialog.Root bind:open={subjectsOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Mapped Subjects</Dialog.Title>
			<Dialog.Description>
				Select the subjects required for
				<strong class="font-medium">{selectedCurriculumForSubjects?.programs?.program_name}</strong>
				-
				{selectedCurriculumForSubjects?.year_level} Year, {selectedCurriculumForSubjects?.semester}.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-4 py-4">
            {#if selectedSubjectIds.length > 0}
                <div class="flex flex-wrap gap-1.5 max-h-24 overflow-y-auto pr-2">
                    {#each selectedSubjectIds as sId}
                        {@const s = data.subjects.find((sub: any) => sub.id.toString() === sId)}
                        {#if s}
                            <Badge variant="secondary" class="flex items-center gap-1 font-normal">
                                {s.subject_code}
                                <button 
                                    type="button" 
                                    class="ml-0.5 hover:text-destructive transition-colors" 
                                    onclick={(e) => { e.preventDefault(); toggleSubject(sId); }}
                                >
                                    ✕
                                </button>
                            </Badge>
                        {/if}
                    {/each}
                </div>
            {/if}
			<Input type="search" placeholder="Search course catalog..." bind:value={searchQuery} />
			<div class="h-[300px] overflow-y-auto border rounded-md p-2 space-y-1">
				{#each filteredSubjects as subject}
					<button
						type="button"
						class="w-full flex items-center justify-between p-3 rounded-md border text-left transition-colors hover:bg-muted/50 {selectedSubjectIds.includes(
							subject.id.toString()
						)
							? 'border-primary bg-primary/5'
							: 'border-transparent'}"
						onclick={() => toggleSubject(subject.id.toString())}
					>
						<div>
							<div class="font-medium font-mono text-sm">{subject.subject_code}</div>
							<div class="text-sm text-muted-foreground truncate max-w-64">
								{subject.subject_name}
							</div>
						</div>
						<div class="text-xs text-muted-foreground w-12 text-right">
							{Number(subject.lecture_hours)}L / {Number(subject.lab_hours)}B
						</div>
					</button>
				{/each}
				{#if filteredSubjects.length === 0}
					<div class="p-4 text-center text-muted-foreground text-sm">No subjects found.</div>
				{/if}
			</div>
			<div class="text-xs text-muted-foreground">
				{selectedSubjectIds.length} subjects currently selected for this curriculum.
			</div>
		</div>

		<form
			method="POST"
			action="?/updateSubjects"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving subjects...');

				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success((result.data as any)?.message, { id: toastId });
						subjectsOpen = false;
						invalidateAll();
					} else if (result.type === 'failure') {
						toast.error((result.data as any)?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="curriculum_id" value={selectedCurriculumForSubjects?.id} />
			{#each selectedSubjectIds as sId}
				<input type="hidden" name="subject_ids" value={sId} />
			{/each}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (subjectsOpen = false)}
					>Cancel</Button
				>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Save Subject Mapping
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Delete Dialog -->
<Dialog.Root bind:open={deleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure?</Dialog.Title>
			<Dialog.Description>
				This will indefinitely delete {selectedCurriculums.length} curriculum(s). This action cannot
				be undone.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/deleteCurriculum"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Deleting...');

				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success((result.data as any)?.message, { id: toastId });
						rowSelection = {};
						invalidateAll();
						deleteOpen = false;
					} else if (result.type === 'failure') {
						toast.error((result.data as any)?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			{#if selectedCurriculums.length > 0}
				<input type="hidden" name="id" value={selectedCurriculums[0].id} />
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (deleteOpen = false)}>Cancel</Button>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Yes, Delete
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

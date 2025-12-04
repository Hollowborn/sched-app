<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import {
		Archive,
		Edit,
		Eye,
		LoaderCircle,
		Calendar,
		BookOpen,
		LayoutGrid,
		List,
		Check,
		ChevronsUpDown,
		Filter
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import { cn } from '$lib/utils';

	let { data } = $props<{ data: PageData; form: ActionData }>();

	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let status = $state(data.filters.status);
	let isSubmitting = $state(false);
	let viewMode = $state<'grid' | 'list'>('grid');
	let yearOpen = $state(false);
	let semOpen = $state(false);

	// --- DataTable Columns ---
	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'name',
			header: 'Timetable Name',
			cell: ({ row }) => renderSnippet(nameCell, { row: row.original })
		},
		{
			accessorKey: 'semester',
			header: 'Semester'
		},
		{
			accessorKey: 'academic_year',
			header: 'Academic Year'
		},
		{
			accessorKey: 'status',
			header: 'Status',
			cell: ({ row }) => renderSnippet(statusCell, { status: row.original.status })
		},
		{
			accessorFn: (row) => row.colleges?.college_name || 'System-wide',
			header: 'College'
		},
		{
			accessorKey: 'created_at',
			header: 'Last Updated',
			cell: ({ row }) => new Date(row.original.created_at).toLocaleDateString()
		},
		{
			id: 'actions',
			header: 'Actions',
			cell: ({ row }) => renderSnippet(actionsCell, { row: row.original }),
			meta: {
				class: 'text-right'
			}
		}
	];

	function handleFilterChange() {
		const params = new URLSearchParams();
		params.set('year', academicYear);
		params.set('semester', semester);
		params.set('status', status);
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

	function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
		switch (status) {
			case 'Published':
				return 'default';
			case 'Draft':
				return 'secondary';
			case 'Archived':
				return 'outline';
			default:
				return 'secondary';
		}
	}
</script>

{#snippet nameCell({ row }: { row: any })}
	<div class="font-medium">{row.name}</div>
{/snippet}

{#snippet statusCell({ status }: { status: string })}
	<Badge variant={getStatusVariant(status)}>{status}</Badge>
{/snippet}

{#snippet actionsCell({ row }: { row: any })}
	<div class="flex justify-end gap-2">
		{#if row.status !== 'archived'}
			<form
				method="POST"
				action="?/archiveTimetable"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Archiving timetable...');
					return async ({ update, result }) => {
						isSubmitting = false;
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
				<input type="hidden" name="timetableId" value={row.id} />
				<Button type="submit" variant="ghost" size="icon" disabled={isSubmitting} title="Archive">
					<Archive class="h-4 w-4" />
				</Button>
			</form>
		{/if}
		<Button href="/menu/timetables/view/{row.id}" variant="ghost" size="icon" title="View">
			<Eye class="h-4 w-4" />
		</Button>
	</div>
{/snippet}

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">View Timetables</h1>
		<p class="text-muted-foreground mt-1">
			Browse, view, and manage all published and draft timetables.
		</p>
	</header>

	<div class="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
		<!-- Filters -->
		<div class="flex flex-wrap items-center gap-2">
			<!-- Academic Year Combobox -->
			<Popover.Root bind:open={yearOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-[160px] justify-between"
							{...props}
							role="combobox"
							aria-expanded={yearOpen}
						>
							{academicYear}
							<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-[200px] p-0">
					<Command.Root>
						<Command.Input placeholder="Search year..." />
						<Command.List>
							<Command.Empty>No year found.</Command.Empty>
							<Command.Group>
								{#each generateAcademicYears() as year}
									<Command.Item
										value={year}
										onSelect={() => {
											academicYear = year;
											handleFilterChange();
											yearOpen = false;
										}}
									>
										<Check
											class={cn(
												'mr-2 h-4 w-4',
												academicYear === year ? 'opacity-100' : 'opacity-0'
											)}
										/>
										{year}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<!-- Semester Combobox -->
			<Popover.Root bind:open={semOpen}>
				<Popover.Trigger>
					{#snippet child({ props })}
						<Button
							variant="outline"
							class="w-[160px] justify-between"
							{...props}
							role="combobox"
							aria-expanded={semOpen}
						>
							{semester}
							<ChevronsUpDown class="ml-2 h-4 w-4 shrink-0 opacity-50" />
						</Button>
					{/snippet}
				</Popover.Trigger>
				<Popover.Content class="w-[200px] p-0">
					<Command.Root>
						<Command.Input placeholder="Search semester..." />
						<Command.List>
							<Command.Empty>No semester found.</Command.Empty>
							<Command.Group>
								{#each ['1st Semester', '2nd Semester', 'Summer'] as sem}
									<Command.Item
										value={sem}
										onSelect={() => {
											semester = sem;
											handleFilterChange();
											semOpen = false;
										}}
									>
										<Check
											class={cn('mr-2 h-4 w-4', semester === sem ? 'opacity-100' : 'opacity-0')}
										/>
										{sem}
									</Command.Item>
								{/each}
							</Command.Group>
						</Command.List>
					</Command.Root>
				</Popover.Content>
			</Popover.Root>

			<!-- Status Tabs -->
			<Tabs.Root
				value={status}
				onValueChange={(v) => {
					if (v) {
						status = v;
						handleFilterChange();
					}
				}}
				class="w-auto"
			>
				<Tabs.List>
					<Tabs.Trigger value="All">All</Tabs.Trigger>
					<Tabs.Trigger value="draft">Drafts</Tabs.Trigger>
					<Tabs.Trigger value="published">Published</Tabs.Trigger>
					<Tabs.Trigger value="archived">Archived</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>

		<!-- View Mode Toggle -->
		<div class="flex items-center bg-muted/50 p-1 rounded-lg border">
			<Button
				variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
				size="sm"
				class="h-8 px-3"
				onclick={() => (viewMode = 'grid')}
			>
				<LayoutGrid class="mr-2 h-4 w-4" />
				Grid
			</Button>
			<Button
				variant={viewMode === 'list' ? 'secondary' : 'ghost'}
				size="sm"
				class="h-8 px-3"
				onclick={() => (viewMode = 'list')}
			>
				<List class="mr-2 h-4 w-4" />
				List
			</Button>
		</div>
	</div>

	<!-- Timetable Grid -->
	<!-- Timetable Content -->
	{#if viewMode === 'grid'}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{#if data.timetables.length > 0}
				{#each data.timetables as tt (tt.id)}
					<Card.Root
						class="group relative flex flex-col justify-between hover:shadow-md transition-all duration-200 border-muted/60 hover:border-border/80"
					>
						<Card.Header class="pb-2">
							<div class="flex justify-between items-start gap-3">
								<div class="space-y-1.5">
									<Card.Title
										class="text-lg leading-tight tracking-tight text-foreground/90 group-hover:text-primary transition-colors"
									>
										{tt.name}
									</Card.Title>
									<Card.Description class="flex items-center gap-2 text-xs">
										<Calendar class="h-3.5 w-3.5" />
										<span>{tt.academic_year} • {tt.semester}</span>
									</Card.Description>
								</div>
								<Badge variant={getStatusVariant(tt.status)} class="shrink-0 capitalize shadow-sm">
									{tt.status}
								</Badge>
							</div>
						</Card.Header>
						<Card.Content class="py-0">
							<!-- Spacer or additional content if needed -->
						</Card.Content>
						<Card.Footer class="pt-2 flex items-end justify-between">
							<div class="flex items-center gap-1.5 text-xs font-medium text-muted-foreground/80">
								<BookOpen class="h-3.5 w-3.5" />
								<span
									class="truncate max-w-[140px]"
									title={tt.colleges?.college_name || 'System-wide'}
								>
									{tt.colleges?.college_name || 'System-wide'}
								</span>
							</div>

							<div
								class="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity duration-200"
							>
								{#if tt.status !== 'archived'}
									<form
										method="POST"
										action="?/archiveTimetable"
										use:enhance={() => {
											isSubmitting = true;
											const toastId = toast.loading('Archiving timetable...');
											return async ({ update, result }) => {
												isSubmitting = false;
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
										<input type="hidden" name="timetableId" value={tt.id} />
										<Button
											type="submit"
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-muted-foreground hover:text-destructive"
											disabled={isSubmitting}
											title="Archive"
										>
											<Archive class="h-4 w-4" />
										</Button>
									</form>
								{/if}
								<Button
									href="/menu/timetables/view/{tt.id}"
									variant="secondary"
									size="icon"
									class="h-8 w-8 shadow-sm"
									title="View"
								>
									<Eye class="h-4 w-4" />
								</Button>
							</div>
						</Card.Footer>
					</Card.Root>
				{/each}
			{:else}
				<div class="sm:col-span-2 lg:col-span-3 text-center py-16 text-muted-foreground">
					No timetables found for the selected filters.
				</div>
			{/if}
		</div>
	{:else}
		<!-- List View -->
		<DataTable data={data.timetables} {columns} />
	{/if}
</div>

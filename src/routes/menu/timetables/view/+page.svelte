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
		Filter,
		Star
	} from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Item from '$lib/components/ui/item';
	import * as Select from '$lib/components/ui/select';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';
	import * as Popover from '$lib/components/ui/popover';
	import * as Command from '$lib/components/ui/command';
	import { cn } from '$lib/utils';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import { buttonVariants } from '$lib/components/ui/button/index.js';

	let { data } = $props<{ data: PageData; form: ActionData }>();

	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let status = $state(data.filters.status);
	let isSubmitting = $state(false);
	let viewMode = $state<'grid' | 'list'>('grid');
	let yearOpen = $state(false);
	let semOpen = $state(false);
	let archiveOpen = $state(false);
	let timetableToArchiveId = $state<number | null>(null);
	// --- DataTable Columns ---
	const columns: ColumnDef<any>[] = [
		{
			accessorKey: 'name',
			header: 'Timetable Name',
			cell: ({ row }) => renderSnippet(nameCell, { row: row.original })
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
			accessorKey: 'created at',
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
	<Badge variant={getStatusVariant(status)}>
		{#if status == 'published'}
			<Star />
		{/if}
		{status}</Badge
	>
{/snippet}

{#snippet actionsCell({ row }: { row: any })}
	<div class="flex justify-end gap-2">
		{#if row.status.toLowerCase() !== 'archived'}
			<Button
				variant="ghost"
				size="icon"
				onclick={() => {
					timetableToArchiveId = row.id;
					archiveOpen = true;
				}}
				disabled={isSubmitting}
				title="Archive"
			>
				<Archive class="h-4 w-4" />
			</Button>
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
					<Tabs.Trigger value="published">Published</Tabs.Trigger>
					<Tabs.Trigger value="draft">Drafts</Tabs.Trigger>
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
					<Item.Root variant="outline"
						><Item.Header class="flex">
							<Item.Title class="text-2xl flex-1 leading-tight tracking-tight "
								>{tt.name}</Item.Title
							>
							<Item.Actions></Item.Actions>
							<Item.Description class="flex gap-2 items-center"
								><Calendar class="h-3.5 w-3.5" />{tt.academic_year} • {tt.semester}</Item.Description
							>
						</Item.Header>
						<Item.Content>
							<Badge variant="outline" class="shrink-0 capitalize shadow-sm ">
								{tt.status}
							</Badge>
							<Item.Actions class="flex md:justify-end">
								<div
									class="flex justify-end items-center gap-1 group-hover:opacity-100 transition-opacity duration-200"
								>
									{#if tt.status.toLowerCase() !== 'archived'}
										<Button
											variant="ghost"
											size="icon"
											class="h-8 w-8 text-muted-foreground hover:text-destructive"
											disabled={isSubmitting}
											title="Archive"
											onclick={() => {
												timetableToArchiveId = tt.id;
												archiveOpen = true;
											}}
										>
											<Archive class="h-4 w-4" />
										</Button>
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
							</Item.Actions>
						</Item.Content>
						<Separator />
						<Item.Footer class="text-sm text-muted-foreground truncate ">
							<BookOpen class="h-3.5 w-3.5" />
							{tt.colleges?.college_name || 'System-wide'}
						</Item.Footer>
					</Item.Root>
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

<Dialog.Root bind:open={archiveOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Archive Timetable?</Dialog.Title>
			<Dialog.Description>
				Are you sure you want to archive this timetable? It will no longer be active or easily
				visible by default. This action can be undone later by restoring it.
			</Dialog.Description>
		</Dialog.Header>
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
						archiveOpen = false;
						timetableToArchiveId = null;
						await invalidateAll();
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update({ reset: false });
				};
			}}
		>
			<input type="hidden" name="timetableId" value={timetableToArchiveId} />
			<Dialog.Footer class="gap-2">
				<Button
					variant="outline"
					type="button"
					onclick={() => {
						archiveOpen = false;
						timetableToArchiveId = null;
					}}>Cancel</Button
				>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
						Archiving...
					{:else}
						Archive
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

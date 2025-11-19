<script lang="ts" generics="TData">
	import {
		getCoreRowModel,
		getFacetedRowModel,
		getFacetedUniqueValues,
		getFilteredRowModel,
		getPaginationRowModel,
		getSortedRowModel,
		type ColumnDef,
		type ColumnFiltersState,
		type PaginationState,
		type Row,
		type RowSelectionState,
		type SortingState,
		type VisibilityState
	} from '@tanstack/table-core';
	import { createSvelteTable } from '$lib/components/ui/data-table/data-table.svelte.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import * as Table from '$lib/components/ui/table/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Badge } from '$lib/components/ui/badge/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { FlexRender, renderComponent } from '$lib/components/ui/data-table/index.js';
	import DataTableCheckbox from './data-table-checkbox.svelte';

	import {
		Columns,
		Plus,
		ChevronsLeft,
		ChevronLeft,
		ChevronRight,
		ChevronsRight,
		CheckCircle2,
		Loader,
		MoreVertical,
		Search,
		ChevronUp,
		ChevronDown,
		ChevronsUpDown
	} from 'lucide-svelte';
	import { toast } from 'svelte-sonner';

	let {
		data,
		columns,
		showCheckbox = false,
		rowSelection = $bindable(),
		selectedRowsData = $bindable(),
		class: className = ''
	}: {
		data: TData[];
		columns: ColumnDef<TData>[];
		showCheckbox?: boolean;
		rowSelection?: RowSelectionState;
		selectedRowsData?: TData[];
		class?: string;
	} = $props();

	$effect(() => {
		if (selectedRowsData) {
			const selectedRows = table.getFilteredSelectedRowModel().rows.map((row) => row.original);
			if (JSON.stringify(selectedRows) !== JSON.stringify(selectedRowsData)) {
				selectedRowsData = selectedRows;
			}
		}
	});

	let pagination = $state<PaginationState>({ pageIndex: 0, pageSize: 10 });
	let sorting = $state<SortingState>([]);
	let columnFilters = $state<ColumnFiltersState>([]);
	let columnVisibility = $state<VisibilityState>({});
	let globalFilter = $state('');

	const finalColumns = $derived.by(() => {
		if (!showCheckbox) return columns;

		const selectColumn: ColumnDef<TData> = {
			id: 'select',
			header: ({ table }) =>
				renderComponent(DataTableCheckbox, {
					checked: table.getIsAllPageRowsSelected() || undefined,
					indeterminate: table.getIsSomePageRowsSelected() && !table.getIsAllPageRowsSelected(),
					onCheckedChange: (value) => table.toggleAllPageRowsSelected(!!value)
				}),
			cell: ({ row }) =>
				renderComponent(DataTableCheckbox, {
					checked: row.getIsSelected(),
					onCheckedChange: (value) => row.toggleSelected(!!value),
					'aria-label': 'Select row'
				}),
			enableSorting: false,
			enableHiding: false,
			meta: {
				class: 'w-[50px] text-center'
			}
		};
		return [selectColumn, ...columns];
	});

	const table = createSvelteTable({
		get data() {
			return data;
		},
		get columns() {
			return finalColumns;
		},
		state: {
			get pagination() {
				return pagination;
			},
			get sorting() {
				return sorting;
			},
			get columnVisibility() {
				return columnVisibility;
			},
			get rowSelection() {
				return rowSelection;
			},
			get columnFilters() {
				return columnFilters;
			},
			get globalFilter() {
				return globalFilter;
			}
		},
		enableRowSelection: true,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getSortedRowModel: getSortedRowModel(),
		getFacetedRowModel: getFacetedRowModel(),
		getFacetedUniqueValues: getFacetedUniqueValues(),
		getFilteredRowModel: getFilteredRowModel(),
		onPaginationChange: (updater) => {
			if (typeof updater === 'function') {
				pagination = updater(pagination);
			} else {
				pagination = updater;
			}
		},
		onSortingChange: (updater) => {
			if (typeof updater === 'function') {
				sorting = updater(sorting);
			} else {
				sorting = updater;
			}
		},
		onColumnFiltersChange: (updater) => {
			if (typeof updater === 'function') {
				columnFilters = updater(columnFilters);
			} else {
				columnFilters = updater;
			}
		},
		onColumnVisibilityChange: (updater) => {
			if (typeof updater === 'function') {
				columnVisibility = updater(columnVisibility);
			} else {
				columnVisibility = updater;
			}
		},
		onRowSelectionChange: (updater) => {
			if (typeof updater === 'function') {
				rowSelection = updater(rowSelection);
			} else {
				rowSelection = updater;
			}
		},
		onGlobalFilterChange: (updater) => {
			if (typeof updater === 'function') {
				globalFilter = updater(globalFilter);
			} else {
				globalFilter = updater;
			}
		}
	});
	let views = [
		{
			id: 'outline',
			label: 'Outline',
			badge: 0
		},
		{
			id: 'past-performance',
			label: 'Past Performance',
			badge: 3
		},
		{
			id: 'key-personnel',
			label: 'Key Personnel',
			badge: 2
		},
		{
			id: 'focus-documents',
			label: 'Focus Documents',
			badge: 0
		}
	];
	let view = $state('outline');
	let viewLabel = $derived(views.find((v) => view === v.id)?.label ?? 'Select a view');
</script>

<div class={`space-y-4 ${className}`}>
	<div class="flex items-center justify-between">
		<div class="flex flex-1 items-center gap-4">
			<DropdownMenu.Root>
				<DropdownMenu.Trigger>
					{#snippet child({ props })}
						<Button variant="outline" size="sm" {...props}>
							<Columns />
							<span class="hidden lg:inline">Customize Columns</span>
							<span class="lg:hidden">Columns</span>
							<ChevronDown />
						</Button>
					{/snippet}
				</DropdownMenu.Trigger>
				<DropdownMenu.Content align="end" class="w-56">
					{#each table
						.getAllColumns()
						.filter((col) => typeof col.accessorFn !== 'undefined' && col.getCanHide()) as column (column.id)}
						<DropdownMenu.CheckboxItem
							class="capitalize"
							checked={column.getIsVisible()}
							onCheckedChange={(value) => column.toggleVisibility(!!value)}
						>
							{column.id}
						</DropdownMenu.CheckboxItem>
					{/each}
				</DropdownMenu.Content>
			</DropdownMenu.Root>
			<div class="relative w-full max-w-sm">
				<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
				<Input placeholder="Search..." class="pl-10" bind:value={globalFilter} />
			</div>
			<slot name="filters" />
		</div>
		<div class="flex items-center gap-2">
			<slot name="toolbar" />
		</div>
	</div>
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header class="bg-muted/50">
				{#each table.getHeaderGroups() as headerGroup (headerGroup.id)}
					<Table.Row>
						{#each headerGroup.headers as header (header.id)}
							<Table.Head colspan={header.colSpan} class={header.column.columnDef.meta?.class}>
								{#if !header.isPlaceholder}
									{@const canSort = header.column.getCanSort()}
									<Button
										variant="ghost"
										class={canSort ? 'p-2' : ''}
										onclick={header.column.getToggleSortingHandler()}
									>
										<FlexRender
											content={header.column.columnDef.header}
											context={header.getContext()}
										/>
										{#if canSort}
											{#if header.column.getIsSorted() === 'asc'}
												<ChevronUp class="ml-2 h-4 w-4" />
											{:else if header.column.getIsSorted() === 'desc'}
												<ChevronDown class="ml-2 h-4 w-4" />
											{:else}
												<ChevronsUpDown class="ml-2 h-4 w-4" />
											{/if}
										{/if}
									</Button>
								{/if}
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if table.getRowModel().rows?.length}
					{#each table.getRowModel().rows as row (row.id)}
						<Table.Row data-state={row.getIsSelected() && 'selected'}>
							{#each row.getVisibleCells() as cell (cell.id)}
								<Table.Cell>
									<FlexRender content={cell.column.columnDef.cell} context={cell.getContext()} />
								</Table.Cell>
							{/each}
						</Table.Row>
					{/each}
				{:else}
					<Table.Row>
						<Table.Cell colspan={columns.length} class="h-24 text-center">No results.</Table.Cell>
					</Table.Row>
				{/if}
			</Table.Body>
		</Table.Root>
	</div>
	<div class="flex items-center justify-between px-1">
		<div class="flex-1 text-sm text-muted-foreground">
			{table.getFilteredSelectedRowModel().rows.length} of
			{table.getFilteredRowModel().rows.length} row(s) selected.
		</div>
		<div class="flex items-center space-x-6 lg:space-x-8">
			<div class="flex items-center space-x-2">
				<p class="text-sm font-medium">Rows per page</p>
				<Select.Root
					type="single"
					value={`${table.getState().pagination.pageSize}`}
					onValueChange={(v) => {
						if (v) table.setPageSize(Number(v));
					}}
				>
					<Select.Trigger class="h-8 w-[70px]">
						<span>{table.getState().pagination.pageSize}</span>
					</Select.Trigger>
					<Select.Content>
						{#each [10, 20, 30, 40, 50] as pageSize}
							<Select.Item value={`${pageSize}`}>{pageSize}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex w-[100px] items-center justify-center text-sm font-medium">
				Page {table.getState().pagination.pageIndex + 1} of
				{table.getPageCount()}
			</div>
			<div class="flex items-center space-x-2">
				<Button
					variant="outline"
					class="hidden h-8 w-8 p-0 lg:flex"
					onclick={() => table.setPageIndex(0)}
					disabled={!table.getCanPreviousPage()}
				>
					<ChevronsLeft class="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					class="h-8 w-8 p-0"
					onclick={() => table.previousPage()}
					disabled={!table.getCanPreviousPage()}
				>
					<ChevronLeft class="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					class="h-8 w-8 p-0"
					onclick={() => table.nextPage()}
					disabled={!table.getCanNextPage()}
				>
					<ChevronRight class="h-4 w-4" />
				</Button>
				<Button
					variant="outline"
					class="hidden h-8 w-8 p-0 lg:flex"
					onclick={() => table.setPageIndex(table.getPageCount() - 1)}
					disabled={!table.getCanNextPage()}
				>
					<ChevronsRight class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</div>
</div>

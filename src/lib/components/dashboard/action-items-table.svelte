<script lang="ts">
	// import type { PageData } from '../../../routes/menu/dashboard/$types';
	import {
		getCoreRowModel,
		getFilteredRowModel,
		getPaginationRowModel,
		type ColumnDef
	} from '@tanstack/table-core';
	import { createSvelteTable, FlexRender } from '$lib/components/ui/data-table';
	import * as Table from '$lib/components/ui/table';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { RenderComponentConfig } from '$lib/components/ui/data-table/render-helpers';
	import SubjectCell from './subject-cell.svelte';
	import ActionCell from './action-cell.svelte';

	type ActionItem = {
		id: number;
		subjects: {
			subject_code: string;
			subject_name: string;
		};
		blocks: {
			block_name: string;
			programs: {
				program_name: string;
			};
		};
	};

	let { data: actionItems } = $props<{ data: ActionItem[] }>();

	let globalFilter = $state('');

	const columns: ColumnDef<ActionItem>[] = [
		{
			accessorKey: 'subjects',
			header: 'Subject',
			cell: ({ row }) => {
				return new RenderComponentConfig(SubjectCell, { subject: row.original.subjects });
			}
		},
		{
			accessorFn: (row) => row.blocks.programs.program_name,
			header: 'Program'
		},
		{
			accessorFn: (row) => row.blocks.block_name,
			header: 'Block'
		},
		{
			id: 'actions',
			header: 'Action',
			cell: ({ row }) => {
				return new RenderComponentConfig(ActionCell, {
					subjectCode: row.original.subjects?.subject_code
				});
			}
		}
	];

	const table = createSvelteTable({
		get data() {
			return actionItems;
		},
		columns,
		getCoreRowModel: getCoreRowModel(),
		getPaginationRowModel: getPaginationRowModel(),
		getFilteredRowModel: getFilteredRowModel(),
		onStateChange: () => {},
		initialState: {
			pagination: {
				pageSize: 5
			}
		},
		state: {
			get globalFilter() {
				return globalFilter;
			}
		},
		onGlobalFilterChange: (filter) => {
			globalFilter = filter;
		}
	});
</script>

<div class="space-y-4">
	<div class="flex items-center justify-between">
		<Input
			placeholder="Filter by subject, program, or block..."
			bind:value={globalFilter}
			class="max-w-sm"
		/>
	</div>
	<div class="rounded-md border">
		<Table.Root>
			<Table.Header>
				{#each table.getHeaderGroups() as headerGroup}
					<Table.Row>
						{#each headerGroup.headers as header}
							<Table.Head>
								<FlexRender
									content={header.column.columnDef.header}
									context={header.getContext()}
								/>
							</Table.Head>
						{/each}
					</Table.Row>
				{/each}
			</Table.Header>
			<Table.Body>
				{#if table.getRowModel().rows.length}
					{#each table.getRowModel().rows as row}
						<Table.Row>
							{#each row.getVisibleCells() as cell}
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
	<div class="flex items-center justify-end space-x-2">
		<div class="flex-1 text-sm text-muted-foreground">
			{table.getFilteredRowModel().rows.length} row(s).
		</div>
		<Button
			variant="outline"
			size="sm"
			onclick={() => table.setPageIndex(0)}
			disabled={!table.getCanPreviousPage()}
		>
			<ChevronsLeft class="h-4 w-4" />
		</Button>
		<Button
			variant="outline"
			size="sm"
			onclick={() => table.previousPage()}
			disabled={!table.getCanPreviousPage()}
		>
			<ChevronLeft class="h-4 w-4" />
		</Button>
		<Button
			variant="outline"
			size="sm"
			onclick={() => table.nextPage()}
			disabled={!table.getCanNextPage()}
		>
			<ChevronRight class="h-4 w-4" />
		</Button>
		<Button
			variant="outline"
			size="sm"
			onclick={() => table.setPageIndex(table.getPageCount() - 1)}
			disabled={!table.getCanNextPage()}
		>
			<ChevronsRight class="h-4 w-4" />
		</Button>
	</div>
</div>

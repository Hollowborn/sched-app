<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { Trash2, LoaderCircle, Sparkles } from '@lucide/svelte';
	import DataTable from '$lib/components/data-table/data-table.svelte';
	import type { ColumnDef } from '@tanstack/table-core';
	import { renderSnippet } from '$lib/components/ui/data-table';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Select from '$lib/components/ui/select';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Popover from '$lib/components/ui/popover';
	import { Badge } from '$lib/components/ui/badge';

	type Block = {
		id: number;
		block_name: string;
		program_id: number;
		year_level: number;
		programs: { program_name: string } | null;
	};

	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- Component State ---

	let isSubmitting = $state(false);

	// Block State

	let blockDeleteOpen = $state(false);

	let rowSelection = $state<import('@tanstack/table-core').RowSelectionState>({});

	let selectedBlocks = $state<Block[]>([]);

	// Block Form State

	let genProgramId = $state('');

	let genYearLevel = $state<string[]>([]);

	let genCount = $state(2);

	let genPrefix = $state('');

	// --- Derived State ---

	const genProgramPrefix = $derived(
		data.programs

			?.find((p) => p.id.toString() === genProgramId)

			?.program_name.slice(0, 4)

			.toUpperCase()
	);

	$effect(() => {
		if (genProgramPrefix) {
			genPrefix = genProgramPrefix;
		}
	});

	const columns: ColumnDef<Block>[] = [
		{
			accessorKey: 'block_name',

			header: 'Block Name'
		},

		{
			accessorKey: 'programs',

			header: 'Program',

			cell: ({ row }) => {
				const programName = row.original.programs?.program_name;
				if (!programName) {
					return 'N/A'; // Fallback for no program
				}
				return renderSnippet(programBadge, { programName });
			}
		},

		{
			accessorKey: 'year_level',

			header: 'Year Level'
		}
	];
	const selectedRowsCount = $derived(Object.keys(rowSelection).length);
</script>

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
	<Badge
		variant="outline"
		style={`background-color: oklch(from var(${colorVar}) l c h / 0.15); color: var(${colorVar}); border-color: oklch(from var(${colorVar}) l c h / 0.2);`}
	>
		{programName}
	</Badge>
{/snippet}

<svelte:head>
	<title>Block Management | smart-sched</title>
</svelte:head>

<div class="space-y-8">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Blocks</h1>

		<p class="text-muted-foreground mt-1">Manage student block sections.</p>
	</header>

	<DataTable
		data={data.blocks}
		{columns}
		showCheckbox={true}
		bind:rowSelection
		bind:selectedRowsData={selectedBlocks}
	>
		<div slot="toolbar">
			<Button
				variant={selectedRowsCount > 0 ? 'destructive' : 'outline'}
				class={selectedRowsCount === 0 ? 'text-muted-foreground' : ''}
				disabled={isSubmitting || selectedRowsCount === 0}
				onclick={() => {
					blockDeleteOpen = true;
				}}
			>
				<Trash2 class="mr-2 h-4 w-4" />
				Delete ({selectedRowsCount})
			</Button>

			<Popover.Root>
				<Popover.Trigger>
					<Button variant="outline">
						<Sparkles class="mr-2 h-4 w-4 animate-pulse" />

						Bulk Generate
					</Button>
				</Popover.Trigger>

				<Popover.Content class="w-96">
					<form
						method="POST"
						action="?/generateBlocks"
						class="grid gap-4"
						use:enhance={() => {
							isSubmitting = true;

							const toastId = toast.loading('Generating blocks...');

							return async ({ update, result }) => {
								isSubmitting = false;

								if (result.type === 'success') {
									toast.success(result.data?.message, { id: toastId });

									invalidateAll();
								} else if (result.type === 'failure') {
									toast.error(result.data?.message, { id: toastId });
								}

								await update();
							};
						}}
					>
						<div class="space-y-2">
							<h4 class="font-medium leading-none">Bulk Generate Blocks</h4>

							<p class="text-sm text-muted-foreground">
								Quickly create multiple blocks for a program.
							</p>
						</div>

						<div class="grid gap-2">
							<div class="grid grid-cols-3 items-center gap-4">
								<Label for="program">Program</Label>

								<Select.Root type="single" name="program_id" bind:value={genProgramId}>
									<Select.Trigger class="col-span-2 h-8">
										<span class="truncate max-w-48"
											>{data.programs.find((p) => p.id.toString() === genProgramId)?.program_name ||
												'Select Program'}</span
										>
									</Select.Trigger>

									<Select.Content>
										{#each data.programs as program}
											<Select.Item value={program.id.toString()}>{program.program_name}</Select.Item
											>
										{/each}
									</Select.Content>
								</Select.Root>
							</div>

							<div class="grid grid-cols-3 items-center gap-4">
								<Label for="year-level">Year Level</Label>

								<Select.Root type="multiple" name="year_level" bind:value={genYearLevel}>
									<Select.Trigger class="col-span-2 h-8">
										<span
											>{genYearLevel
												? `${genYearLevel}${
														['st', 'nd', 'rd', 'th'][
															((((Number(genYearLevel) + 90) % 100) - 10) % 10) - 1
														] || 'th'
													} Year`
												: 'Select Year'}</span
										>
									</Select.Trigger>

									<Select.Content>
										<Select.Item value="1">1st Year</Select.Item>

										<Select.Item value="2">2nd Year</Select.Item>

										<Select.Item value="3">3rd Year</Select.Item>

										<Select.Item value="4">4th Year</Select.Item>
									</Select.Content>
								</Select.Root>
							</div>

							<div class="grid grid-cols-3 items-center gap-4">
								<Label for="prefix">Prefix</Label>

								<Input
									id="prefix"
									name="prefix"
									class="col-span-2 h-8"
									placeholder="e.g. BSCS-"
									bind:value={genPrefix}
								/>
							</div>

							<div class="grid grid-cols-3 items-center gap-4">
								<Label for="count"># of Blocks</Label>

								<Input
									id="count"
									name="count"
									type="number"
									min="1"
									max="10"
									class="col-span-2 h-8"
									bind:value={genCount}
								/>
							</div>
						</div>

						<Button type="submit" class="w-full" disabled={isSubmitting}>
							{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Generate
						</Button>
					</form>
				</Popover.Content>
			</Popover.Root>
		</div>
	</DataTable>
</div>

<!-- === MODALS === -->

<!-- Block Delete Modal -->

<Dialog.Root bind:open={blockDeleteOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Are you sure?</Dialog.Title>

			<Dialog.Description>
				This will permanently delete <strong>{selectedRowsCount}</strong> selected blocks. This action
				cannot be undone.
			</Dialog.Description>
		</Dialog.Header>

		<form
			method="POST"
			action="?/deleteBlock"
			use:enhance={() => {
				isSubmitting = true;

				const toastId = toast.loading(`Deleting ${selectedRowsCount} blocks...`);

				return async ({ update, result }) => {
					isSubmitting = false;

					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });

						rowSelection = {};

						invalidateAll();

						blockDeleteOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}

					await update();
				};
			}}
		>
			<input type="hidden" name="ids" value={selectedBlocks.map((b) => b.id).join(',')} />

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => {
						blockDeleteOpen = false;
					}}
					disabled={isSubmitting}>Cancel</Button
				>

				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}
						<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />

						Deleting...
					{:else}
						Yes, Delete {selectedRowsCount} Blocks
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

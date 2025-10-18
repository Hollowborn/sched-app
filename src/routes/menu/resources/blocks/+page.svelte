<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import {
		PlusCircle,
		Trash2,
		Pencil,
		LoaderCircle,
		Search,
		Wand2,
		ChevronRight
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
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Collapsible from '$lib/components/ui/collapsible';

	// --- Type Definitions ---
	type Program = {
		id: number;
		program_name: string;
		college_id: number;
		colleges: { college_name: string } | null;
	};

	type Block = {
		id: number;
		block_name: string;
		program_id: number;
		year_level: number;
		programs: { program_name: string } | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- Component State ---
	let isSubmitting = $state(false);
	let searchQuery = $state('');

	// Program State
	let programCreateOpen = $state(false);
	let programEditOpen = $state(false);
	let programDeleteOpen = $state(false);
	let selectedProgram = $state<Program | null>(null);
	let programFormName = $state('');
	let programFormCollegeId = $state('');
	let programCreateId = $state('');

	// Block State
	let bulkGenerateOpen = $state(true);
	let blockDeleteOpen = $state(false);
	let selectedBlock = $state<Block | null>(null);

	// Block Form State
	let genProgramId = $state('');
	let genYearLevel = $state('');
	let genCount = $state(2);
	let genPrefix = $state('');

	// --- Derived State ---
	const programFormCollegeName = $derived(
		data.colleges?.find((c) => c.id.toString() === programFormCollegeId)?.college_name
	);

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

	const filteredBlocks: Block[] = $derived.by(() => {
		const blocks = data.blocks || [];
		if (!searchQuery) return blocks;
		const lowerQuery = searchQuery.toLowerCase();
		return blocks.filter(
			(b) =>
				b.block_name.toLowerCase().includes(lowerQuery) ||
				b.programs?.program_name.toLowerCase().includes(lowerQuery)
		);
	});

	const filteredPrograms: Program[] = $derived.by(() => {
		const programs = data.programs || [];
		if (!searchQuery) return programs;
		const lowerQuery = searchQuery.toLowerCase();
		return programs.filter((p) => p.program_name.toLowerCase().includes(lowerQuery));
	});

	// --- Event Handlers ---
	function openProgramEditModal(program: Program) {
		selectedProgram = program;
		programFormName = program.program_name;
		programFormCollegeId = program.college_id.toString();
		programEditOpen = true;
	}

	function openProgramDeleteModal(program: Program) {
		selectedProgram = program;
		programDeleteOpen = true;
	}

	function openBlockDeleteModal(block: Block) {
		selectedBlock = block;
		blockDeleteOpen = true;
	}
</script>

<div class="space-y-8">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Programs & Blocks</h1>
		<p class="text-muted-foreground mt-1">
			Manage academic programs and their corresponding student block sections.
		</p>
	</header>

	<Tabs.Root value="programs" class="w-full">
		<Tabs.List>
			<Tabs.Trigger value="programs">Programs</Tabs.Trigger>
			<Tabs.Trigger value="blocks">Blocks</Tabs.Trigger>
		</Tabs.List>

		<!-- PROGRAMS TAB -->
		<Tabs.Content value="programs" class="mt-6">
			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Academic Programs</Card.Title>
							<Card.Description>List of all degree programs offered.</Card.Description>
						</div>
						<Button onclick={() => (programCreateOpen = true)} disabled={isSubmitting}>
							<PlusCircle class="mr-2 h-4 w-4" /> Add Program
						</Button>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="border rounded-md">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Program Name</Table.Head>
									<Table.Head>College</Table.Head>
									<Table.Head class="text-right pr-6">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if filteredPrograms.length > 0}
									{#each filteredPrograms as program (program.id)}
										<Table.Row class="hover:bg-muted/50">
											<Table.Cell class="font-medium">{program.program_name}</Table.Cell>
											<Table.Cell>
												<Badge variant="secondary">{program.colleges?.college_name || 'N/A'}</Badge>
											</Table.Cell>
											<Table.Cell class="text-right">
												<Button
													onclick={() => openProgramEditModal(program)}
													variant="ghost"
													size="icon"
													disabled={isSubmitting}
												>
													<Pencil class="h-4 w-4" />
												</Button>
												<Button
													onclick={() => openProgramDeleteModal(program)}
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
										<Table.Cell colspan={3} class="h-24 text-center">No programs found.</Table.Cell>
									</Table.Row>
								{/if}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>

		<!-- BLOCKS TAB -->
		<Tabs.Content value="blocks" class="mt-6 space-y-6">
			<Collapsible.Root class="w-full" bind:open={bulkGenerateOpen}>
				<Card.Root>
					<div class="flex items-center justify-between pr-4 rounded-t-lg cursor-pointer">
						<Card.Header class="flex-1">
							<div class="flex items-center gap-3">
								<Wand2 class="h-6 w-6 text-primary" />
								<div>
									<Card.Title>Bulk Generate Blocks</Card.Title>
									<Card.Description>
										Quickly create multiple blocks for a program with a consistent naming scheme.
									</Card.Description>
								</div>
							</div>
						</Card.Header>
						<Collapsible.Trigger>
							<Button variant="ghost" size="icon">
								<ChevronRight
									class="h-4 w-4 transition-transform {bulkGenerateOpen ? 'rotate-90' : ''}"
								/>
							</Button>
						</Collapsible.Trigger>
					</div>
					<Collapsible.Content>
						<Card.Content class="pt-2">
							<form
								method="POST"
								action="?/generateBlocks"
								class="grid sm:grid-cols-2 md:grid-cols-5 gap-4 items-end p-4 border-t"
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
									<Label>Program</Label>
									<Select.Root type="single" name="program_id" bind:value={genProgramId}>
										<Select.Trigger>
											<span class="truncate max-w-48"
												>{data.programs.find((p) => p.id.toString() === genProgramId)
													?.program_name || 'Select Program'}</span
											>
										</Select.Trigger>
										<Select.Content>
											{#each data.programs as program}
												<Select.Item value={program.id.toString()}
													>{program.program_name}</Select.Item
												>
											{/each}
										</Select.Content>
									</Select.Root>
								</div>
								<div class="space-y-2">
									<Label>Year Level</Label>
									<Select.Root type="single" name="year_level" bind:value={genYearLevel}>
										<Select.Trigger>
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
								<div class="space-y-2">
									<Label for="prefix">Prefix</Label>
									<Input
										id="prefix"
										name="prefix"
										placeholder="e.g. BSCS-"
										bind:value={genPrefix}
									/>
								</div>
								<div class="space-y-2">
									<Label for="count"># of Blocks</Label>
									<Input
										id="count"
										name="count"
										type="number"
										min="1"
										max="10"
										bind:value={genCount}
									/>
								</div>
								<Button type="submit" class="w-full" disabled={isSubmitting}>
									{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Generate
								</Button>
							</form>
						</Card.Content>
					</Collapsible.Content>
				</Card.Root>
			</Collapsible.Root>

			<Card.Root>
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title>Manage Block Sections</Card.Title>
							<Card.Description>View and manage individual student blocks.</Card.Description>
						</div>
						<div class="relative w-full max-w-sm">
							<Search
								class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground"
							/>
							<Input
								placeholder="Search by block or program..."
								class="pl-10"
								bind:value={searchQuery}
							/>
						</div>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="border rounded-md">
						<Table.Root>
							<Table.Header>
								<Table.Row>
									<Table.Head>Block Name</Table.Head>
									<Table.Head>Program</Table.Head>
									<Table.Head>Year</Table.Head>
									<Table.Head class="text-right pr-6">Actions</Table.Head>
								</Table.Row>
							</Table.Header>
							<Table.Body>
								{#if filteredBlocks.length > 0}
									{#each filteredBlocks as block (block.id)}
										<Table.Row class="hover:bg-muted/50">
											<Table.Cell class="font-medium">{block.block_name}</Table.Cell>
											<Table.Cell>{block.programs?.program_name || 'N/A'}</Table.Cell>
											<Table.Cell>{block.year_level}</Table.Cell>
											<Table.Cell class="text-right">
												<Button
													onclick={() => openBlockDeleteModal(block)}
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
										<Table.Cell colspan={4} class="h-24 text-center">No blocks found.</Table.Cell>
									</Table.Row>
								{/if}
							</Table.Body>
						</Table.Root>
					</div>
				</Card.Content>
			</Card.Root>
		</Tabs.Content>
	</Tabs.Root>
</div>

<!-- === MODALS === -->

<!-- Program Create Modal -->
<Dialog.Root bind:open={programCreateOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Create New Program</Dialog.Title>
			<Dialog.Description>Add a new degree program to the system.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createProgram"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating program...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						programCreateOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label for="program-name">Program Name</Label>
					<Input
						id="program-name"
						name="program_name"
						placeholder="e.g. Bachelor of Science in Computer Science"
					/>
				</div>
				<div class="space-y-2">
					<Label for="program-college">College</Label>
					<Select.Root type="single" name="college_id" bind:value={programCreateId}>
						<Select.Trigger>
							<span
								>{data.colleges?.find((c) => c.id.toString() === programCreateId)?.college_name ||
									'Select a college'}</span
							>
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Create Program
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Program Edit Modal -->
<Dialog.Root bind:open={programEditOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Program</Dialog.Title>
			<Dialog.Description>Update the details for this program.</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateProgram"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving changes...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						programEditOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={selectedProgram?.id} />
			<div class="grid gap-4 py-4">
				<div class="space-y-2">
					<Label for="edit-program-name">Program Name</Label>
					<Input id="edit-program-name" name="program_name" bind:value={programFormName} />
				</div>
				<div class="space-y-2">
					<Label for="edit-program-college">College</Label>
					<Select.Root name="college_id" type="single" bind:value={programFormCollegeId}>
						<Select.Trigger>
							<span>{programFormCollegeName || 'Select a college'}</span>
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<!-- Program Delete Modal -->
{#if selectedProgram}
	<Dialog.Root bind:open={programDeleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the program <strong>{selectedProgram.program_name}</strong>.
					This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/deleteProgram"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Deleting program...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							programDeleteOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedProgram.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (programDeleteOpen = false)}
						disabled={isSubmitting}>Cancel</Button
					>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Yes, Delete
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

<!-- Block Delete Modal -->
{#if selectedBlock}
	<Dialog.Root bind:open={blockDeleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the block <strong>{selectedBlock.block_name}</strong>. This
					action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/deleteBlock"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Deleting block...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							blockDeleteOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedBlock.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (blockDeleteOpen = false)}
						disabled={isSubmitting}>Cancel</Button
					>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if} Yes, Delete
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

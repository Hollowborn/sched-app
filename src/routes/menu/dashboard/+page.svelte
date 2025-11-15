<script lang="ts">
	import type { PageData } from './$types';
	import * as Card from '$lib/components/ui/card';
	import { Users, Building, BookCopy, GraduationCap, ArrowRight } from '@lucide/svelte';
	import WorkloadBarchart from '$lib/components/charts/workload-barchart.svelte';
	import ScheduleDonutchart from '$lib/components/charts/schedule-donutchart.svelte';
	import ChartBarDefault from '$lib/components/charts/chart-bar-default.svelte';
	import * as Table from '$lib/components/ui/table';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props<{ data: PageData }>();
	const { profile, stats, workloadData, scheduleStatusData, actionItems } = data;

	const scopeText =
		profile?.role === 'Admin' || profile?.role === 'Registrar'
			? 'University-wide'
			: 'In your college';
</script>

<svelte:head>
	<title>Dashboard | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Dashboard</h1>
		<p class="text-muted-foreground">
			{#if profile?.role === 'Dean'}
				An overview of your college's scheduling and resource status.
			{:else}
				An overview of the university's scheduling and resource status.
			{/if}
		</p>
	</header>

	<!-- Responsive Grid Layout -->
	<div class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
		<!-- Stat Card 1 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Instructors</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{stats.instructorCount}
				</div>
				<p class="text-xs text-muted-foreground">{scopeText}</p>
			</Card.Content>
		</Card.Root>

		<!-- Stat Card 2 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Rooms</Card.Title>
				<Building class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{stats.roomCount}
				</div>
				<p class="text-xs text-muted-foreground">{scopeText}</p>
			</Card.Content>
		</Card.Root>

		<!-- Stat Card 3 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Subjects</Card.Title>
				<BookCopy class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{stats.subjectCount}
				</div>
				<p class="text-xs text-muted-foreground">{scopeText}</p>
			</Card.Content>
		</Card.Root>

		<!-- Stat Card 4 -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Programs</Card.Title>
				<GraduationCap class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">
					{stats.programCount}
				</div>
				<p class="text-xs text-muted-foreground">{scopeText}</p>
			</Card.Content>
		</Card.Root>
	</div>

	<div class="grid grid-cols-12 gap-6">
		<!-- Main Chart -->
		<Card.Root class="col-span-12 lg:col-span-8">
			<Card.Header>
				<Card.Title>Instructor Workload</Card.Title>
				<Card.Description>Distribution of teaching loads for the current term.</Card.Description>
			</Card.Header>
			<Card.Content class="pl-2">
				<!-- <WorkloadBarchart data={workloadData} /> -->
				<ChartBarDefault />
			</Card.Content>
		</Card.Root>

		<!-- Side Chart -->
		<Card.Root class="col-span-12 lg:col-span-4">
			<Card.Header>
				<Card.Title>Schedule Status</Card.Title>
				<Card.Description>Class assignment status for the current term.</Card.Description>
			</Card.Header>
			<Card.Content>
				<ScheduleDonutchart data={scheduleStatusData} />
			</Card.Content>
		</Card.Root>

		<!-- Bottom Table -->
		<Card.Root class="col-span-12">
			<Card.Header>
				<Card.Title>Action Items: Unassigned Classes</Card.Title>
				<Card.Description>
					These classes are offered but do not have an instructor assigned for the current term.
				</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="border rounded-md">
					<Table.Root>
						<Table.Header>
							<Table.Row>
								<Table.Head>Subject</Table.Head>
								<Table.Head>Block</Table.Head>
								<Table.Head class="text-right">Action</Table.Head>
							</Table.Row>
						</Table.Header>
						<Table.Body>
							{#if actionItems.length > 0}
								{#each actionItems as item}
									<Table.Row>
										<Table.Cell>
											<div class="font-medium">{item.subjects.subject_code}</div>
											<div class="text-sm text-muted-foreground">{item.subjects.subject_name}</div>
										</Table.Cell>
										<Table.Cell>{item.blocks.block_name}</Table.Cell>
										<Table.Cell class="text-right">
											<Button href="/menu/academics/assignments" variant="outline" size="sm">
												Assign <ArrowRight class="ml-2 h-4 w-4" />
											</Button>
										</Table.Cell>
									</Table.Row>
								{/each}
							{:else}
								<Table.Row>
									<Table.Cell colspan={3} class="h-24 text-center">
										All classes have an instructor assigned. Great work!
									</Table.Cell>
								</Table.Row>
							{/if}
						</Table.Body>
					</Table.Root>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

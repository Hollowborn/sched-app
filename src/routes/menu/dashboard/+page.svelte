<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Users, Building, BookCopy, GraduationCap, Calendar, BookOpen } from 'lucide-svelte';
	import ChartBarDefault from '$lib/components/charts/chart-bar-default.svelte';
	import PieChartInteractive from '$lib/components/charts/pie-chart-interactive.svelte';
	import ActionItemsTable from '$lib/components/dashboard/action-items-table.svelte';
	import * as Select from '$lib/components/ui/select';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';

	let { data } = $props<{ data: PageData }>();
	const { profile, stats, workloadData, scheduleStatusData, actionItems, academic_year, semester } =
		data;

	const scopeText =
		profile?.role === 'Admin' || profile?.role === 'Registrar'
			? 'University-wide'
			: 'In your college';

	// --- State ---
	let selectedAcademicYear = $state(academic_year);
	let selectedSemester = $state(semester);

	// --- Helpers ---
	function generateAcademicYears() {
		const currentYear = new Date().getFullYear();
		const years = [];
		for (let i = -2; i <= 2; i++) {
			const startYear = currentYear + i;
			years.push(`${startYear}-${startYear + 1}`);
		}
		return years;
	}

	const academicYears = generateAcademicYears();
	const semesters = ['1st Semester', '2nd Semester', 'Summer'];

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams(window.location.search);
		params.set('academic_year', selectedAcademicYear);
		params.set('semester', selectedSemester);
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true });
	}
</script>

<svelte:head>
	<title>Dashboard | smart-sched</title>
</svelte:head>

<div class="space-y-8">
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Welcome back, {profile?.username}!</h1>
			<p class="text-muted-foreground">
				Here's a quick look at what's happening {scopeText.toLowerCase()}.
			</p>
		</div>
		<div class="flex items-center gap-4">
			<Select.Root
				type="single"
				value={selectedSemester}
				onValueChange={(v) => {
					if (v) {
						selectedSemester = v;
						handleFilterChange();
					}
				}}
			>
				<Select.Trigger class="w-[180px]">
					<Calendar /><span>{selectedSemester}</span>
				</Select.Trigger>
				<Select.Content>
					{#each semesters as sem}
						<Select.Item value={sem}>{sem}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
			<Select.Root
				type="single"
				value={selectedAcademicYear}
				onValueChange={(v) => {
					if (v) {
						selectedAcademicYear = v;
						handleFilterChange();
					}
				}}
			>
				<Select.Trigger class="w-[180px]">
					<BookOpen /><span>{selectedAcademicYear}</span>
				</Select.Trigger>
				<Select.Content>
					{#each academicYears as year}
						<Select.Item value={year}>{year}</Select.Item>
					{/each}
				</Select.Content>
			</Select.Root>
		</div>
	</div>
	<Separator class="md:mt-12 " />
	<!-- Main content grid -->
	<div class="grid grid-cols-12 gap-6">
		<!-- Stat Cards -->
		<Card.Root class="col-span-12 lg:col-span-8 ">
			<Card.Header>
				<Card.Title>At a Glance</Card.Title>
				<Card.Description>Your key resource metrics for the selected term.</Card.Description>

				<Card.Action>
					<Badge variant="outline" class="mt-1 text-xs text-muted-foreground"
						><div class="bg-primary size-2 rounded-full"></div>
						{scopeText}</Badge
					>
				</Card.Action>
			</Card.Header>
			<Card.Content class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
				<Card.Root class="hover-lift transition-base">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Total Instructors</Card.Title>
						<Users class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.instructorCount}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root class="hover-lift transition-base">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Total Rooms</Card.Title>
						<Building class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.roomCount}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root class="hover-lift transition-base">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Total Subjects</Card.Title>
						<BookCopy class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.subjectCount}</div>
					</Card.Content>
				</Card.Root>
				<Card.Root class="hover-lift transition-base">
					<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
						<Card.Title class="text-sm font-medium">Total Programs</Card.Title>
						<GraduationCap class="h-4 w-4 text-muted-foreground" />
					</Card.Header>
					<Card.Content>
						<div class="text-2xl font-bold">{stats.programCount}</div>
					</Card.Content>
				</Card.Root>
			</Card.Content>
		</Card.Root>
		<Card.Root class="col-span-12 lg:col-span-4">
			<Card.Header>
				<Card.Title>Quick Actions</Card.Title>
				<Card.Description>Navigate to commonly used sections.</Card.Description>
			</Card.Header>
			<Card.Content class="flex flex-col gap-2">
				<Button variant="outline" href="/menu/resources/subjects?action=create">Add Subjects</Button
				>
				<Button variant="outline" href="/menu/timetables/generate">Create Timetable</Button>
				<Button variant="outline" href="/menu/timetables/view">View Timetables</Button>
				<Button variant="outline" href="/menu/academics/offerings?action=create">Add Classes</Button
				>
			</Card.Content>
		</Card.Root>

		<!-- Charts -->
		<Card.Root class="col-span-12 lg:col-span-4">
			<Card.Content>
				<PieChartInteractive data={scheduleStatusData} />
			</Card.Content>
		</Card.Root>

		<Card.Root class="col-span-12 lg:col-span-8">
			<Card.Header>
				<Card.Title>Instructor Workload</Card.Title>
				<Card.Description
					>A look at the teaching load distribution for {selectedSemester}
					{selectedAcademicYear}.</Card.Description
				>
			</Card.Header>
			<Card.Content class="pl-2">
				<ChartBarDefault data={workloadData} />
			</Card.Content>
		</Card.Root>

		<!-- Action Items Table -->
		<div class="col-span-12">
			<Card.Root>
				<Card.Header>
					<Card.Title>Assign Instructors</Card.Title>
					<Card.Description>
						The following classes are offered but still need an instructor.
					</Card.Description>
				</Card.Header>
				<Card.Content>
					{#if actionItems.length > 0}
						<ActionItemsTable data={actionItems} />
					{:else}
						<div class="flex h-24 items-center justify-center rounded-md border">
							<p class="text-muted-foreground">
								All classes have an instructor assigned. Great work!
							</p>
						</div>
					{/if}
				</Card.Content>
			</Card.Root>
		</div>
	</div>
</div>

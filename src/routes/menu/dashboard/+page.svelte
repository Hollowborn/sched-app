<script lang="ts">
	import type { PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';

	import {
		Users,
		Building,
		BookCopy,
		GraduationCap,
		Calendar,
		BookOpen,
		FileText,
		ArrowRight
	} from 'lucide-svelte';
	import ChartBarDefault from '$lib/components/charts/chart-bar-default.svelte';
	import PieChartInteractive from '$lib/components/charts/pie-chart-interactive.svelte';

	// shadcn-svelte components
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import Separator from '$lib/components/ui/separator/separator.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { Button } from '$lib/components/ui/button';
	import Label from '$lib/components/ui/label/label.svelte';

	let { data } = $props<{ data: PageData }>();
	const {
		profile,
		stats,
		workloadData,
		scheduleStatusData,
		actionItems,
		publishedTimetable,
		academic_year,
		semester
	} = data;

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

	<!-- Published Timetable Card -->
	<div class="mb-6">
		{#if publishedTimetable}
			<Card.Root class="border-primary/50 bg-primary/5">
				<Card.Header>
					<div class="flex items-center justify-between">
						<div>
							<Card.Title class="flex items-center gap-2 text-xl">
								<FileText class="h-5 w-5 text-primary" />
								{publishedTimetable.name}
							</Card.Title>
							<Card.Description>Published Timetable for {semester} {academic_year}</Card.Description
							>
						</div>
						<Badge variant="default" class="bg-primary text-primary-foreground">Published</Badge>
					</div>
				</Card.Header>
				<Card.Content>
					<div class="flex flex-col justify-between gap-4 sm:flex-row sm:items-center">
						<div class="text-sm text-muted-foreground">
							Generated on: {new Date(publishedTimetable.created_at).toLocaleDateString()}
						</div>
						<Button href={`/menu/timetables/view/${publishedTimetable.id}`} class="gap-2">
							View Full Schedule <ArrowRight class="h-4 w-4" />
						</Button>
					</div>
				</Card.Content>
			</Card.Root>
		{:else}
			<Card.Root class="border-dashed border-muted bg-muted/20">
				<Card.Header>
					<Card.Title class="text-xl text-muted-foreground">No Published Timetable</Card.Title>
					<Card.Description
						>There is currently no published timetable for {semester}
						{academic_year}.</Card.Description
					>
				</Card.Header>
				<Card.Content class="flex gap-4">
					<Button variant="default" href="/menu/timetables/generate">Generate New Timetable</Button>
					<Button variant="outline" href="/menu/timetables/view">View Drafts</Button>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

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
					<Card.Footer><Label class="text-muted-foreground">...</Label></Card.Footer>
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
				<Button variant="outline" href="/menu/timetables/view">View Schedules</Button>
				<Button variant="outline" href="/menu/academics/offerings?action=create">Add Classes</Button
				>
			</Card.Content>
		</Card.Root>

		<!-- Charts -->
		<Card.Root class="col-span-12 lg:col-span-4">
			<Card.Content class="p-4 hover-lift transition-base">
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
			<Card.Content class="p-4 hover-lift transition-base">
				<ChartBarDefault data={workloadData} />
			</Card.Content>
		</Card.Root>

		<!-- Data Readiness Status -->
		<Card.Root class="col-span-12 lg:col-span-4">
			<Card.Header>
				<Card.Title>Data Readiness Check</Card.Title>
				<Card.Description>Review pending data entries before generation.</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-4">
					<div>
						<div class="flex items-center justify-between text-sm">
							<span class="font-medium">Unassigned Classes</span>
							<Badge variant={actionItems.length === 0 ? 'secondary' : 'destructive'}>
								{actionItems.length}
							</Badge>
						</div>
						{#if actionItems.length > 0}
							<p class="text-xs text-muted-foreground mt-1">
								{actionItems.length} class(es) need an instructor assignment.
							</p>
							<Button
								variant="outline"
								size="sm"
								class="w-full mt-2"
								href="/menu/academics/assignments"
							>
								Assign Instructors
							</Button>
						{:else}
							<p class="text-xs mt-1 text-green-600">All classes have an instructor assigned!</p>
						{/if}
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

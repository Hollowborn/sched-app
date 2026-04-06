<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import {
		Users,
		Building,
		BookCopy,
		GraduationCap,
		GalleryVerticalEndIcon,
		ChevronRightIcon,
		LayoutDashboard,
		Library,
		UsersRound,
		School,
		CalendarDays,
		GanttChartSquare,
		FileCheck,
		LogOutIcon,
		ChevronsUpDownIcon,
		CircleHelp,
		CheckCircle2
	} from 'lucide-svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Select from '$lib/components/ui/select';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import ChartBarDefault from '$lib/components/charts/chart-bar-default.svelte';
	import PieChartInteractive from '$lib/components/charts/pie-chart-interactive.svelte';
	import ActionItemsTable from '$lib/components/dashboard/action-items-table.svelte';
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import Separator from '$lib/components/ui/separator/separator.svelte';

	let { activeFeature = 'resources' } = $props<{ activeFeature: string }>();

	// --- Static Data ---
	const user = {
		username: 'Juan de la Cruz',
		role: 'Admin',
		email: 'jane.doe@example.com'
	};

	const navItems = [
		{
			title: 'Resources',
			icon: 'Library',
			url: 'javascript:void(0)',
			roles: ['Admin', 'Dean', 'Registrar'],
			items: [
				{ title: 'Instructors', url: 'javascript:void(0)', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Rooms', url: 'javascript:void(0)', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Subjects', url: 'javascript:void(0)', roles: ['Admin', 'Dean', 'Registrar'] },
				{
					title: 'Programs & Blocks',
					url: 'javascript:void(0)',
					roles: ['Admin', 'Dean', 'Registrar']
				}
			]
		},
		{
			title: 'Academics',
			icon: 'School',
			url: 'javascript:void(0)',
			roles: ['Admin', 'Dean', 'Registrar'],
			items: [
				{
					title: 'Class Offerings',
					url: 'javascript:void(0)',
					roles: ['Admin', 'Dean', 'Registrar']
				},
				{
					title: 'Instructor Assignments',
					url: 'javascript:void(0)',
					roles: ['Admin', 'Dean', 'Registrar']
				}
			]
		},
		{
			title: 'Timetables',
			icon: 'CalendarDays',
			url: 'javascript:void(0)',
			roles: ['Admin', 'Dean', 'Registrar'],
			items: [
				{ title: 'Scheduler', url: 'javascript:void(0)', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Generate', url: 'javascript:void(0)', roles: ['Admin', 'Dean', 'Registrar'] },
				{
					title: 'View Published',
					url: 'javascript:void(0)',
					roles: ['Admin', 'Dean', 'Registrar']
				}
			]
		}
	];

	const stats = {
		instructorCount: 128,
		roomCount: 42,
		subjectCount: 256,
		programCount: 32
	};

	const workloadData = [
		{ name: 'Dr. Smith', load: 18, max_load: 18 },
		{ name: 'Prof. Jones', load: 15, max_load: 18 },
		{ name: 'Dr. Williams', load: 21, max_load: 18 }
	];

	const scheduleStatusData = [
		{ name: 'Assigned', value: 432 },
		{ name: 'Unassigned', value: 58 }
	];

	const actionItems: {
		id: number;
		subjects: { subject_code: string; subject_name: string };
		blocks: { block_name: string };
	}[] = [
		{
			id: 1,
			subjects: { subject_code: 'CS101', subject_name: 'Intro to Programming' },
			blocks: { block_name: 'BSCS-1A' }
		},
		{
			id: 2,
			subjects: { subject_code: 'ENG102', subject_name: 'Technical Writing' },
			blocks: { block_name: 'BSIT-1B' }
		}
	];

	const academicYears = ['2024-2025', '2025-2026', '2026-2027'];
	const semesters = ['1st Semester', '2nd Semester', 'Summer'];

	let selectedAcademicYear = '2025-2026';
	let selectedSemester = '1st Semester';

	const nameInitial = user.username ? user.username.charAt(0).toUpperCase() : 'U';

	const icons = {
		Library,
		School,
		CalendarDays,
		LayoutDashboard,
		FileCheck,
		GanttChartSquare,
		UsersRound,
		CircleHelp
	};
</script>

<Card.Root
	class="flex flex-col h-full w-full overflow-hidden text-left shadow-lg pt-0 relative bg-background"
>
	<!-- Main Content Mock -->
	<div class="flex flex-col relative flex-1 h-full w-full">
		<header
			class="flex shrink-0 items-center gap-2 border-b px-4 bg-background z-10"
			style="height: 57px;"
		>
			<Sidebar.Trigger class="-ml-1 min-[400px]:hidden" />
			<Separator orientation="vertical" class="mx-2 h-4 hidden min-[400px]:block" />
			<h1 class="font-bold">
				{#if activeFeature === 'role'}
					Role-Based Dashboard
				{:else if activeFeature === 'resources'}
					Resource Management
				{:else if activeFeature === 'planning'}
					Academic Planning
				{:else if activeFeature === 'users'}
					User Management
				{:else if activeFeature === 'output'}
					Timetables
				{:else}
					Dashboard
				{/if}
			</h1>
		</header>
		<div
			class="flex-1 space-y-6 sm:space-y-8 p-4 sm:p-8 overflow-y-auto w-full absolute inset-0 top-[57px] custom-scrollbar"
		>
			{#if activeFeature === 'resources' || activeFeature === 'role'}
				<!-- Resources Preview -->
				<div class="flex flex-col gap-4">
					<div>
						<h1 class="text-xl sm:text-2xl font-bold tracking-tight">At a Glance</h1>
						<p class="text-sm text-muted-foreground">
							Key resource metrics for {selectedSemester}
							{selectedAcademicYear}.
						</p>
					</div>
					<div class="grid gap-4 grid-cols-2 lg:grid-cols-4">
						<Card.Root>
							<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
								<Users class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content class="p-4 pt-0">
								<div class="text-xl sm:text-2xl font-bold">{stats.instructorCount}</div>
								<p class="text-xs text-muted-foreground shrink-0 leading-none mt-1">Instructors</p>
							</Card.Content>
						</Card.Root>
						<Card.Root>
							<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2 p-4">
								<Building class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content class="p-4 pt-0">
								<div class="text-xl sm:text-2xl font-bold">{stats.roomCount}</div>
								<p class="text-xs text-muted-foreground shrink-0 leading-none mt-1">Rooms</p>
							</Card.Content>
						</Card.Root>
						<Card.Root>
							<Card.Header
								class="flex flex-row items-center justify-between space-y-0 pb-2 p-4 hidden lg:flex"
							>
								<BookCopy class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content class="p-4 pt-0 hidden lg:block">
								<div class="text-xl sm:text-2xl font-bold">{stats.subjectCount}</div>
								<p class="text-xs text-muted-foreground shrink-0 leading-none mt-1">Subjects</p>
							</Card.Content>
						</Card.Root>
						<Card.Root>
							<Card.Header
								class="flex flex-row items-center justify-between space-y-0 pb-2 p-4 hidden lg:flex"
							>
								<GraduationCap class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content class="p-4 pt-0 hidden lg:block">
								<div class="text-xl sm:text-2xl font-bold">{stats.programCount}</div>
								<p class="text-xs text-muted-foreground shrink-0 leading-none mt-1">Programs</p>
							</Card.Content>
						</Card.Root>
					</div>

					<Card.Root>
						<Card.Header class="p-4">
							<Card.Title class="text-sm">Recent Activity</Card.Title>
						</Card.Header>
						<Card.Content class="p-4 pt-0">
							<div class="space-y-4">
								{#each [1, 2, 3] as _}
									<div class="flex items-center gap-4">
										<div
											class="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0"
										>
											<FileCheck class="h-4 w-4 text-primary" />
										</div>
										<div class="space-y-1 w-full">
											<div class="h-3 w-1/2 bg-muted rounded"></div>
											<div class="h-2 w-1/4 bg-muted/60 rounded"></div>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			{#if activeFeature === 'planning'}
				<!-- Planning Preview -->
				<div class="flex flex-col gap-6">
					<div>
						<h1 class="text-xl sm:text-2xl font-bold tracking-tight">Workload Distribution</h1>
						<p class="text-sm text-muted-foreground">
							Monitor teaching loads and maximize efficiency.
						</p>
					</div>
					<div class="grid grid-cols-1 xl:grid-cols-2 gap-6">
						<Card.Root class="xl:col-span-2">
							<Card.Header class="p-4">
								<Card.Title class="text-sm">Instructor Workload</Card.Title>
							</Card.Header>
							<Card.Content class="p-4 pt-0 pl-0">
								<div
									class="h-[180px] w-full border rounded flex items-center justify-center bg-muted/10 p-2 overflow-hidden"
								>
									{#if workloadData.length > 0}
										<div
											class="flex items-end justify-around w-full h-[140px] px-2 gap-2 mt-4 relative"
										>
											<div
												class="absolute top-4 left-0 w-full border-t border-dashed border-red-500/50"
												title="Max Load"
											></div>
											<div class="absolute top-4 left-0 text-[10px] text-red-500/80 -translate-y-4">
												Max Load (18)
											</div>
											{#each workloadData as w}
												<div class="flex flex-col items-center justify-end h-full gap-2 relative">
													<div
														class="w-8 sm:w-12 bg-primary rounded-t-sm transition-all hover:bg-primary/80 relative group"
														style="height: {(w.load / 24) * 100}%"
													>
														<div
															class="absolute -top-6 left-1/2 -translate-x-1/2 bg-popover text-popover-foreground text-xs px-2 py-1 rounded shadow hidden group-hover:block whitespace-nowrap z-10"
														>
															{w.load} units
														</div>
													</div>
													<span class="text-[10px] text-muted-foreground truncate w-12 text-center"
														>{w.name.split(' ')[1]}</span
													>
												</div>
											{/each}
										</div>
									{/if}
								</div>
							</Card.Content>
						</Card.Root>
						<Card.Root class="xl:col-span-1">
							<Card.Header class="p-4">
								<Card.Title class="text-sm">Assignment Status</Card.Title>
							</Card.Header>
							<Card.Content class="p-4 pt-0">
								<div
									class="h-[180px] w-full border rounded flex items-center justify-center bg-muted/10"
								>
									<div class="flex items-center gap-4">
										<div
											class="relative size-24 shrink-0 shadow-lg rounded-full overflow-hidden"
											style="background: conic-gradient(hsl(var(--primary)) 0% 88%, hsl(var(--muted)) 88% 100%);"
										>
											<div
												class="absolute inset-0 m-4 bg-background rounded-full flex flex-col items-center justify-center text-center"
											>
												<span class="text-xs font-bold text-primary">88%</span>
											</div>
										</div>
										<div class="flex flex-col gap-2 text-xs">
											<div class="flex items-center gap-2">
												<div class="size-3 bg-primary rounded-sm"></div>
												Assigned
											</div>
											<div class="flex items-center gap-2">
												<div class="size-3 bg-muted rounded-sm"></div>
												Unassigned
											</div>
										</div>
									</div>
								</div>
							</Card.Content>
						</Card.Root>
					</div>
				</div>
			{/if}

			{#if activeFeature === 'output'}
				<!-- Output Preview -->
				<div class="flex flex-col gap-4">
					<div>
						<h1 class="text-xl sm:text-2xl font-bold tracking-tight">Generation Results</h1>
						<p class="text-sm text-muted-foreground">
							Conflict-free timetables automatically created.
						</p>
					</div>
					<Card.Root>
						<Card.Header class="p-4 bg-primary/5 rounded-t-lg border-b border-primary/10">
							<div class="flex items-center justify-between">
								<Card.Title class="text-base text-primary flex items-center gap-2">
									<CheckCircle2 class="size-5" /> 100% Conflict-Free
								</Card.Title>
								<Badge variant="default" class="shadow-sm">Generated successfully</Badge>
							</div>
						</Card.Header>
						<Card.Content class="p-4 pt-6 space-y-6">
							<div class="grid grid-cols-2 md:grid-cols-4 gap-4">
								<div class="space-y-1">
									<p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">
										Algorithm
									</p>
									<p class="text-sm font-semibold">Constraint Programming</p>
								</div>
								<div class="space-y-1">
									<p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">
										Classes Configured
									</p>
									<p class="text-sm font-semibold">{scheduleStatusData[0].value}</p>
								</div>
								<div class="space-y-1">
									<p class="text-xs text-muted-foreground font-medium uppercase tracking-wider">
										Completion Time
									</p>
									<p class="text-sm font-semibold">4.21 seconds</p>
								</div>
							</div>

							<Separator />

							<div class="space-y-4">
								<h4 class="text-sm font-medium">Auto-assigned Classes Preview</h4>
								<div class="rounded-md border p-1 shadow-sm overflow-hidden bg-background">
									<div
										class="grid grid-cols-3 bg-muted/50 p-2 text-xs font-semibold text-muted-foreground rounded-sm"
									>
										<div>Code</div>
										<div>Description</div>
										<div>Block</div>
									</div>
									{#each actionItems as item}
										<div
											class="grid grid-cols-3 p-2 text-sm border-t border-border/40 hover:bg-muted/10 transition-colors"
										>
											<div class="font-medium">{item.subjects.subject_code}</div>
											<div class="truncate text-muted-foreground pr-2">
												{item.subjects.subject_name}
											</div>
											<div class="font-mono text-xs mt-1 w-fit">{item.blocks.block_name}</div>
										</div>
									{/each}
								</div>
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}

			{#if activeFeature === 'users'}
				<!-- User Management Preview -->
				<div class="flex flex-col gap-4">
					<div>
						<h1 class="text-xl sm:text-2xl font-bold tracking-tight">Active Accounts</h1>
						<p class="text-sm text-muted-foreground">
							Manage roles, access, and specific college permissions.
						</p>
					</div>
					<Card.Root>
						<Card.Header class="p-0 border-b">
							<div class="flex items-center justify-between p-4">
								<div>
									<Card.Title class="text-sm">User Directory</Card.Title>
								</div>
								<div class="flex items-center gap-2">
									<Badge
										variant="secondary"
										class="bg-primary/10 text-primary hover:bg-primary/20 cursor-pointer"
										>+ Add User</Badge
									>
								</div>
							</div>
							<div class="px-4 pb-4">
								<div
									class="h-8 rounded-md bg-muted/40 border border-input flex items-center px-3 gap-2"
								>
									<div class="size-3 rounded-full border border-muted-foreground"></div>
									<div class="h-3 w-32 bg-muted rounded-sm"></div>
								</div>
							</div>
						</Card.Header>
						<Card.Content class="p-0">
							<div class="divide-y text-sm">
								<div class="flex items-center justify-between p-4 bg-muted/20">
									<div class="font-medium text-xs text-muted-foreground uppercase tracking-wider">
										User Profile
									</div>
									<div
										class="font-medium text-xs text-muted-foreground uppercase tracking-wider text-right"
									>
										Role
									</div>
								</div>
								{#each [{ n: 'Alice Johnson', r: 'Admin', c: 'blue' }, { n: 'Bob Williams', r: 'Dean', c: 'green' }, { n: 'Clara Zeta', r: 'Registrar', c: 'orange' }] as mockUser}
									<div
										class="flex items-center justify-between p-4 hover:bg-muted/10 transition-colors"
									>
										<div class="flex items-center gap-3">
											<div
												class="size-8 sm:size-10 rounded-full bg-muted flex items-center justify-center shrink-0 border shadow-sm"
											>
												{mockUser.n.charAt(0)}
											</div>
											<div class="space-y-1">
												<div class="font-medium leading-none">{mockUser.n}</div>
												<div class="text-xs text-muted-foreground truncate w-32 hidden sm:block">
													user@{mockUser.n.split(' ')[0].toLowerCase()}.edu
												</div>
											</div>
										</div>
										<div class="flex items-center justify-end">
											<Badge
												variant="outline"
												class="font-normal capitalize ml-auto"
												style="color: var(--{mockUser.c}-500); border-color: var(--{mockUser.c}-500, #999);"
											>
												{mockUser.r}
											</Badge>
										</div>
									</div>
								{/each}
							</div>
						</Card.Content>
					</Card.Root>
				</div>
			{/if}
		</div>
	</div>
</Card.Root>

<style>
	/* Styling for the slim scrollbar */
	.custom-scrollbar::-webkit-scrollbar {
		width: 6px;
	}
	.custom-scrollbar::-webkit-scrollbar-track {
		background: transparent;
	}
	.custom-scrollbar::-webkit-scrollbar-thumb {
		background-color: var(--muted-foreground);
		border-radius: 10px;
		opacity: 0.1;
	}
</style>

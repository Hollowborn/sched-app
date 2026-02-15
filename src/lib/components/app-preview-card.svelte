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
		Settings,
		LogOutIcon,
		ChevronsUpDownIcon,
		SunIcon,
		MoonIcon
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
	import SiteHeader from '$lib/components/site-header.svelte';
	import Separator from '$lib/components/ui/separator/separator.svelte';

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
			url: '#',
			roles: ['Admin', 'Dean', 'Registrar'],
			items: [
				{ title: 'Instructors', url: '#', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Rooms', url: '#', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Subjects', url: '#', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Programs & Blocks', url: '#', roles: ['Admin', 'Dean', 'Registrar'] }
			]
		},
		{
			title: 'Academics',
			icon: 'School',
			url: '#',
			roles: ['Admin', 'Dean', 'Registrar'],
			items: [
				{ title: 'Class Offerings', url: '#', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Instructor Assignments', url: '#', roles: ['Admin', 'Dean', 'Registrar'] }
			]
		},
		{
			title: 'Timetables',
			icon: 'CalendarDays',
			url: '#',
			roles: ['Admin', 'Dean', 'Registrar'],
			items: [
				{ title: 'Scheduler', url: '#', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'Generate', url: '#', roles: ['Admin', 'Dean', 'Registrar'] },
				{ title: 'View Published', url: '#', roles: ['Admin', 'Dean', 'Registrar'] }
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
		{ name: 'Dr. Williams', load: 21, max_load: 18 },
		{ name: 'Prof. Brown', load: 12, max_load: 15 },
		{ name: 'Dr. Davis', load: 17, max_load: 18 },
		{ name: 'Prof. Miller', load: 9, max_load: 12 }
	];

	const scheduleStatusData = [
		{ status: 'Assigned', count: 432 },
		{ status: 'Unassigned', count: 58 }
	];

	const actionItems = [];

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
		UsersRound
	};
</script>

<Card.Root
	class="grid h-full w-full grid-cols-[260px_1fr] overflow-hidden text-left  maw-h-[50vh] shadow-lg pt-0"
>
	<!-- Sidebar -->
	<div class="flex h-full flex-col justify-between border-r bg-gray-50/50 dark:bg-gray-900/50">
		<div>
			<Sidebar.Header class="p-8">
				<a href="#" class="flex items-center gap-2.5">
					<div
						class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
					>
						<GalleryVerticalEndIcon class="size-4" />
					</div>
					<h1 class="text-xl font-bold text-foreground/90 font-['Poppins'] tracking-tight">
						<span class="font-semibold text-primary">smart</span><span class="font-light"
							>-sched</span
						>
					</h1>
				</a>
			</Sidebar.Header>
			<Sidebar.Content class="p-4">
				<Sidebar.Group>
					<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
					<Sidebar.Menu>
						<Sidebar.MenuItem>
							<Sidebar.MenuButton href="#" isActive={true}>
								<LayoutDashboard />
								<span>Dashboard</span>
							</Sidebar.MenuButton>
						</Sidebar.MenuItem>

						{#each navItems as item}
							{@const IconComponent = icons[item.icon as keyof typeof icons] || icons['HelpCircle']}
							<Collapsible.Root class="group/collapsible">
								<Sidebar.MenuItem>
									<Collapsible.Trigger class="w-full">
										<Sidebar.MenuButton>
											<svelte:component this={IconComponent} />
											<span>{item.title}</span>
											<ChevronRightIcon class="ml-auto" />
										</Sidebar.MenuButton>
									</Collapsible.Trigger>
									<Collapsible.Content>
										<Sidebar.MenuSub>
											{#each item.items as subItem}
												<Sidebar.MenuSubItem>
													<Sidebar.MenuSubButton href={subItem.url}>
														<span>{subItem.title}</span>
													</Sidebar.MenuSubButton>
												</Sidebar.MenuSubItem>
											{/each}
										</Sidebar.MenuSub>
									</Collapsible.Content>
								</Sidebar.MenuItem>
							</Collapsible.Root>
						{/each}
					</Sidebar.Menu>
				</Sidebar.Group>
			</Sidebar.Content>
		</div>
		<Sidebar.Footer class="p-4">
			<Sidebar.Menu>
				<Sidebar.MenuItem>
					<DropdownMenu.Root>
						<DropdownMenu.Trigger>
							<Sidebar.MenuButton size="lg">
								<Avatar.Root class="size-8 rounded-lg">
									<Avatar.Fallback class="rounded-lg bg-primary text-primary-foreground">
										{nameInitial}
									</Avatar.Fallback>
								</Avatar.Root>
								<div class="grid flex-1 text-left text-sm leading-tight">
									<span class="truncate font-medium">{user.username}</span>
									<span class="text-muted-foreground truncate text-xs">{user.role}</span>
								</div>
								<ChevronsUpDownIcon class="ml-auto size-4" />
							</Sidebar.MenuButton>
						</DropdownMenu.Trigger>
					</DropdownMenu.Root>
				</Sidebar.MenuItem>
			</Sidebar.Menu>
		</Sidebar.Footer>
	</div>

	<!-- Main Content -->
	<div class="flex flex-col">
		<header class="flex shrink-0 items-center gap-2 border-b px-4" style="height: 57px;">
			<Sidebar.Trigger class="-ml-1" />
			<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
			<h1 class="font-bold">Dashboard</h1>
		</header>
		<div class="flex-1 space-y-8 p-8 overflow-y-auto">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<div>
					<h1 class="text-3xl font-bold tracking-tight">Welcome back, {user.username}!</h1>
					<p class="text-muted-foreground">
						Here's a quick look at what's happening university-wide.
					</p>
				</div>
				<div class="flex flex-col items-center gap-4">
					<Select.Root type="single" value={selectedSemester}>
						<Select.Trigger class="w-[180px]">
							<span>{selectedSemester}</span>
						</Select.Trigger>
						<Select.Content>
							{#each semesters as sem}
								<Select.Item value={sem}>{sem}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					<Select.Root type="single" value={selectedAcademicYear}>
						<Select.Trigger class="w-[180px]">
							<span>{selectedAcademicYear}</span>
						</Select.Trigger>
						<Select.Content>
							{#each academicYears as year}
								<Select.Item value={year}>{year}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
			</div>

			<div class="grid grid-cols-12 gap-6">
				<Card.Root class="col-span-12">
					<Card.Header>
						<Card.Title>At a Glance</Card.Title>
						<Card.Description>Your key resource metrics for the selected term.</Card.Description>
						<Card.Action>
							<Badge variant="outline" class="mt-1 text-xs text-muted-foreground"
								>University-wide</Badge
							>
						</Card.Action>
					</Card.Header>
					<Card.Content class="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
						<Card.Root>
							<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
								<!-- <Card.Title class="text-sm font-medium">Total 1</Card.Title> -->
								<Users class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content>
								<div class="text-2xl font-bold">{stats.instructorCount}</div>
							</Card.Content>
						</Card.Root>
						<Card.Root>
							<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
								<!-- <Card.Title class="text-sm font-medium">Total 2</Card.Title> -->
								<Building class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content>
								<div class="text-2xl font-bold">{stats.roomCount}</div>
							</Card.Content>
						</Card.Root>
						<Card.Root>
							<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
								<!-- <Card.Title class="text-sm font-medium">Total 3</Card.Title> -->
								<BookCopy class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content>
								<div class="text-2xl font-bold">{stats.subjectCount}</div>
							</Card.Content>
						</Card.Root>
						<Card.Root>
							<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
								<!-- <Card.Title class="text-sm font-medium">Total 4</Card.Title> -->
								<GraduationCap class="h-4 w-4 text-muted-foreground" />
							</Card.Header>
							<Card.Content>
								<div class="text-2xl font-bold">{stats.programCount}</div>
							</Card.Content>
						</Card.Root>
					</Card.Content>
				</Card.Root>

				<Card.Root class="col-span-12 lg:col-span-8">
					<Card.Header>
						<Card.Title>Instructor Workload</Card.Title>
						<Card.Description>
							A look at the teaching load distribution for {selectedSemester}
							{selectedAcademicYear}.
						</Card.Description>
					</Card.Header>
					<Card.Content class="pl-2">
						<ChartBarDefault data={workloadData} />
					</Card.Content>
				</Card.Root>

				<Card.Root class="col-span-12 lg:col-span-4">
					<Card.Header>
						<Card.Title>Class Assignment Status</Card.Title>
						<Card.Description
							>A snapshot of assigned vs. unassigned classes for the term.</Card.Description
						>
					</Card.Header>
					<Card.Content>
						<PieChartInteractive data={scheduleStatusData} />
					</Card.Content>
				</Card.Root>

				<div class="col-span-12">
					<Card.Root>
						<Card.Header>
							<Card.Title>Action Items: Assign Instructors</Card.Title>
							<Card.Description
								>The following classes are offered but still need an instructor.</Card.Description
							>
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
	</div>
</Card.Root>

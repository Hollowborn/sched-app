<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { toggleMode } from 'mode-watcher';
	import Switch from '$lib/components/ui/switch/switch.svelte';
	import {
		CalendarClock,
		GraduationCap,
		Building2,
		Workflow,
		Users,
		ShieldCheck,
		Database,
		Laptop,
		Rocket,
		Lightbulb,
		CheckCircle2,
		Clock,
		Blocks,
		Waypoints,
		SunMoon,
		ChevronDown,
		Sparkle
	} from 'lucide-svelte';
	import Label from '$lib/components/ui/label/label.svelte';

	let y = $state(0); // Scroll position
	let scrolled = $state(false);
	$effect(() => {
		scrolled = y > 50; // Adjust 50px threshold as needed
	});
	// Placeholder images
	// You would replace these with actual assets.
	const heroImage = 'https://picsum.photos/seed/schedule_hero/1600/900';
	const problemSolutionImage = 'https://picsum.photos/seed/schedule_problem/800/600';
	const featuresImage1 = 'https://picsum.photos/seed/schedule_feature1/400/300';
	const featuresImage2 = 'https://picsum.photos/seed/schedule_feature2/400/300';
	const featuresImage3 = 'https://picsum.photos/seed/schedule_feature3/400/300';
	const processImage = 'https://picsum.photos/seed/schedule_process/800/600';
</script>

<div class="relative min-h-screen flex flex-col">
	<!-- Sticky Navbar for Landing Page -->
	<nav
		class="fixed w-full z-40 transition-all duration-300 {scrolled
			? 'py-2 backdrop-blur-md bg-background/70'
			: 'py-4 bg-transparent'}"
	>
		<div
			class="relative mx-auto flex items-center justify-between px-4 transition-all duration-300 md:max-w-[75%] lg:max-w-[65%] {scrolled
				? 'rounded-full px-6 py-2'
				: 'rounded-2xl px-4 py-3'}"
			style="background-color: {scrolled ? 'hsl(var(--background) / 0.7)' : 'transparent'};"
		>
			<!-- Logo/Site Title --><a
				href="/"
				class="flex items-center space-x-2 text-lg font-bold text-foreground"
			>
				<!-- <img src="/logo.svg" alt="smart-sched Logo" class="h-8 w-8" /> -->
				<div class="text-2xl">
					<span class="font-semibold text-primary">smart</span><span class="font-light">-sched</span
					>
				</div>
			</a>

			<!-- Navigation Links -->
			<div class="flex items-center space-x-6">
				<a href="#features" class="text-sm font-medium hover:text-primary transition-colors"
					>Features</a
				>
				<a href="#how-it-works" class="text-sm font-medium hover:text-primary transition-colors"
					>How it Works</a
				>
				<a href="/login" class="text-sm font-medium">
					<Button size="sm">Login</Button>
				</a>
			</div>
		</div>
	</nav>

	<!-- Main content slot -->
	<main class="flex-1">
		<section
			class="relative w-full h-[70vh] md:h-[80vh] flex items-center justify-center overflow-hidden bg-gradient-to-br from-primary/10 to-background"
		>
			<div class="relative z-10 text-center max-w-4xl px-4 space-y-6">
				<h1
					class="text-4xl sm:text-5xl md:text-6xl lg:text-7xl font-extrabold tracking-tight leading-tight text-foreground drop-shadow-lg"
				>
					Effortless Academic Timetables.<br /><span class="text-primary">smart</span>-sched Your
					Campus.
				</h1>
				<p class="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto">
					Streamlining course, instructor, and room allocations for your university, reducing
					conflicts and administrative burden.
				</p>
				<a href="/login">
					<Button
						size="lg"
						class="px-8 py-3 text-lg mt-6 shadow-lg hover:shadow-xl transition-shadow animate-pulse "
						>Login to <div><span class="font-semibold">smart</span>-sched</div>
						<Rocket class="ml-2 h-5 w-5" /></Button
					>
				</a>
			</div>
		</section>

		<!-- Problem & Solution Section -->
		<section class="py-16 md:py-24 bg-background" id="problem-solution">
			<div class="container mx-auto px-4 max-w-6xl">
				<div class="grid md:grid-cols-2 gap-12 items-center">
					<div class="space-y-6">
						<Badge variant="outline" class="text-primary border-primary">The Challenge</Badge>
						<h2 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground">
							Tired of Manual Scheduling Headaches?
						</h2>
						<p class="text-lg text-muted-foreground">
							Creating academic timetables by hand is a complex, error-prone, and time-consuming
							process. Double-bookings, instructor overload, and inefficient room utilization are
							common frustrations. It drains valuable administrative resources and impacts student
							and faculty experience.
						</p>
						<ul class="space-y-3 text-muted-foreground">
							<li class="flex items-center gap-2">
								<Lightbulb class="h-5 w-5 text-destructive" /> Constant conflicts & errors
							</li>
							<li class="flex items-center gap-2">
								<Clock class="h-5 w-5 text-destructive" /> Weeks of manual effort
							</li>
							<li class="flex items-center gap-2">
								<Blocks class="h-5 w-5 text-destructive" /> Sub-optimal resource usage
							</li>
						</ul>
					</div>
					<div class="relative">
						<img
							src={problemSolutionImage}
							alt="Manual scheduling chaos vs. organized digital schedule"
							class="rounded-lg shadow-xl"
						/>
						<div
							class="absolute -bottom-4 -left-4 bg-primary/20 p-4 rounded-lg backdrop-blur-sm text-foreground text-sm font-semibold italic"
						>
							Before <span class="text-primary">smart</span>-sched...
						</div>
					</div>
				</div>
			</div>
		</section>

		<!-- Key Features Section -->
		<section class="py-16 md:py-24 bg-muted/40" id="features">
			<div class="container mx-auto px-4 max-w-6xl text-center">
				<Badge variant="outline" class="text-primary border-primary mb-3">Core Capabilities</Badge>
				<h2 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
					Intelligent Features for Seamless Scheduling
				</h2>

				<div class="grid sm:grid-cols-2 lg:grid-cols-3 gap-8">
					<Card.Root
						class="text-left p-6 space-y-4 hover:shadow-md hover:scale-105 transition duration-300"
					>
						<div class="flex items-center gap-3">
							<ShieldCheck class="h-8 w-8 text-primary" />
							<h3 class="text-xl font-semibold text-foreground">Role-Based Access</h3>
						</div>
						<p class="text-muted-foreground">
							Secure access for Admins, Deans, and Registrars with tailored permissions ensuring
							data integrity and control.
						</p>
						<!-- <img src={featuresImage1} alt="Role-based access" class="rounded-md mt-4" /> --></Card.Root
					>

					<Card.Root
						class="text-left p-6 space-y-4 hover:shadow-md hover:scale-105 transition duration-300"
					>
						<div class="flex items-center gap-3">
							<Database class="h-8 w-8 text-primary" />
							<h3 class="text-xl font-semibold text-foreground">Centralized Resources</h3>
						</div>
						<p class="text-muted-foreground">
							Manage subjects, instructors, rooms, programs, and blocks effortlessly in one unified
							system.
						</p>
						<!-- <img src={featuresImage2} alt="Resource management" class="rounded-md mt-4" /> --></Card.Root
					>

					<Card.Root
						class="text-left p-6 space-y-4 hover:shadow-md hover:scale-105 transition duration-300"
					>
						<div class="flex items-center gap-3">
							<Workflow class="h-8 w-8 text-primary" />
							<h3 class="text-xl font-semibold text-foreground">Academic Planning</h3>
						</div>
						<p class="text-muted-foreground">
							Define class offerings and assign instructors with real-time workload tracking for
							optimal distribution.
						</p>
						<!-- <img src={featuresImage3} alt="Academic planning" class="rounded-md mt-4" /> --></Card.Root
					>

					<Card.Root
						class="text-left p-6 space-y-4 hover:shadow-md hover:scale-105 transition duration-300"
					>
						<div class="flex items-center gap-3">
							<Laptop class="h-8 w-8 text-primary" />
							<h3 class="text-xl font-semibold text-foreground">Intuitive Scheduler</h3>
						</div>
						<p class="text-muted-foreground">
							Drag-and-drop interface with instant conflict detection for rooms, instructors, and
							blocks.
						</p>
						<!-- <img src={featuresImage3} alt="Academic planning" class="rounded-md mt-4" /> --></Card.Root
					>

					<Card.Root
						class="text-left p-6 space-y-4 hover:shadow-md hover:scale-105 transition duration-300"
					>
						<div class="flex items-center gap-3">
							<Users class="h-8 w-8 text-primary" />
							<h3 class="text-xl font-semibold text-foreground">User Management</h3>
						</div>
						<p class="text-muted-foreground">
							Admin console for managing user accounts, roles, and access with ease.
						</p>
						<!-- <img src={featuresImage3} alt="Academic planning" class="rounded-md mt-4" /> --></Card.Root
					>

					<Card.Root
						class="text-left p-6 space-y-4 hover:shadow-md hover:scale-105 transition duration-300"
					>
						<div class="flex items-center gap-3">
							<CheckCircle2 class="h-8 w-8 text-primary" />
							<h3 class="text-xl font-semibold text-foreground">Conflict-Free Output</h3>
						</div>
						<p class="text-muted-foreground">
							Generate and publish error-free timetables, minimizing manual revisions and stress.
						</p>
						<!-- <img src={featuresImage3} alt="Academic planning" class="rounded-md mt-4" /> --></Card.Root
					>
				</div>
			</div>
		</section>

		<!-- How It Works Section -->
		<section class="py-16 md:py-24 bg-background" id="how-it-works">
			<div class="container mx-auto px-4 max-w-6xl text-center">
				<Badge variant="outline" class="text-primary border-primary mb-3">Our Process</Badge>
				<h2 class="text-3xl md:text-4xl font-bold tracking-tight text-foreground mb-12">
					Simple Steps to a Smarter Timetable
				</h2>
				<div class="flex-col gap-8 items-start">
					<div class="space-y-4 text-center">
						<div
							class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary text-2xl font-bold"
						>
							1
						</div>
						<h3 class="text-xl font-semibold text-foreground">Configure Resources</h3>
						<p class="text-muted-foreground">
							Admins and Deans input and manage all university resources: subjects, instructors,
							rooms, programs, and blocks.
						</p>
					</div>
					<div class="flex justify-center items-center my-4 md:my-0">
						<!-- <Waypoints class="h-10 w-10 text-muted-foreground rotate-90 md:rotate-0" /> -->
					</div>
					<div class="space-y-4 text-center">
						<div
							class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary text-2xl font-bold"
						>
							2
						</div>
						<h3 class="text-xl font-semibold text-foreground">Plan Academic Offerings</h3>
						<p class="text-muted-foreground">
							Registrars define class instances for each term, assigning subjects to blocks and
							instructors.
						</p>
					</div>
					<div class="flex justify-center items-center my-4 md:my-0 md:col-span-1 md:col-start-2">
						<!-- <Waypoints class="h-10 w-10 text-muted-foreground rotate-90 md:rotate-180" /> -->
					</div>
					<div class="space-y-4 text-center md:col-start-3">
						<div
							class="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto text-primary text-2xl font-bold"
						>
							3
						</div>
						<h3 class="text-xl font-semibold text-foreground">Generate & Publish</h3>
						<p class="text-muted-foreground">
							Use the intuitive scheduler to allocate classes to time slots and rooms, then publish
							the final timetable.
						</p>
					</div>
				</div>
				<!-- <img
					src={processImage}
					alt="Scheduling process flow"
					class="mt-12 rounded-lg shadow-xl hidden md:block"
				/> -->
			</div>
		</section>

		<!-- Final Call to Action -->
		<section class="bg-primary py-16 md:py-20 text-center text-primary-foreground">
			<div class="container mx-auto px-4 max-w-4xl space-y-6">
				<h2 class="text-3xl md:text-4xl font-bold tracking-tight">
					Ready to Modernize Your Scheduling?
				</h2>
				<p class="text-lg md:text-xl opacity-90">
					Join your university in embracing a smarter, more efficient way to manage academic
					timetables.
				</p>
				<a href="/login">
					<Button
						size="lg"
						variant="secondary"
						class="px-8 py-3 text-lg mt-6 shadow-lg hover:shadow-xl transition-shadow"
						>Access smart-sched Now <Rocket class="ml-2 h-5 w-5" /></Button
					>
				</a>
			</div>
		</section>

		<!-- Footer -->
		<footer class="bg-card text-card-foreground py-8 border-t">
			<div
				class="container mx-auto px-4 text-center text-sm md:flex md:justify-between md:items-center"
			>
				<p>
					&copy; {new Date().getFullYear()}<span class="font-semibold text-primary">
						&nbsp; smart</span
					><span class="font-light">-sched</span>. All rights reserved.
				</p>
				<div class="mt-4 md:mt-0 space-x-4">
					<!-- Bottom Right Features (commented due to redundancy) -->
					<!-- <a href="#features" class="hover:text-primary transition-colors">Features</a>
					<a href="#how-it-works" class="hover:text-primary transition-colors">How it Works</a>
					<a href="/login" class="hover:text-primary transition-colors">Login</a> -->
					<div class="inline-flex items-center space-x-2">
						<Label for="themeSwitcher"><SunMoon />Change theme</Label>
						<Switch id="themeSwitcher" onclick={toggleMode} class="animate-in" />
					</div>
				</div>
			</div>
		</footer>
	</main>
</div>
{#if scrolled}
	<div class="fixed bottom-8 right-8 z-50 animate-bounce">
		<button
			class="button bg-primary/80 hover:bg-primary"
			on:click={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
		>
			<svg class="svgIcon" viewBox="0 0 384 512">
				<path
					d="M214.6 41.4c-12.5-12.5-32.8-12.5-45.3 0l-160 160c-12.5 12.5-12.5 32.8 0 45.3s32.8 12.5 45.3 0L160 141.2V448c0 17.7 14.3 32 32 32s32-14.3 32-32V141.2L329.4 246.6c12.5 12.5 32.8 12.5 45.3 0s12.5-32.8 0-45.3l-160-160z"
				></path>
			</svg>
		</button>
	</div>
{/if}

<svelte:window bind:scrollY={y} />

<!-- Hero Section -->

<style>
	.button {
		width: 50px;
		height: 50px;
		border-radius: 50%;
		/* background-color: rgb(20, 20, 20); */
		border: none;
		font-weight: 600;
		display: flex;
		align-items: center;
		justify-content: center;
		box-shadow: 0px 0px 0px 4px rgba(180, 160, 255, 0.253);
		cursor: pointer;
		transition-duration: 0.3s;
		overflow: hidden;
		position: relative;
	}

	.svgIcon {
		width: 12px;
		transition-duration: 0.3s;
	}

	.svgIcon path {
		fill: white;
	}

	.button:hover {
		width: 140px;
		border-radius: 50px;
		transition-duration: 0.3s;

		align-items: center;
	}

	.button:hover .svgIcon {
		/* width: 20px; */
		transition-duration: 0.3s;
		transform: translateY(-200%);
	}

	.button::before {
		position: absolute;
		bottom: -20px;
		content: 'Back to Top';
		color: white;
		/* transition-duration: .3s; */
		font-size: 0px;
	}

	.button:hover::before {
		font-size: 13px;
		opacity: 1;
		bottom: unset;
		/* transform: translateY(-30px); */
		transition-duration: 0.3s;
	}
</style>

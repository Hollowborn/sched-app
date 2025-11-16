<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import type { NavItem } from '../../nav';
	import { page } from '$app/stores';
	import Separator from './ui/separator/separator.svelte';
	import logoUrl from '$lib/assets/logo.png';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';

	let {
		user,
		navItems, // *** THE FIX IS HERE: This is now correctly typed as NavItem[] ***
		ref = $bindable(null),
		collapsible = 'icon',
		...restProps
	} = $props<
		{
			user: { username: string; role: string; email?: string } | null;
			navItems: NavItem[];
		} & ComponentProps<typeof Sidebar.Root>
	>();
</script>

<Sidebar.Root {collapsible} {...restProps}>
	<Sidebar.Header class="">
		<div class="mt-2"></div>
		<a
			href="/menu/dashboard"
			class="flex items-center gap-2.5 transition-transform duration-200 hover:scale-101"
		>
			<!-- Custom SVG Icon for smart-sched -->
			<!-- <div
				class="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary dark:bg-primary/20"
			>
				<svg
					xmlns="http://www.w3.org/2000/svg"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2.5"
					stroke-linecap="round"
					stroke-linejoin="round"
					class="h-5 w-5"
				>
					<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
					<line x1="16" x2="16" y1="2" y2="6" />
					<line x1="8" x2="8" y1="2" y2="6" />
					<line x1="3" x2="21" y1="10" y2="10" />
					<path d="m9 16 2 2 4-4" />
				</svg>
			</div> -->
			<div
				class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
			>
				<GalleryVerticalEndIcon class="size-4" />
			</div>
			<!-- Styled App Name -->
			<h1
				class="text-xl font-bold text-foreground/90 transition-opacity duration-200 group-data-[collapsible=icon]:hidden font-['Poppins'] tracking-tight"
			>
				<span class="font-semibold text-primary">smart</span><span class="font-light">-sched</span>
			</h1>
		</a>
	</Sidebar.Header>

	<Sidebar.Content class="">
		<!-- Pass the dynamic navItems to the main navigation component -->
		<NavMain items={navItems} currentPath={$page.url.pathname} />
	</Sidebar.Content>

	<Sidebar.Footer class="">
		<!-- Pass the dynamic user object to the user navigation -->
		{#if user}
			<NavUser {user} />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

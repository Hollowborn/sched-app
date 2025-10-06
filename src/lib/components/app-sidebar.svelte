<script lang="ts">
	import NavMain from './nav-main.svelte';
	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import type { NavItem } from '../../nav';
	import { page } from '$app/stores';
	import Separator from './ui/separator/separator.svelte';

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
	<Sidebar.Header class="p-4">
		<a href="/menu" class="flex items-center gap-2">
			<svg
				xmlns="http://www.w3.org/2000/svg"
				viewBox="0 0 24 24"
				fill="none"
				stroke="currentColor"
				stroke-width="2"
				stroke-linecap="round"
				stroke-linejoin="round"
				class="h-8 w-8 text-primary"
			>
				<rect width="18" height="18" x="3" y="4" rx="2" ry="2" />
				<line x1="16" x2="16" y1="2" y2="6" />
				<line x1="8" x2="8" y1="2" y2="6" />
				<line x1="3" x2="21" y1="10" y2="10" />
			</svg>
			<h1 class="text-xl font-bold text-primary group-data-[collapsible=icon]:hidden">
				SmartSched
			</h1>
		</a>
		<Separator class="mt-2" />
	</Sidebar.Header>

	<Sidebar.Content class="p-2">
		<!-- Pass the dynamic navItems to the main navigation component -->
		<NavMain items={navItems} currentPath={$page.url.pathname} />
	</Sidebar.Content>

	<Sidebar.Footer class="p-2">
		<!-- Pass the dynamic user object to the user navigation -->
		{#if user}
			<NavUser {user} />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

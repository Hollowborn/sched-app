<script lang="ts">
	import NavMain from './nav-main.svelte';

	import NavUser from './nav-user.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import type { NavItem } from '../../nav';
	import { page } from '$app/stores';
	import logoUrl from '$lib/assets/logo.png';
	import { GalleryVerticalEndIcon } from '@lucide/svelte';

	let {
		user,
		navItems,
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
			<div
				class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
			>
				<GalleryVerticalEndIcon class="size-4" />
			</div>
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

	<Sidebar.Footer class="p-2">
		{#if user}
			<NavUser {user} />
		{/if}
	</Sidebar.Footer>
	<Sidebar.Rail />
</Sidebar.Root>

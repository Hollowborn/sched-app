<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';

	let { data, children, ...restProps } = $props<
		{ data: any } & ComponentProps<typeof Sidebar.Root>
	>();
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
	{...restProps}
>
	<!-- Pass all required data to the sidebar -->
	<AppSidebar user={data.profile} navItems={data.navItems} collapsible="icon" />
	<!-- supabase={data.supabase} -->
	<Sidebar.Inset>
		<SiteHeader />

		<div class="flex flex-1 flex-col">
			<div class="@container/main flex flex-1 flex-col gap-2">
				<main class="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 md:px-10">
					{@render children?.()}
				</main>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

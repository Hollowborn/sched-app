<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte'; // Import the new AppSidebar component
	import SiteHeader from '$lib/components/site-header.svelte'; // Assuming your SiteHeader is here
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';

	// This 'data' prop contains what was returned from +layout.server.ts
	let { data, children, ...restProps } = $props<
		{ data: any } & ComponentProps<typeof Sidebar.Root>
	>();
</script>

<Sidebar.Provider
	style="--sidebar-width: calc(var(--spacing) * 72); --header-height: calc(var(--spacing) * 12);"
	{...restProps}
>
	<!-- <AppSidebar user={data.user} navItems={data.navItems} /> -->
	<AppSidebar />
	<Sidebar.Inset>
		<SiteHeader />

		<div class="flex flex-1 flex-col">
			<div class="@container/main flex flex-1 flex-col gap-2">
				<div
					class="flex flex-col gap-4 py-4 md:gap-6 md:py-6 mx-10 transition-opacity duration-300 ease-out opacity-85 hover:opacity-100"
				>
					{@render children?.()}
					<div class="px-4 lg:px-6"></div>
				</div>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

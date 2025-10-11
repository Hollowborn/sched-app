<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { navigating } from '$app/stores';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
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
					{#if $navigating}
						<div
							class="absolute inset-0 z-50 flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm"
						>
							<Empty.Root>
								<Empty.Header>
									<Empty.Media variant="icon">
										<Spinner class="h-10 w-10" />
									</Empty.Media>
									<Empty.Title>Processing your request</Empty.Title>
									<Empty.Description>
										Please wait while we process your request. Do not refresh the page.
									</Empty.Description>
								</Empty.Header>
							</Empty.Root>
						</div>
					{:else}
						{@render children?.()}
					{/if}
				</main>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

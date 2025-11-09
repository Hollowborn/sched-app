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
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import { page } from '$app/stores';
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
						<!-- Spinner Loading Page while Navigating -->
						<!-- <div
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
						</div> -->

						<!-- (New) Skeleton loading page -->

						<div class="space-y-6">
							<header>
								<div class="md:hidden">
									<Skeleton class="h-8 w-3/4 rounded-md" />
								</div>
								<div class="hidden md:block">
									<Skeleton class="h-8 w-72 rounded-md" />
									<Skeleton class="mt-2 h-4 w-[450px] rounded-md" />
								</div>
							</header>

							<Card.Root>
								<Card.Content class="m-2">
									<div class="space-y-4 md:hidden">
										<Skeleton class="h-10 w-full rounded-md" />
										<Skeleton class="h-10 w-full rounded-md" />
									</div>

									<div class="hidden md:flex md:flex-row md:items-center md:justify-between gap-4">
										<div class="flex flex-1 items-center gap-4">
											<!-- <Skeleton class="h-10 w-[150px] rounded-md" />
											<Skeleton class="h-10 w-[150px] rounded-md" /> -->
											<Skeleton class="h-10 max-w-sm flex-1 rounded-md" />
										</div>
										<Skeleton class="h-10 w-[240px] rounded-md" />
									</div>
								</Card.Content>
							</Card.Root>

							<div class="border rounded-md">
								<div class="divide-y md:hidden">
									{#each Array(5) as _}
										<div class="p-4 space-y-3">
											<Skeleton class="h-4 w-3/4 rounded-md" />
											<Skeleton class="h-4 w-1/2 rounded-md" />
											<Skeleton class="h-10 w-full rounded-md" />
										</div>
									{/each}
								</div>

								<div class="hidden md:block">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head><Skeleton class="h-4 w-48 rounded-md" /></Table.Head>
												<Table.Head><Skeleton class="h-4 w-48 rounded-md" /></Table.Head>
												<Table.Head class="w-[40%]"
													><Skeleton class="h-4 w-48 rounded-md" /></Table.Head
												>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each Array(8) as _}
												<Table.Row class="hover:bg-transparent">
													<Table.Cell>
														<Skeleton class="h-4 w-24 rounded-md mb-2" />
														<Skeleton class="h-4 w-48 rounded-md" />
													</Table.Cell>
													<Table.Cell>
														<Skeleton class="h-4 w-32 rounded-md" />
													</Table.Cell>
													<Table.Cell>
														<Skeleton class="h-10 w-full rounded-md" />
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>
							</div>

							<!-- <div class="flex justify-center">
								<Skeleton class="h-4 w-80 rounded-md" />
							</div> -->
						</div>
					{:else}
						{@render children?.()}
					{/if}
				</main>
			</div>
		</div>
	</Sidebar.Inset>
</Sidebar.Provider>

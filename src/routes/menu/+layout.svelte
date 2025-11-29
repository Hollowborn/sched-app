<script lang="ts">
	import AppSidebar from '$lib/components/app-sidebar.svelte';
	import SiteHeader from '$lib/components/site-header.svelte';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import type { ComponentProps } from 'svelte';
	import { navigating, page } from '$app/stores';
	import Skeleton from '$lib/components/ui/skeleton/skeleton.svelte';
	import * as Empty from '$lib/components/ui/empty/index.js';
	import { Spinner } from '$lib/components/ui/spinner/index.js';
	import * as Table from '$lib/components/ui/table';
	import * as Card from '$lib/components/ui/card';
	import SearchCommand from '$lib/components/search-command.svelte';

	// --- Settings Modal Imports ---
	import { settingsModalOpen } from '$lib/stores/modalStore.js';
	import { enhance } from '$app/forms';
	import { invalidateAll } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as Tabs from '$lib/components/ui/tabs/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { User, Lock, Info, LoaderCircle } from '@lucide/svelte';
	// -------------------------------

	let { data, children, fab, ...restProps } = $props<
		{ data: any } & ComponentProps<typeof Sidebar.Root>
	>();

	// --- Settings Modal State ---
	let isSubmitting = $state(false);
	let formUsername = $state(data.profile?.username || '');

	// Reset form state when modal opens
	$effect(() => {
		if ($settingsModalOpen) {
			formUsername = data.profile?.username || '';
		}
	});

	// NOTE: To open this modal from your `nav-user.svelte` component,
	// import the store:
	// import { settingsModalOpen } from '$lib/stores/modalStore.js';
	//
	// Then, in your "Settings" DropdownMenu.Item, add:
	// onclick={() => settingsModalOpen.set(true)}
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
			<div class="flex flex-1 flex-col gap-2">
				<main class="flex flex-col gap-4 py-4 md:gap-6 md:py-6 px-4 md:px-10">
					{#if $navigating}
						<!-- ... your skeleton loading state ... -->
						<div class="space-y-6 page-enter page-enter-active">
							<header>
								<div class="md:hidden">
									<Skeleton class="h-8 w-3/4 rounded-md" />
								</div>
								<div class="hidden md:block">
									<Skeleton class="h-8 w-72 rounded-md" />
									<Skeleton class="mt-2 h-6 w-[450px] rounded-md" />
								</div>
							</header>

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

							<div class="md:hidden rounded-md">
								<div class="divide-y md:hidden">
									{#each Array(5) as _}
										<div class="p-4 space-y-3">
											<Skeleton class="h-6 w-3/4 rounded-md" />
											<Skeleton class="h-6 w-1/2 rounded-md" />
											<Skeleton class="h-10 w-full rounded-md" />
										</div>
									{/each}
								</div>
								<!-- Removed md:block on class -->
								<div class="hidden">
									<Table.Root>
										<Table.Header>
											<Table.Row>
												<Table.Head><Skeleton class="h-6 w-32 rounded-md" /></Table.Head>
												<Table.Head><Skeleton class="h-6 w-32 rounded-md" /></Table.Head>
												<Table.Head class="w-[40%]"
													><Skeleton class="h-6 w-full rounded-md" /></Table.Head
												>
											</Table.Row>
										</Table.Header>
										<Table.Body>
											{#each Array(8) as _}
												<Table.Row class="hover:bg-transparent">
													<Table.Cell>
														<Skeleton class="h-6 w-32 rounded-md" />
													</Table.Cell>
													<Table.Cell>
														<Skeleton class="h-6 w-32 rounded-md" />
													</Table.Cell>
													<Table.Cell>
														<Skeleton class="h-6 w-full rounded-md" />
													</Table.Cell>
												</Table.Row>
											{/each}
										</Table.Body>
									</Table.Root>
								</div>
							</div>
						</div>
					{:else}
						<div class="page-enter page-enter-active md:m-12">
							{@render children?.()}
						</div>
					{/if}
				</main>
			</div>
		</div>
	</Sidebar.Inset>

	<!-- === GLOBAL SETTINGS MODAL === -->
	<Dialog.Root bind:open={$settingsModalOpen}>
		<Dialog.Content class="sm:max-w-md">
			<Dialog.Header>
				<Dialog.Title>Settings</Dialog.Title>
				<Dialog.Description>Manage your account settings and preferences.</Dialog.Description>
			</Dialog.Header>

			<Tabs.Root value="profile" class="w-full">
				<Tabs.List class="grid w-full grid-cols-3">
					<Tabs.Trigger value="profile"><User class="mr-1.5 h-4 w-4" /> Profile</Tabs.Trigger>
					<Tabs.Trigger value="password"><Lock class="mr-1.5 h-4 w-4" /> Password</Tabs.Trigger>
					<Tabs.Trigger value="about"><Info class="mr-1.5 h-4 w-4" /> About</Tabs.Trigger>
				</Tabs.List>

				<!-- Profile Tab -->
				<Tabs.Content value="profile" class="pt-4">
					<form
						method="POST"
						action="/menu?/updateProfile"
						use:enhance={() => {
							isSubmitting = true;
							const toastId = toast.loading('Updating profile...');
							return async ({ update, result }) => {
								isSubmitting = false;
								if (result.type === 'success') {
									toast.success(result.data?.message, { id: toastId });
									await invalidateAll(); // Refreshes the user's name in the sidebar
								} else if (result.type === 'failure') {
									toast.error(result.data?.message, { id: toastId });
								}
								await update({ reset: false });
							};
						}}
					>
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="username">Username</Label>
								<Input id="username" name="username" bind:value={formUsername} required />
							</div>
							<div class="space-y-2">
								<Label for="email">Email</Label>
								<Input id="email" type="email" value={data.profile?.email} disabled />
								<p class="text-xs text-muted-foreground">Email address cannot be changed here.</p>
							</div>
						</div>
						<Dialog.Footer class="mt-6">
							<Button type="submit" disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Save Changes
							</Button>
						</Dialog.Footer>
					</form>
				</Tabs.Content>

				<!-- Password Tab -->
				<Tabs.Content value="password" class="pt-4">
					<form
						method="POST"
						action="/menu?/updatePassword"
						use:enhance={({ form }) => {
							isSubmitting = true;
							const toastId = toast.loading('Updating password...');
							return async ({ update, result }) => {
								isSubmitting = false;
								if (result.type === 'success') {
									toast.success(result.data?.message, { id: toastId });
									form.reset(); // Clear password fields
								} else if (result.type === 'failure') {
									toast.error(result.data?.message, { id: toastId });
								}
								await update({ reset: false });
							};
						}}
					>
						<div class="space-y-4">
							<div class="space-y-2">
								<Label for="new-password">New Password</Label>
								<Input id="new-password" name="newPassword" type="password" required />
							</div>
							<div class="space-y-2">
								<Label for="confirm-password">Confirm New Password</Label>
								<Input id="confirm-password" name="confirmPassword" type="password" required />
							</div>
						</div>
						<Dialog.Footer class="mt-6">
							<Button type="submit" disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
								{/if}
								Update Password
							</Button>
						</Dialog.Footer>
					</form>
				</Tabs.Content>

				<!-- About Tab -->
				<Tabs.Content value="about" class="pt-4">
					<div class="space-y-4 text-sm text-muted-foreground">
						<p>
							<strong>SmartSched v1.0.0 (Thesis Edition)</strong>
						</p>
						<p>
							This application is developed as a thesis project for Bohol Island State University -
							Calape Campus. It aims to provide an efficient, modern solution for academic timetable
							scheduling.
						</p>
						<p>&copy; {new Date().getFullYear()} Charles Ithan S. Amahan. All rights reserved.</p>
					</div>
					<Dialog.Footer class="mt-6">
						<Button variant="outline" onclick={() => ($settingsModalOpen = false)}>Close</Button>
					</Dialog.Footer>
				</Tabs.Content>
			</Tabs.Root>
		</Dialog.Content>
	</Dialog.Root>

	<SearchCommand />
</Sidebar.Provider>

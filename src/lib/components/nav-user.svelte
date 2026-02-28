<script lang="ts">
	import { goto } from '$app/navigation';

	// shadcn=svelte components
	import * as Avatar from '$lib/components/ui/avatar/index.js';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import { useSidebar } from '$lib/components/ui/sidebar/index.js';

	import {
		SunIcon,
		MoonIcon,
		Settings,
		LogOutIcon,
		ChevronsUpDownIcon,
		Info
	} from '@lucide/svelte';
	import { settingsModalOpen } from '$lib/stores/modalStore.js';

	import { toast } from 'svelte-sonner';
	import { toggleMode } from 'mode-watcher';
	import { page } from '$app/stores';

	// Receive the user object, which includes the email from the auth session
	let { user }: { user: { username: string; role: string; email?: string; college_id?: number } } =
		$props();
	const sidebar = useSidebar();

	// Get the supabase client from the page store, provided by the root +layout.ts
	const { supabase } = $page.data;

	async function handleSignOut() {
		const promise = supabase.auth.signOut();

		toast.promise(promise, {
			loading: 'Signing out...',
			success: () => {
				// Use goto with invalidateAll to force a layout reload
				goto('/login', { invalidateAll: true });
				return 'Signed out successfully.';
			},
			error: 'Sign out failed.'
		});
	}

	// Create a fallback initial from the username
	const nameInitial = user.username ? user.username.charAt(0).toUpperCase() : 'U';
</script>

<Sidebar.Menu>
	<Sidebar.MenuItem>
		<DropdownMenu.Root>
			<DropdownMenu.Trigger>
				{#snippet child({ props })}
					<Sidebar.MenuButton
						size="lg"
						class="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground"
						{...props}
					>
						<Avatar.Root class="size-8 rounded-lg">
							<!-- Fallback is now more robust -->
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
				{/snippet}
			</DropdownMenu.Trigger>
			<DropdownMenu.Content
				class="w-[--bits-dropdown-menu-anchor-width] min-w-56 rounded-lg"
				side={sidebar.isMobile ? 'bottom' : 'right'}
				align="end"
				sideOffset={4}
			>
				<DropdownMenu.Label class="p-0 font-normal">
					<div class="flex items-center gap-2 px-1 py-1.5 text-left text-sm">
						<Avatar.Root class="size-8 rounded-lg">
							<Avatar.Fallback class="rounded-lg bg-primary text-primary-foreground"
								>{nameInitial}</Avatar.Fallback
							>
						</Avatar.Root>
						<div class="grid flex-1 text-left text-sm leading-tight">
							<span class="truncate font-medium">{user.username}</span>
							<span class="text-muted-foreground truncate text-xs">{user.email || 'No email'}</span>
						</div>
					</div>
				</DropdownMenu.Label>
				<DropdownMenu.Separator />
				<DropdownMenu.Group>
					<DropdownMenu.Item onclick={toggleMode}>
						<SunIcon
							class="h-[1.2rem] w-[1.2rem] rotate-0 scale-100 transition-all dark:-rotate-90 dark:scale-0"
						/>
						<MoonIcon
							class="absolute h-[1.2rem] w-[1.2rem] rotate-90 scale-0 transition-all dark:rotate-0 dark:scale-100"
						/>
						Switch Theme
					</DropdownMenu.Item>
				</DropdownMenu.Group>

				<DropdownMenu.Group>
					<DropdownMenu.Item><Info />User Manual</DropdownMenu.Item>
					<DropdownMenu.Item
						onclick={() => {
							settingsModalOpen.set(true);
						}}
					>
						<Settings />
						Settings
					</DropdownMenu.Item>
				</DropdownMenu.Group>

				<DropdownMenu.Separator />
				<DropdownMenu.Item onclick={handleSignOut}>
					<LogOutIcon />
					Log out
				</DropdownMenu.Item>
			</DropdownMenu.Content>
		</DropdownMenu.Root>
	</Sidebar.MenuItem>
</Sidebar.Menu>

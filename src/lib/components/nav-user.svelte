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
		Info,
		Palette,
		Monitor
	} from '@lucide/svelte';
	import { settingsModalOpen } from '$lib/stores/modalStore.js';

	import { toast } from 'svelte-sonner';
	import { setMode, mode } from 'mode-watcher';
	import { page } from '$app/stores';

	// App Theme Store
	import { appTheme } from '$lib/stores/themeStore.js';

	import * as Dialog from '$lib/components/ui/dialog/index.js';
	import * as RadioGroup from '$lib/components/ui/radio-group/index.js';
	import { Label } from '$lib/components/ui/label/index.js';

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

	let appearanceOpen = $state(false);
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
					<DropdownMenu.Item onclick={() => (appearanceOpen = true)}>
						<Palette />
						Appearance
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

<!-- Appearance Dialog placed at the root level of the component to avoid z-index/portal issues from Dropdown -->
<Dialog.Root bind:open={appearanceOpen}>
	<Dialog.Content class="sm:max-w-[425px]">
		<Dialog.Header>
			<Dialog.Title>Appearance</Dialog.Title>
			<Dialog.Description>Customize the look and feel of the application.</Dialog.Description>
		</Dialog.Header>

		<div class="py-4 space-y-6">
			<!-- Theme Selection -->
			<div class="space-y-4">
				<h4 class="text-sm font-medium leading-none">Color Theme</h4>
				<RadioGroup.Root
					value={$appTheme}
					onValueChange={(v) => ($appTheme = v)}
					class="grid grid-cols-2 gap-4"
				>
					<div>
						<RadioGroup.Item value="default" id="theme-default" class="peer sr-only" />
						<Label
							for="theme-default"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
						>
							Default (Slate)
						</Label>
					</div>
					<div>
						<RadioGroup.Item value="modern-minimal" id="theme-oklch" class="peer sr-only" />
						<Label
							for="theme-oklch"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
						>
							Modern Minimal
						</Label>
					</div>
				</RadioGroup.Root>
			</div>

			<!-- Mode Selection -->
			<div class="space-y-4">
				<h4 class="text-sm font-medium leading-none">Mode</h4>
				<RadioGroup.Root
					value={mode.current || 'system'}
					onValueChange={(v) => setMode(v as 'light' | 'dark' | 'system')}
					class="grid grid-cols-3 gap-4"
				>
					<div>
						<RadioGroup.Item value="light" id="mode-light" class="peer sr-only" />
						<Label
							for="mode-light"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
						>
							<SunIcon class="mb-2 h-6 w-6" />
							Light
						</Label>
					</div>
					<div>
						<RadioGroup.Item value="dark" id="mode-dark" class="peer sr-only" />
						<Label
							for="mode-dark"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
						>
							<MoonIcon class="mb-2 h-6 w-6" />
							Dark
						</Label>
					</div>
					<div>
						<RadioGroup.Item value="system" id="mode-system" class="peer sr-only" />
						<Label
							for="mode-system"
							class="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-4 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
						>
							<Monitor class="mb-2 h-6 w-6" />
							System
						</Label>
					</div>
				</RadioGroup.Root>
			</div>
		</div>
	</Dialog.Content>
</Dialog.Root>

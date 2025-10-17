<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import {
		Users,
		ShieldCheck,
		UserCheck,
		UserCog,
		Search,
		PlusCircle,
		MoreHorizontal,
		LoaderCircle,
		KeyRound,
		Trash2,
		Pencil,
		ToggleLeft,
		ToggleRight
	} from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';

	type User = {
		id: string;
		email: string;
		username: string;
		role: string;
		college_id: number | null;
		last_sign_in_at: string;
		status: 'active' | 'disabled';
		colleges: { college_name: string } | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- Component State ---
	let searchQuery = $state('');
	let isSubmitting = $state(false);
	let selectedUser = $state<User | null>(null);

	// Modal States
	let createOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);

	// Form State
	let formUsername = $state('');
	let formEmail = $state('');
	let formPassword = $state('');
	let formRole = $state('');
	let formCollegeId = $state<string | undefined>('');

	const filteredUsers: User[] = $derived.by(() => {
		const users = data.users || [];
		if (!searchQuery) return users;
		const lowerQuery = searchQuery.toLowerCase();
		return users.filter(
			(u) =>
				u.username.toLowerCase().includes(lowerQuery) || u.email.toLowerCase().includes(lowerQuery)
		);
	});

	function openEditModal(user: User) {
		selectedUser = user;
		formUsername = user.username;
		formEmail = user.email;
		formRole = user.role;
		formCollegeId = user.college_id?.toString();
		editOpen = true;
	}

	function openDeleteModal(user: User) {
		selectedUser = user;
		deleteOpen = true;
	}

	function timeAgo(dateString: string) {
		if (!dateString) return 'Never';
		const date = new Date(dateString);
		const seconds = Math.floor((new Date().getTime() - date.getTime()) / 1000);
		let interval = seconds / 31536000;
		if (interval > 1) return Math.floor(interval) + ' years ago';
		interval = seconds / 2592000;
		if (interval > 1) return Math.floor(interval) + ' months ago';
		interval = seconds / 86400;
		if (interval > 1) return Math.floor(interval) + ' days ago';
		interval = seconds / 3600;
		if (interval > 1) return Math.floor(interval) + ' hours ago';
		interval = seconds / 60;
		if (interval > 1) return Math.floor(interval) + ' minutes ago';
		return 'Just now';
	}
</script>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">User Management</h1>
		<p class="text-muted-foreground mt-1">
			Create, manage, and secure user accounts and their roles.
		</p>
	</header>

	<!-- Stat Cards -->
	<div class="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Total Users</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.total}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Administrators</Card.Title>
				<ShieldCheck class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.admins}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Deans</Card.Title>
				<UserCheck class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.deans}</div>
			</Card.Content>
		</Card.Root>
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Registrars</Card.Title>
				<UserCog class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{data.stats.registrars}</div>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Controls and Table -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center justify-between">
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by username or email..."
						class="pl-10"
						bind:value={searchQuery}
					/>
				</div>
				<Button onclick={() => (createOpen = true)}>
					<PlusCircle class="mr-2 h-4 w-4" /> Add User
				</Button>
			</div>
		</Card.Header>
		<Card.Content>
			<div class="border rounded-md">
				<Table.Root>
					<Table.Header>
						<Table.Row>
							<Table.Head>User</Table.Head>
							<Table.Head>Role</Table.Head>
							<Table.Head>College</Table.Head>
							<Table.Head>Last Sign-in</Table.Head>
							<Table.Head>Status</Table.Head>
							<Table.Head class="text-right pr-4">Actions</Table.Head>
						</Table.Row>
					</Table.Header>
					<Table.Body>
						{#if filteredUsers.length > 0}
							{#each filteredUsers as user (user.id)}
								<Table.Row>
									<Table.Cell>
										<div class="font-medium">{user.username}</div>
										<div class="text-sm text-muted-foreground">{user.email}</div>
									</Table.Cell>
									<Table.Cell><Badge>{user.role}</Badge></Table.Cell>
									<Table.Cell>{user.colleges?.college_name || 'N/A'}</Table.Cell>
									<Table.Cell>{timeAgo(user.last_sign_in_at)}</Table.Cell>
									<Table.Cell>
										<Badge variant={user.status === 'active' ? 'default' : 'destructive'}
											>{user.status}</Badge
										>
									</Table.Cell>
									<Table.Cell class="text-right">
										<DropdownMenu.Root>
											<DropdownMenu.Trigger>
												<Button variant="ghost" size="icon">
													<MoreHorizontal class="h-4 w-4" />
												</Button>
											</DropdownMenu.Trigger>
											<DropdownMenu.Content>
												<DropdownMenu.Item onclick={() => openEditModal(user)}>
													<Pencil class="mr-2 h-4 w-4" /> Edit
												</DropdownMenu.Item>

												<DropdownMenu.Item>
													<form method="POST" action="?/updateUserStatus" use:enhance>
														<input type="hidden" name="id" value={user.id} />
														<input type="hidden" name="status" value={user.status} />
														<button type="submit" class="flex items-center w-full">
															{#if user.status === 'active'}
																<ToggleLeft class="mr-2 h-4 w-4" /> Disable
															{:else}
																<ToggleRight class="mr-2 h-4 w-4" /> Enable
															{/if}
														</button>
													</form>
												</DropdownMenu.Item>

												<DropdownMenu.Item>
													<form method="POST" action="?/sendPasswordReset" use:enhance>
														<input type="hidden" name="email" value={user.email} />
														<button type="submit" class="flex items-center w-full">
															<KeyRound class="mr-2 h-4 w-4" /> Send Reset
														</button>
													</form>
												</DropdownMenu.Item>

												<DropdownMenu.Separator />
												<DropdownMenu.Item
													class="text-destructive focus:text-destructive"
													onclick={() => openDeleteModal(user)}
												>
													<Trash2 class="mr-2 h-4 w-4" /> Delete
												</DropdownMenu.Item>
											</DropdownMenu.Content>
										</DropdownMenu.Root>
									</Table.Cell>
								</Table.Row>
							{/each}
						{:else}
							<Table.Row>
								<Table.Cell colspan={6} class="h-24 text-center">No users found.</Table.Cell>
							</Table.Row>
						{/if}
					</Table.Body>
				</Table.Root>
			</div>
		</Card.Content>
	</Card.Root>
</div>

<!-- Modals -->
<!-- ... (Create, Edit, Delete modals will go here, similar to other pages) ... -->

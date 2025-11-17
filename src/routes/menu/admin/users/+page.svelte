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
		ToggleRight,
		Circle,
		CircleCheck,
		CircleX
	} from '@lucide/svelte';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import * as Field from '$lib/components/ui/field';

	type User = {
		id: string;
		email: string;
		username: string;
		role: string;
		college_id: number | null;
		program_id: number | null;
		last_sign_in_at: string;
		status: 'active' | 'disabled';
		colleges: { college_name: string } | null;
		programs: { program_name: string } | null;
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
	let formProgramId = $state<string | undefined>('');

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
		formProgramId = user.program_id?.toString();
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

<svelte:head>
	<title>User Management | smart-sched</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">User Management</h1>
		<p class="text-muted-foreground mt-1">
			Create, manage, and secure user accounts and their roles.
		</p>
	</header>

	<div class="flex items-center justify-between">
		<div class="relative w-full max-w-sm">
			<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
			<Input placeholder="Search by username or email..." class="pl-10" bind:value={searchQuery} />
		</div>
		<Button onclick={() => (createOpen = true)}>
			<PlusCircle class="mr-2 h-4 w-4" /> Add User
		</Button>
	</div>

	<div class="border rounded-md">
		<Table.Root>
			<Table.Header class="bg-muted/50">
				<Table.Row>
					<Table.Head>User</Table.Head>
					<Table.Head>Role</Table.Head>
					<Table.Head>Assignment</Table.Head>
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
							<Table.Cell><Badge variant="outline">{user.role}</Badge></Table.Cell>
							<Table.Cell>
								{user.colleges?.college_name || user.programs?.program_name || 'N/A'}
							</Table.Cell>
							<Table.Cell>{timeAgo(user.last_sign_in_at)}</Table.Cell>
							<Table.Cell>
								{#if user.status === 'active'}
									<Badge variant="outline" class="text-green-500 border-green-500/50">
										<CircleCheck class="mr-1 h-3 w-3" />
										Active
									</Badge>
								{:else}
									<Badge variant="destructive" class="text-red-500 border-red-500/50 bg-red-500/10">
										<CircleX class="mr-1 h-3 w-3" />
										Disabled
									</Badge>
								{/if}
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

										<DropdownMenu.Item
											on:select={(e: CustomEvent) => e.preventDefault()}
											class="p-0 focus:bg-transparent focus:text-inherit"
										>
											<form
												method="POST"
												action="?/updateUserStatus"
												use:enhance={() => {
													const toastId = toast.loading('Updating status...');
													return async ({ update, result }) => {
														if (result.type === 'success') {
															toast.success(result.data?.message, { id: toastId });
															invalidateAll();
														} else if (result.type === 'failure') {
															toast.error(result.data?.message, { id: toastId });
														}
														await update({ reset: false });
													};
												}}
												class="w-full"
											>
												<input type="hidden" name="id" value={user.id} />
												<input type="hidden" name="status" value={user.status} />
												<button
													type="submit"
													class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
												>
													{#if user.status === 'active'}
														<ToggleLeft class="mr-4 h-4 w-4" /> Disable
													{:else}
														<ToggleRight class="mr-4 h-4 w-4" /> Enable
													{/if}
												</button>
											</form>
										</DropdownMenu.Item>

										<DropdownMenu.Item
											onselect={(e: CustomEvent) => e.preventDefault()}
											class="p-0 focus:bg-transparent focus:text-inherit"
										>
											<form
												method="POST"
												action="?/sendPasswordReset"
												use:enhance={() => {
													const toastId = toast.loading('Sending reset link...');
													return async ({ update, result }) => {
														if (result.type === 'success') {
															toast.success(result.data?.message, { id: toastId });
														} else if (result.type === 'failure') {
															toast.error(result.data?.message, { id: toastId });
														}
														await update({ reset: false });
													};
												}}
												class="w-full"
											>
												<input type="hidden" name="email" value={user.email} />
												<button
													type="submit"
													class="relative flex cursor-default select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none transition-colors focus:bg-accent focus:text-accent-foreground data-[disabled]:pointer-events-none data-[disabled]:opacity-50 w-full"
												>
													<KeyRound class="mr-4 h-4 w-4" /> Send Reset
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
</div>

<!-- Modals -->
<Dialog.Root bind:open={createOpen}>
	<Dialog.Content class="overflow-hidden">
		<Dialog.Header>
			<Dialog.Title>Create New User</Dialog.Title>
			<Dialog.Description>
				A temporary password will be set. The user should reset it upon first login.
			</Dialog.Description>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createUser"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating user...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						createOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<Field.Set class="py-4">
				<Field.Legend class="sr-only">Create User Form</Field.Legend>
				<Field.Group>
					<Field.Set>
						<Field.Label for="create-username">Username</Field.Label>
						<Input id="create-username" name="username" required />
					</Field.Set>
					<Field.Set>
						<Field.Label for="create-email">Email</Field.Label>
						<Input id="create-email" name="email" type="email" required />
					</Field.Set>
					<Field.Set>
						<Field.Label for="create-password">Temporary Password</Field.Label>
						<Input id="create-password" name="password" type="password" required />
					</Field.Set>
					<div class="grid grid-cols-2 gap-4">
						<Field.Set>
							<Field.Label>Role</Field.Label>
							<Select.Root type="single" name="role" bind:value={formRole}>
								<Select.Trigger><span class="">{formRole || 'Select a role'}</span></Select.Trigger>
								<Select.Content>
									{#each data.validRoles as role}
										<Select.Item value={role}>{role}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</Field.Set>
						{#if formRole === 'Dean'}
							<Field.Set>
								<Field.Label>College</Field.Label>
								<Select.Root type="single" name="college_id" bind:value={formCollegeId}>
									<Select.Trigger>
										<span class="truncate max-w-32">
											{data.colleges.find((c) => c.id.toString() === formCollegeId)?.college_name ||
												'Select College'}
										</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="">N/A</Select.Item>
										{#each data.colleges as college}
											<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item
											>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Set>
						{/if}
						{#if formRole === 'Chairperson'}
							<Field.Set>
								<Field.Label>Program</Field.Label>
								<Select.Root type="single" name="program_id" bind:value={formProgramId}>
									<Select.Trigger>
										<span class="truncate max-w-32">
											{data.programs.find((p) => p.id.toString() === formProgramId)?.program_name ||
												'Select Program'}
										</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="">N/A</Select.Item>
										{#each data.programs as program}
											<Select.Item value={program.id.toString()}>{program.program_name}</Select.Item
											>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Set>
						{/if}
					</div>
				</Field.Group>
			</Field.Set>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create User
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={editOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit User: {selectedUser?.username}</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateUser"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving changes...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						editOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={selectedUser?.id} />
			<Field.Set class="py-4">
				<Field.Legend class="sr-only">Edit User Form</Field.Legend>
				<Field.Group>
					<Field.Set>
						<Field.Label for="edit-username">Username</Field.Label>
						<Input id="edit-username" name="username" bind:value={formUsername} required />
					</Field.Set>
					<div class="grid grid-cols-2 gap-4">
						<Field.Set>
							<Field.Label>Role</Field.Label>
							<Select.Root type="single" name="role" bind:value={formRole}>
								<Select.Trigger><span>{formRole || 'Select a role'}</span></Select.Trigger>
								<Select.Content>
									{#each data.validRoles as role}
										<Select.Item value={role}>{role}</Select.Item>
									{/each}
								</Select.Content>
							</Select.Root>
						</Field.Set>
						{#if formRole === 'Dean'}
							<Field.Set>
								<Field.Label>College</Field.Label>
								<Select.Root type="single" name="college_id" bind:value={formCollegeId}>
									<Select.Trigger>
										<span class="truncate max-w-32">
											{data.colleges.find((c) => c.id.toString() === formCollegeId)?.college_name ||
												'N/A'}
										</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="">N/A</Select.Item>
										{#each data.colleges as college}
											<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item
											>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Set>
						{/if}
						{#if formRole === 'Chairperson'}
							<Field.Set>
								<Field.Label>Program</Field.Label>
								<Select.Root type="single" name="program_id" bind:value={formProgramId}>
									<Select.Trigger>
										<span class="truncate max-w-32">
											{data.programs.find((p) => p.id.toString() === formProgramId)?.program_name ||
												'N/A'}
										</span>
									</Select.Trigger>
									<Select.Content>
										<Select.Item value="">N/A</Select.Item>
										{#each data.programs as program}
											<Select.Item value={program.id.toString()}>{program.program_name}</Select.Item
											>
										{/each}
									</Select.Content>
								</Select.Root>
							</Field.Set>
						{/if}
					</div>
				</Field.Group>
			</Field.Set>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#if selectedUser}
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you absolutely sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the user <strong>{selectedUser.username}</strong>
					({selectedUser.email}). This action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/deleteUser"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Deleting user...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							deleteOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedUser.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (deleteOpen = false)}
						disabled={isSubmitting}>Cancel</Button
					>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
						Yes, Delete User
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

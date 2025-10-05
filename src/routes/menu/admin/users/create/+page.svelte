<script lang="ts">
	// Svelte 5 Rune mode is implied by not using `export let` and using $state
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { AlertCircle, CheckCircle } from '@lucide/svelte';

	// Corrected imports using $lib
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';
	import {
		Card,
		CardContent,
		CardDescription,
		CardHeader,
		CardTitle
	} from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';

	// Svelte 5 Runes: Prop access
	let { data, form } = $props<{ data: PageData; form: ActionData }>();

	// --- Svelte 5 Runes: State Management ---

	// Initialize form inputs using data from a failed submission (form?.data) or a fresh start (data.data)
	let email = $state(form?.data?.email || data.data?.email || '');
	let username = $state(form?.data?.username || data.data?.username || '');
	let password = $state(''); // Password is never pre-filled/retained
	let role = $state(form?.data?.role || data.data?.role || '');
	// collegeId is bound to the select root, so it must be a string matching the value of Select.Item
	let collegeId = $state(form?.data?.college_id || data.data?.college_id || '');

	// Errors and Messages derived from the server action result
	let formErrors = $derived(form?.formErrors || {});
	let globalMessage = $derived(form?.message || '');
	let isSuccess = $derived(form?.success === true);
	let isSubmitting = $state(false); // Used for button disabling

	// Helper to display an error for a specific field
	function getError(field: keyof typeof formErrors): string | undefined {
		return formErrors[field];
	}

	// Logic to reset form on successful submission
	$effect(() => {
		if (isSuccess && form?.data) {
			// Clear inputs on successful submission using the data returned from the server (which should be empty strings)
			email = form.data.email || '';
			username = form.data.username || '';
			password = '';
			role = form.data.role || '';
			collegeId = form.data.college_id || '';
		}
	});

	// Trigger content derived for Role Select
	const roleTriggerContent = $derived(role || 'Select a role');

	// Trigger content derived for College Select
	const collegeTriggerContent = $derived(
		data.colleges.find((c) => String(c.id) === collegeId)?.name || "Select the user's college"
	);
</script>

<!-- Outer Container -->
<div class="p-4 md:p-10 max-w-2xl mx-auto">
	<Card class="shadow-xl border border-gray-100 dark:border-gray-800">
		<CardHeader>
			<CardTitle class="text-3xl font-extrabold text-blue-800 dark:text-blue-400">
				Admin: Create New User
			</CardTitle>
			<CardDescription class="text-gray-500">
				Securely provision a new account for administrative staff (Dean, Registrar, or Admin).
			</CardDescription>
		</CardHeader>

		<CardContent>
			<!-- Status Messages -->
			{#if globalMessage}
				<Alert class="mb-6" variant={isSuccess ? 'default' : 'destructive'}>
					{#if isSuccess}
						<CheckCircle class="h-4 w-4" />
						<AlertTitle>Success</AlertTitle>
					{:else}
						<AlertCircle class="h-4 w-4" />
						<AlertTitle>Error</AlertTitle>
					{/if}
					<AlertDescription>{globalMessage}</AlertDescription>
				</Alert>
			{/if}

			<!-- Form Component: Standard SvelteKit action with Card structure -->
			<form
				method="POST"
				action="?/createUser"
				class="space-y-6"
				use:enhance={() => {
					isSubmitting = true;
					return async ({ update }) => {
						isSubmitting = false;
						await update();
					};
				}}
			>
				<!-- Email Field -->
				<div class="space-y-2">
					<Label for="email">Email</Label>
					<Input
						id="email"
						name="email"
						type="email"
						bind:value={email}
						placeholder="staff@university.edu"
						class={getError('email') ? 'border-red-500 focus:border-red-500' : ''}
					/>
					<p class="text-sm text-gray-500">This email will be used for sign-in.</p>
					{#if getError('email')}
						<p class="text-sm text-red-500 font-medium">{getError('email')}</p>
					{/if}
				</div>

				<!-- Username Field -->
				<div class="space-y-2">
					<Label for="username">Username</Label>
					<Input
						id="username"
						name="username"
						bind:value={username}
						placeholder="John_Smith"
						class={getError('username') ? 'border-red-500 focus:border-red-500' : ''}
					/>
					{#if getError('username')}
						<p class="text-sm text-red-500 font-medium">{getError('username')}</p>
					{/if}
				</div>

				<!-- Password Field -->
				<div class="space-y-2">
					<Label for="password">Temporary Password</Label>
					<Input
						id="password"
						name="password"
						type="password"
						bind:value={password}
						placeholder="••••••••"
						class={getError('password') ? 'border-red-500 focus:border-red-500' : ''}
					/>
					<p class="text-sm text-gray-500">
						Minimum 8 characters. The user will be required to change this later.
					</p>
					{#if getError('password')}
						<p class="text-sm text-red-500 font-medium">{getError('password')}</p>
					{/if}
				</div>

				<!-- Role Selector -->
				<div class="space-y-2">
					<Label for="role">User Role</Label>
					<!-- Corrected Select structure for Role -->
					<Select.Root type="single" name="role" bind:value={role}>
						<Select.Trigger class="w-full">
							{roleTriggerContent}
						</Select.Trigger>
						<Select.Content>
							{#each data.roles as r}
								<Select.Item value={r}>{r}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if getError('role')}
						<p class="text-sm text-red-500 font-medium mt-1">{getError('role')}</p>
					{/if}
				</div>

				<!-- College Selector -->
				<div class="space-y-2">
					<Label for="college_id">Assign College</Label>
					<!-- Corrected Select structure for College -->
					<Select.Root type="single" name="college_id" bind:value={collegeId}>
						<Select.Trigger class="w-full">
							{collegeTriggerContent}
						</Select.Trigger>
						<Select.Content>
							{#each data.colleges as college}
								<Select.Item value={String(college.id)}>{college.name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
					{#if getError('college_id')}
						<p class="text-sm text-red-500 font-medium mt-1">{getError('college_id')}</p>
					{/if}
				</div>

				<Button type="submit" class="w-full" disabled={isSubmitting}>
					{#if isSubmitting}
						Creating User...
					{:else}
						Create User Account
					{/if}
				</Button>
			</form>
		</CardContent>
	</Card>
</div>

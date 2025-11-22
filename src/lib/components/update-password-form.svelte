<script lang="ts">
	import {
		FieldGroup,
		Field,
		FieldLabel,
		FieldDescription
	} from '$lib/components/ui/field/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { cn } from '$lib/utils.js';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { LoaderCircle } from 'lucide-svelte';
	import type { ActionData } from '../../routes/update-password/$types';

	let { form }: { form?: ActionData } = $props();

	let password = $state('');
	let confirmPassword = $state('');
	let isSubmitting = $state(false);

	let formErrors = $state(form?.formErrors || {});
	$effect(() => {
		formErrors = form?.formErrors || {};
	});
</script>

<div class="mb-4 text-center">
	<h1 class="text-2xl font-bold tracking-tight">Update Your Password</h1>
	<p class="text-muted-foreground text-sm">Please choose a new password for your account.</p>
</div>

<form
	class={cn('flex flex-col gap-4')}
	method="POST"
	use:enhance={() => {
		isSubmitting = true;
		// The form will redirect on success, so we only need to handle failure.
		return async ({ update, result }) => {
			isSubmitting = false;
			if (result.type === 'failure') {
				const message = result.data?.message || 'Failed to update password.';
				toast.error(message);
			}
			await update();
		};
	}}
>
	<FieldGroup>
		<Field>
			<FieldLabel for="password">New Password</FieldLabel>
			<Input
				id="password"
				name="password"
				type="password"
				bind:value={password}
				disabled={isSubmitting}
				required
				class={formErrors.password ? 'border-destructive' : ''}
			/>
			{#if formErrors.password}
				<FieldDescription class="text-destructive">{formErrors.password}</FieldDescription>
			{/if}
		</Field>
		<Field>
			<FieldLabel for="confirmPassword">Confirm New Password</FieldLabel>
			<Input
				id="confirmPassword"
				name="confirmPassword"
				type="password"
				bind:value={confirmPassword}
				disabled={isSubmitting}
				required
				class={formErrors.confirmPassword ? 'border-destructive' : ''}
			/>
			{#if formErrors.confirmPassword}
				<FieldDescription class="text-destructive">{formErrors.confirmPassword}</FieldDescription>
			{/if}
		</Field>
		<Field>
			<Button type="submit" class="w-full" disabled={isSubmitting}>
				{#if isSubmitting}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					<span>Saving...</span>
				{:else}
					<span>Save New Password</span>
				{/if}
			</Button>
		</Field>
	</FieldGroup>
</form>
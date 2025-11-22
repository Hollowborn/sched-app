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
	import type { ActionData } from '../../routes/forgot-password/$types';
	import { onMount } from 'svelte';

	let { form }: { form?: ActionData } = $props();

	let email = $state(form?.email || '');
	let isSubmitting = $state(false);

	// Use a reactive statement to update formErrors when the form prop changes
	let formErrors = $state(form?.formErrors || {});
	$effect(() => {
		formErrors = form?.formErrors || {};
	});
</script>

<div class="mb-4 text-center">
	<h1 class="text-2xl font-bold tracking-tight">Forgot Password</h1>
	<p class="text-muted-foreground text-sm">Enter your email to receive a reset link.</p>
</div>

<form
	class={cn('flex flex-col gap-4')}
	method="POST"
	use:enhance={() => {
		isSubmitting = true;
		const toastId = toast.loading('Sending reset link...');

		return async ({ update, result }) => {
			isSubmitting = false;

			if (result.type === 'success') {
				toast.success('Password reset link sent!', {
					description: 'Please check your email for instructions.',
					id: toastId
				});
				// Clear form on success
				email = '';
				formErrors = {};
			} else if (result.type === 'failure') {
				const message = result.data?.message || 'Failed to send reset link.';
				toast.error(message, { id: toastId });
			} else {
				toast.error('An unexpected error occurred.', { id: toastId });
			}
			await update();
		};
	}}
>
	<FieldGroup>
		<Field>
			<FieldLabel for="email">Email</FieldLabel>
			<Input
				id="email"
				name="email"
				type="email"
				placeholder="your@email.com"
				bind:value={email}
				disabled={isSubmitting}
				required
				class={formErrors.email ? 'border-destructive' : ''}
			/>
			{#if formErrors.email}
				<FieldDescription class="text-destructive">{formErrors.email}</FieldDescription>
			{/if}
		</Field>
		<Field>
			<Button type="submit" class="w-full" disabled={isSubmitting}>
				{#if isSubmitting}
					<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
					<span>Sending...</span>
				{:else}
					<span>Send Reset Link</span>
				{/if}
			</Button>
		</Field>
	</FieldGroup>
</form>

<div class="mt-6 text-center text-sm">
	Remember your password?
	<a href="/login" class="text-primary hover:underline font-medium">Log in</a>
</div>
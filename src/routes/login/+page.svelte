<script lang="ts">
	import type { ActionData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { AlertCircle, LoaderCircle } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Alert, AlertDescription, AlertTitle } from '$lib/components/ui/alert';

	let { form } = $props<{ form?: ActionData }>();

	let email = $state(form?.email || '');
	let password = $state('');
	let isSubmitting = $state(false);

	let globalMessage = $derived(form?.message || '');
	let formErrors = $derived(form?.formErrors || {});
</script>

<div class="flex min-h-screen items-center justify-center bg-gray-50 dark:bg-gray-950 p-4">
	<div class="w-full max-w-4xl">
		<Card.Root class="overflow-hidden shadow-2xl dark:shadow-blue-950/20">
			<Card.Content class="grid p-0 md:grid-cols-2">
				<!-- Login Form Section -->
				<div class="p-6 sm:p-10 flex flex-col justify-center">
					<form
						method="POST"
						action="?/login"
						class="space-y-6"
						use:enhance={() => {
							isSubmitting = true;
							let toastId: string | number;

							toastId = toast.loading('Verifying credentials...');

							return async ({ update, result }) => {
								isSubmitting = false;

								if (result.type === 'redirect') {
									toast.success('Login successful! Redirecting...', { id: toastId });
								} else if (result.type === 'failure') {
									const message = result.data?.message || 'Invalid credentials.';
									toast.error(message, { id: toastId });
								} else {
									// This can happen if the action isn't found, for example.
									toast.error('An unexpected error occurred.', { id: toastId });
								}
								console.log('Form submission result:', result);
								// Allow SvelteKit to complete the navigation or update the form prop
								await update();
							};
						}}
					>
						<div class="flex flex-col gap-2 text-center">
							<h1 class="text-3xl font-bold tracking-tight">Welcome Back</h1>
							<p class="text-muted-foreground text-balance">
								Enter your credentials to access the SmartSched dashboard.
							</p>
						</div>

						{#if globalMessage && !formErrors.email && !formErrors.password}
							<Alert variant="destructive" class="mt-4">
								<AlertCircle class="h-4 w-4" />
								<AlertTitle>Login Failed</AlertTitle>
								<AlertDescription>{globalMessage}</AlertDescription>
							</Alert>
						{/if}

						<div class="space-y-4">
							<div class="grid gap-2">
								<Label for="email">Email</Label>
								<Input
									id="email"
									name="email"
									type="email"
									placeholder="dean@university.edu"
									required
									bind:value={email}
									disabled={isSubmitting}
									class={formErrors.email ? 'border-destructive' : ''}
								/>
								{#if formErrors.email}
									<p class="text-sm font-medium text-destructive">{formErrors.email}</p>
								{/if}
							</div>

							<div class="grid gap-2">
								<div class="flex items-center">
									<Label for="password">Password</Label>
									<a href="##" class="ml-auto inline-block text-sm underline">Forgot password?</a>
								</div>
								<Input
									id="password"
									name="password"
									type="password"
									required
									bind:value={password}
									disabled={isSubmitting}
									class={formErrors.password ? 'border-destructive' : ''}
								/>
								{#if formErrors.password}
									<p class="text-sm font-medium text-destructive">{formErrors.password}</p>
								{/if}
							</div>

							<Button type="submit" class="w-full" disabled={isSubmitting}>
								{#if isSubmitting}
									<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />
									Signing In...
								{:else}
									Login
								{/if}
							</Button>
						</div>

						<div class="mt-4 text-center text-sm">
							Don't have an account?
							<a href="##" class="underline">Sign up</a>
						</div>
					</form>
				</div>

				<!-- Image Section -->
				<div class="bg-muted relative hidden items-center justify-center md:flex">
					<img
						src="https://images.unsplash.com/photo-1523050854058-8df90110c9f1?q=80&w=2070&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D"
						alt="University campus"
						class="h-full w-full object-cover dark:brightness-75"
					/>
					<div class="absolute inset-0 bg-gradient-to-t from-blue-900/50 to-transparent" />
					<div class="absolute bottom-10 left-10 text-white">
						<h2 class="text-4xl font-bold">SmartSched</h2>
						<p class="mt-2 max-w-xs text-lg">Intelligent academic scheduling, simplified.</p>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	</div>
</div>

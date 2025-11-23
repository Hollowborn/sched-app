<script lang="ts">
	import { GalleryVerticalEnd } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';
	import UpdatePasswordForm from '$lib/components/update-password-form.svelte';
	import { onMount } from 'svelte';
	import { Spinner } from '$lib/components/ui/spinner';

	let { form, data } = $props<{ form: ActionData; data: PageData }>();
	const { supabase } = data;
	let sessionReady = $state(false);
	let sessionError = $state<string | null>(null);

	onMount(() => {
		// When the page loads with a reset token in the URL,
		// Supabase client automatically signs the user in.
		// We listen for this event to know when it's safe to show the update form.
		const {
			data: { subscription }
		} = supabase.auth.onAuthStateChange((event, session) => {
			if (event === 'SIGNED_IN') {
				sessionReady = true;
				subscription.unsubscribe();
			}

			// This handles the case where the token is expired or invalid
			if (event === 'INITIAL_SESSION' && !session) {
				sessionError = 'The password reset link is invalid or has expired. Please try again.';
				sessionReady = true; // Set to true to stop showing the loader
			}
		});

		// Check if a session already exists on mount (covers the case where the event fires before the listener is attached)
		supabase.auth.getSession().then(({ data: { session } }) => {
			if (session) {
				sessionReady = true;
			}
		});

		return () => {
			subscription?.unsubscribe();
		};
	});
</script>

<svelte:head>
	<title>Update Password | smart-sched</title>
</svelte:head>

<div class="flex min-h-svh flex-col items-center justify-center bg-gray-50 dark:bg-gray-950 p-6">
	<div class="flex w-full max-w-md flex-col gap-4">
		<div class="flex justify-center gap-2">
			<a href="/" class="flex items-center gap-2 font-medium">
				<div
					class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
				>
					<GalleryVerticalEnd class="size-4" />
				</div>
				<div class="flex text-xl font-bold text-foreground/90 font-['Poppins'] tracking-tight">
					<span class="font-semibold text-primary">smart</span>
					<span class="font-light">-sched</span>
				</div>
			</a>
		</div>

		<div class="bg-card text-card-foreground rounded-xl border p-8 shadow-sm">
			{#if !sessionReady}
				<div class="flex flex-col items-center justify-center gap-4 text-center">
					<Spinner class="size-8" />
					<p class="text-muted-foreground">Verifying reset link...</p>
				</div>
			{:else if sessionError}
				<div class="text-center text-destructive">
					<h2 class="text-lg font-semibold">Verification Failed</h2>
					<p class="mt-2 text-sm">{sessionError}</p>
					<a href="/forgot-password" class="text-primary hover:underline mt-4 inline-block"
						>Request a new link</a
					>
				</div>
			{:else}
				<UpdatePasswordForm {form} />
			{/if}
		</div>
	</div>
</div>

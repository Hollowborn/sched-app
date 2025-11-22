<script lang="ts">
	import { GalleryVerticalEnd } from '@lucide/svelte';
	import AppPreviewCard from '$lib/components/app-preview-card.svelte';
	import type { ActionData } from './$types';
	import ResetPasswordForm from '$lib/components/reset-password-form.svelte';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { ArrowLeft } from 'lucide-svelte';
	import { onMount } from 'svelte'; // Import onMount
	import { page } from '$app/stores'; // Import page store
	import { toast } from 'svelte-sonner'; // Import toast

	export let form: ActionData;

	onMount(() => {
		let errorMessage: string | null = null;
		const searchParams = new URLSearchParams($page.url.search);
		const hashParams = new URLSearchParams($page.url.hash.substring(1)); // Remove '#'

		// Check search parameters
		if (searchParams.has('error')) {
			errorMessage = searchParams.get('error_description') || searchParams.get('error');
		}

		// Check hash parameters (Supabase often puts auth errors here)
		if (hashParams.has('error')) {
			const hashErrorDescription = hashParams.get('error_description');
			const hashError = hashParams.get('error');

			if (hashErrorDescription) {
				errorMessage = hashErrorDescription;
			} else if (hashError) {
				errorMessage = hashError;
			}
		}

		if (errorMessage) {
			toast.error('Error', {
				description: errorMessage.replace(/\+/g, ' ') // Replace '+' with space for readability
			});
			// Optionally, clear the URL parameters after displaying the toast
			// This might involve navigating without history or replacing state.
			// For simplicity, we'll just display the toast and leave the URL as is.
		}
	});
</script>

<svelte:head>
	<title>Forgot Password | smart-sched</title>
</svelte:head>

<div class="grid min-h-svh lg:grid-cols-2">
	<div
		class="bg-primary/10 dark:bg-primary/5 relative hidden items-center justify-center p-10 lg:flex"
	>
		<div class="absolute left-8 top-8">
			<a
				href="/login"
				class="hover:bg-accent/50 text-muted-foreground hover:text-foreground flex items-center gap-2 rounded-md p-2 transition-colors"
			>
				<ArrowLeft class="size-4" />
				Back to Login
			</a>
		</div>
		<div class="w-full max-w-3xl text-center">
			<div class="mb-6 text-center">
				<h2 class="text-4xl font-bold tracking-tight">Need to reset your password?</h2>
				<p class="mt-2 text-lg text-muted-foreground">
					No problem. Enter your email and we'll send you a link to get back into your account.
				</p>
			</div>
			<div
				class="hover-lift rounded-xl bg-background/50 shadow-2xl shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-black/30 aspect-video"
			>
				<AppPreviewCard />
			</div>
			<Badge variant="outline" class="mt-4 text-xs text-muted-foreground"
				>Accounts are managed securely by Supabase.</Badge
			>
		</div>
	</div>
	<div class="flex flex-col gap-4 p-6 md:p-10">
		<div class="flex justify-center gap-2 md:justify-start">
			<a href="/" class="flex items-center gap-2 font-medium">
				<div
					class="bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
				>
					<GalleryVerticalEnd class="size-4" />
				</div>
				<div
					class="flex text-xl font-bold text-foreground/90 transition-opacity duration-200 group-data-[collapsible=icon]:hidden font-['Poppins'] tracking-tight"
				>
					<span class="font-semibold text-primary">smart</span>
					<span class="font-light">-sched</span>
				</div>
			</a>
		</div>
		<div class="flex flex-1 items-center justify-center">
			<div class="w-full max-w-xs">
				<ResetPasswordForm {form} />
			</div>
		</div>
	</div>
</div>

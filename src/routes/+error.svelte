<script lang="ts">
	import { page } from '$app/stores';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Search, ServerCrash, FileQuestionIcon, ShieldAlert } from 'lucide-svelte';

	// Error details are available in the $page store
	const status = $derived($page.status);
	const message = $derived($page.error?.message);

	const errorDetails = $derived(() => {
		switch (status) {
			case 404:
				return {
					icon: FileQuestionIcon,
					title: 'Page Not Found',
					description: "Sorry, the page you're looking for doesn't exist or has been moved."
				};
			case 403:
				return {
					icon: ShieldAlert,
					title: 'Access Denied',
					description: "Sorry, you don't have permission to view this page."
				};
			default:
				return {
					icon: ServerCrash,
					title: 'Something Went Wrong',
					description: 'An unexpected error occurred on our end. Please try again later.'
				};
		}
	});
</script>

<div class="flex min-h-screen flex-col items-center justify-center bg-background p-4 text-center">
	<div class="flex max-w-lg flex-col items-center gap-4">
		<svelte:component this={errorDetails.icon} class="h-24 w-24 text-primary" stroke-width="1.5" />
		<div class="space-y-2">
			<h1 class="text-6xl font-bold text-foreground">{status}</h1>
			<h2 class="text-2xl font-semibold tracking-tight">{errorDetails.title}</h2>
			<p class="text-foreground">
				{message || errorDetails.description}
			</p>
		</div>

		<div class="flex w-full items-center gap-2">
			<Button onclick={() => window.history.back()} variant="outline">Go Back</Button>
			<Button href="/menu" class="flex-1">Go to Dashboard</Button>
		</div>

		<p class="text-xs text-muted-foreground">
			If you believe this is an error, please <a href="##" class="underline">contact support</a>.
		</p>
	</div>
</div>

<script lang="ts">
	import { GalleryVerticalEnd } from '@lucide/svelte';
	import LoginForm from '$lib/components/login-form.svelte';
	import AppPreviewCard from '$lib/components/app-preview-card.svelte';
	import type { ActionData, PageData } from './$types';
	import Badge from '$lib/components/ui/badge/badge.svelte';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';
	import * as Alert from '$lib/components/ui/alert';
	import { CheckCircle } from 'lucide-svelte';

	let { form, data } = $props<{ form?: ActionData; data: PageData }>();

	let passwordUpdated = data.url.searchParams.get('passwordUpdated') === 'true';
</script>

<svelte:head>
	<title>Login Page | smart-sched</title>
</svelte:head>

<div class="grid min-h-svh lg:grid-cols-2">
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
				{#if passwordUpdated}
					<Alert.Alert
						variant="default"
						class="mb-6 bg-green-50 dark:bg-green-950/30 border-green-200 dark:border-green-800/50 text-green-800 dark:text-green-300"
					>
						<CheckCircle class="size-4" />
						<Alert.AlertTitle>Password Updated</Alert.AlertTitle>
						<Alert.AlertDescription>
							You can now log in with your new password.
						</Alert.AlertDescription>
					</Alert.Alert>
				{/if}
				<LoginForm {form} />
			</div>
		</div>
	</div>
	<div
		class="bg-primary/10 dark:bg-primary/5 relative hidden items-center justify-center p-10 lg:flex"
	>
		<div class="w-full max-w-3xl text-center">
			<div class="mb-6 text-center">
				<h2 class="text-4xl font-bold tracking-tight">
					Intelligent academic scheduling, simplified.
				</h2>
				<p class="mt-2 text-lg text-muted-foreground">
					Here's a glimpse of what our powerful dashboard looks like.
				</p>
			</div>
			<div
				class="hover-lift rounded-xl bg-background/50 shadow-2xl shadow-black/20 backdrop-blur-sm transition-all duration-300 hover:scale-[1.02] hover:shadow-black/30 aspect-video"
			>
				<!-- 
					POINTER: The `aspect-video` class sets a 16:9 aspect ratio. 
					You can change this to `aspect-square`, `aspect-[4/3]`, or remove it for a dynamic height.
				-->
				<AppPreviewCard />
			</div>
			<Badge variant="outline" class="mt-4 text-xs text-muted-foreground"
				>Alpha version available!</Badge
			>
		</div>
	</div>
</div>

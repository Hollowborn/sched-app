<script lang="ts">
	import { GalleryVerticalEnd } from '@lucide/svelte';
	import LoginForm from '$lib/components/login-form.svelte';
	import Image1 from '$lib/assets/img1.png';
	import type { ActionData } from './$types';

	let { form } = $props<{ form?: ActionData }>();
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
				<LoginForm {form} />
			</div>
		</div>
	</div>
	<div class="bg-primary relative hidden lg:block">
		<img
			src={Image1}
			alt="University campus"
			class="absolute inset-0 h-full w-full object-cover dark:brightness-[0.2] dark:grayscale"
		/>
		<div class="absolute bottom-10 left-10 text-white z-10">
			<h2 class="text-4xl font-bold">Intelligent academic scheduling, simplified.</h2>
			<p class="mt-2 max-w-xs text-lg">
				Streamline your academic scheduling process with AI-powered automation.
			</p>
		</div>
	</div>
</div>

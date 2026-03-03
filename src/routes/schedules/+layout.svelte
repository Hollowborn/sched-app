<script lang="ts">
	interface Props {
		children?: import('svelte').Snippet;
	}
	import { GalleryVerticalEndIcon } from '@lucide/svelte';
	let { children }: Props = $props();
</script>

<div class="min-h-screen bg-background flex flex-col">
	<!-- Public Header -->
	<header
		class="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60"
	>
		<div class="container flex h-14 items-center justify-between mx-auto px-4 md:px-8">
			<a
				href="/home"
				class="flex items-center gap-2.5 transition-transform duration-200 hover:scale-101"
			>
				<div
					class="ml-1 bg-primary text-primary-foreground flex size-6 items-center justify-center rounded-md"
				>
					<GalleryVerticalEndIcon class="size-4" />
				</div>
				<h1
					class="text-xl font-bold text-foreground/90 transition-opacity duration-200 group-data-[collapsible=icon]:hidden font-['Poppins'] tracking-tight"
				>
					<span class="font-semibold text-primary">smart</span><span class="font-light">-sched</span
					>
				</h1>
			</a>
			<div class="flex items-center gap-4">
				<a href="/login" class="text-sm font-medium hover:underline underline-offset-4">
					Instructor / Admin Login
				</a>
			</div>
		</div>
	</header>

	<main class="flex-1">
		{@render children?.()}
	</main>

	<!-- Public Footer -->
	<footer class="border-t bg-muted/20 py-8">
		<div class="container mx-auto px-4 text-center text-sm text-muted-foreground">
			<p>© {new Date().getFullYear()} smart-sched. All rights reserved.</p>
			<p class="mt-2">
				For inquiries or scheduling conflicts, please contact your respective Dean's office or the
				Registrar.
			</p>
		</div>
	</footer>
</div>

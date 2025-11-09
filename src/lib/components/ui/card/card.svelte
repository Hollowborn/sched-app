<script lang="ts">
	import type { HTMLAttributes } from 'svelte/elements';
	import { cn, type WithElementRef } from '$lib/utils.js';

	let {
		ref = $bindable(null),
		class: className,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLDivElement>> = $props();
</script>

<div
	bind:this={ref}
	data-slot="card"
	class={cn(
		'bg-card/30 text-card-foreground flex flex-col gap-6 rounded-xl py-6 backdrop-blur-md backdrop-saturate-150 relative',
		'border border-white/10 dark:border-white/10',
		'shadow-[0_0_0_1px_rgba(0,0,0,0.03),0_2px_4px_rgba(0,0,0,0.05),0_12px_24px_rgba(0,0,0,0.05)]',
		'dark:shadow-[0_0_0_1px_rgba(255,255,255,0.05),0_2px_4px_rgba(0,0,0,0.1),0_12px_24px_rgba(0,0,0,0.1)]',
		'before:absolute before:inset-0 before:-z-10 before:rounded-xl before:bg-gradient-to-br before:from-white/10 before:to-white/5 dark:before:from-white/5 dark:before:to-transparent',
		'after:absolute after:inset-0 after:-z-10 after:rounded-xl after:bg-background/60',
		'ring-1 ring-black/5 dark:ring-white/10',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</div>

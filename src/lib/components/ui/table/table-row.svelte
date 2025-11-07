<script lang="ts">
	import { cn, type WithElementRef } from '$lib/utils.js';
	import type { HTMLAttributes } from 'svelte/elements';

	let {
		ref = $bindable(null),
		class: className,
		selected = false,
		children,
		...restProps
	}: WithElementRef<HTMLAttributes<HTMLTableRowElement>> & {
		selected?: boolean;
	} = $props();
</script>

<tr
	bind:this={ref}
	data-slot="table-row"
	data-state={selected ? 'selected' : undefined}
	class={cn(
		'hover:[&,&>svelte-css-wrapper]:[&>th,td]:bg-muted/50 data-[state=selected]:bg-muted border-b transition-colors',
		className
	)}
	{...restProps}
>
	{@render children?.()}
</tr>

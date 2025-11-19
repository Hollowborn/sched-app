<script lang="ts">
	import { Checkbox } from '$lib/components/ui/checkbox/index.js';
	import type { ComponentProps } from 'svelte';
	let {
		checked = false,
		indeterminate = false,
		onCheckedChange = (v) => (checked = v),
		...restProps
	}: ComponentProps<typeof Checkbox> & { indeterminate?: boolean } = $props();
</script>

<div class="flex items-center justify-center">
	<Checkbox bind:checked={() => checked, onCheckedChange} {indeterminate} {...restProps} />
</div>

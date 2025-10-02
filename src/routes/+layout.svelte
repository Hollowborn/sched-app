<script lang="ts">
	import '../app.css';
	import favicon from '$lib/assets/favicon.svg';
	import { Toaster } from 'svelte-sonner';
	let { children } = $props();
</script>

<Toaster />
<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{@render children?.()}

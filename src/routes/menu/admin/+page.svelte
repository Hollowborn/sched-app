<script lang="ts">
	import NavHub from '$lib/components/nav-hub.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();
</script>

<NavHub items={data.navItems} section="Admin Console" />

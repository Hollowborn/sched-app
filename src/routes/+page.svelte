<script lang="ts">
	import { goto } from '$app/navigation';
	import type { PageProps } from './$types';
	import * as Card from '$lib/components/ui/card/index.js';

	let { data }: PageProps = $props();
	import Button from '$lib/components/ui/button/button.svelte';
	import { Root } from '$lib/components/ui/avatar';

	function redirectToLogin() {
		goto('/login');
	}
</script>

<Card.Root class="w-96">
	<Card.Header>
		<Card.Title>Supabase Integration Test</Card.Title>
		<Card.Description></Card.Description>
	</Card.Header>
	<Card.Content>
		<Button onclick={redirectToLogin}>Goto Login Page</Button>
	</Card.Content>
</Card.Root>

<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { page, navigating } from '$app/stores'; // Import SvelteKit's page store
	import { goto } from '$app/navigation'; // Import goto for navigation

	// Shadcn-Svelte imports
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js'; // Import Breadcrumb components
	import { Input } from '$lib/components/ui/input'; // Import Input component
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import Spinner from './ui/spinner/spinner.svelte';
	import { isSearchOpen } from '$lib/stores/searchStore';

	// Icons
	import SearchIcon from '@lucide/svelte/icons/search';
	// Reactive variable for the current path
	let headerTitle = $derived(getPageTitle($page.url.pathname));

	function getPageTitle(pathname: string): string {
		if (!pathname || pathname === '/') {
			return 'Home'; // Default for the root path
		}

		// Split the pathname by '/' and get the last segment
		const segments = pathname.split('/').filter(Boolean); // .filter(Boolean) removes empty strings
		let lastSegment = segments[segments.length - 1];

		if (!lastSegment) {
			// Fallback if somehow the last segment is empty after filtering
			return 'Home';
		}

		// Optional: Replace hyphens with spaces (e.g., 'about-us' -> 'About Us')
		lastSegment = lastSegment.replace(/-/g, ' ');

		// Capitalize the first letter of each word (simple capitalization)
		return lastSegment
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}

	// Reactive variable for the global search query
	let globalSearchQuery = $state('');

	// Function to handle global search
	async function handleGlobalSearch() {
		if (globalSearchQuery.trim()) {
			// Navigate to a dedicated search results page with the query as a URL parameter
			// await goto(`/dashboard/search-results?q=${encodeURIComponent(globalSearchQuery.trim())}`);
		}
	}

	function toggleSearch() {
		isSearchOpen.update((val) => !val);
	}

	onMount(() => {
		function handleKeyDown(event: KeyboardEvent) {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				toggleSearch();
			}
		}

		window.addEventListener('keydown', handleKeyDown);

		onDestroy(() => {
			window.removeEventListener('keydown', handleKeyDown);
		});
	});

	// Reactive derivation for breadcrumb items

	// Helper function to capitalize the first letter of each word
	function capitalizeWords(str: string): string {
		return str
			.split(' ')
			.map((word) => word.charAt(0).toUpperCase() + word.slice(1))
			.join(' ');
	}
</script>

<header
	class="h-(--header-height) group-has-data-[collapsible=icon]/sidebar-wrapper:h-(--header-height) flex shrink-0 items-center gap-2 border-b transition-[width,height] ease-linear"
>
	<div class="flex w-full items-center gap-1 px-4 lg:gap-2 lg:px-6 fixed backdrop-blur-sm">
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />
		{#if $navigating}
			<h1 class="font-bold animate-pulse">Loading</h1>
			<Spinner />
		{:else}
			<h1 class="font-bold">{headerTitle}</h1>
			<div class="ml-auto w-100 max-w-sm lg:max-w-md md:mr-100">
				<InputGroup.Root class="rounded-full overflow-hidden">
					<InputGroup.Button
						class="w-full justify-between pr-3 text-sm text-muted-foreground"
						onclick={toggleSearch}
					>
						<div class="flex items-center">
							<SearchIcon class="mr-2 h-4 w-4 shrink-0 opacity-50" />
							<span>Search...</span>
						</div>
						<InputGroup.Addon align="inline-end">
							<Kbd.Root>⌘</Kbd.Root>
							<Kbd.Root>K</Kbd.Root>
						</InputGroup.Addon>
					</InputGroup.Button>
				</InputGroup.Root>
			</div>
		{/if}
	</div>
</header>

<script lang="ts">
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js'; // Import Breadcrumb components
	import { page } from '$app/stores'; // Import SvelteKit's page store
	import { Input } from '$lib/components/ui/input'; // Import Input component
	import { Search } from '@lucide/svelte'; // Import Search icon
	import { goto } from '$app/navigation'; // Import goto for navigation

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
			await goto(`/dashboard/search-results?q=${encodeURIComponent(globalSearchQuery.trim())}`);
		}
	}

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

		<h1 class="font-bold">{headerTitle}</h1>
		<div class="ml-auto flex items-center gap-2">
			<!-- Global Search Input -->
			<!-- <div class="relative w-full max-w-sm">
                <Input
                    type="search"
                    placeholder="Search all data..."
                    class="pl-8"
                    bind:value={globalSearchQuery}
                    on:keydown={(e) => e.key === 'Enter' && handleGlobalSearch()}
                />
                <Search class="absolute left-2 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            </div>
            <Button on:click={handleGlobalSearch} size="sm" variant="secondary">
                Search
            </Button> -->
		</div>
	</div>
</header>

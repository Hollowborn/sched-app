<script lang="ts">
	import { onMount } from 'svelte';
	import { page, navigating } from '$app/stores';
	import { isSearchOpen } from '$lib/stores/searchStore';

	// Shadcn-Svelte imports
	import { Button } from '$lib/components/ui/button/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb/index.js';
	import * as Kbd from '$lib/components/ui/kbd/index.js';
	import * as InputGroup from '$lib/components/ui/input-group/index.js';
	import Spinner from './ui/spinner/spinner.svelte';

	// Icons
	import SearchIcon from '@lucide/svelte/icons/search';
	import { PanelLeftClose, PanelLeftOpen } from 'lucide-svelte';

	let user = $derived($page.data.profile);

	function toggleSearch() {
		isSearchOpen.update((val) => !val);
	}

	onMount(() => {
		const handleKeyDown = (event: KeyboardEvent) => {
			if ((event.metaKey || event.ctrlKey) && event.key === 'k') {
				event.preventDefault();
				toggleSearch();
			}
		};

		window.addEventListener('keydown', handleKeyDown);

		return () => {
			window.removeEventListener('keydown', handleKeyDown);
		};
	});

	// Reactive derivation for breadcrumb items
	let breadcrumbItems = $derived(
		$page.url.pathname
			.split('/')
			.filter(Boolean)
			.map((segment, index, arr) => {
				const label = segment.replace(/-/g, ' ').replace(/\b\w/g, (l) => l.toUpperCase());
				const href = '/' + arr.slice(0, index + 1).join('/');
				return { label, href };
			})
	);
</script>

<header
	class="sticky top-0 z-50 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur sm:px-6"
>
	<div class="flex w-full items-center gap-2">
		<!-- Mobile Sidebar Toggle -->
		<Sidebar.Trigger class="-ml-1" />
		<Separator orientation="vertical" class="mx-2 data-[orientation=vertical]:h-4" />

		{#if $navigating}
			<div class="flex items-center gap-2">
				<Spinner />
				<span class="font-semibold animate-pulse">Loading...</span>
			</div>
		{:else}
			<Breadcrumb.Root class="hidden md:flex">
				<Breadcrumb.List>
					{#each breadcrumbItems as item, i}
						<Breadcrumb.Item>
							<Breadcrumb.Link href={item.href}>{item.label}</Breadcrumb.Link>
						</Breadcrumb.Item>
						{#if i < breadcrumbItems.length - 1}
							<Breadcrumb.Separator />
						{/if}
					{/each}
				</Breadcrumb.List>
			</Breadcrumb.Root>
		{/if}

		<div class="ml-auto flex items-center gap-4 md:gap-2 lg:gap-4">
			<div class="w-full max-w-xs">
				<InputGroup.Root>
					<InputGroup.Button
						class="w-full justify-between pr-3 text-sm text-muted-foreground"
						onclick={toggleSearch}
					>
						<div class="flex items-center">
							<SearchIcon class="mr-2 h-4 w-4 shrink-0 opacity-50" />
							<span>Search...</span>
						</div>
						<InputGroup.Addon align="inline-end" class="p-0">
							<Kbd.Root>⌘</Kbd.Root>
							<Kbd.Root>K</Kbd.Root>
						</InputGroup.Addon>
					</InputGroup.Button>
				</InputGroup.Root>
			</div>
		</div>
	</div>
</header>

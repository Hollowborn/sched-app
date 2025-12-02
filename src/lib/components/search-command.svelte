<script lang="ts">
	import { isSearchOpen } from '$lib/stores/searchStore';
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	// Shadcn-svelte imports
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Command from '$lib/components/ui/command';
	import { Skeleton } from '$lib/components/ui/skeleton';
	// Icons
	import { ChevronRight, XIcon } from 'lucide-svelte';

	let placeholder: string = 'Type a command or search...';

	let searchTerm = $state('');
	let searchResults: {
		instructors: { id: string; name: string }[];
		subjects: { id: string; code: string; name: string }[];
	} = $state({ instructors: [], subjects: [] });
	let isLoading = $state(false);

	// Client-side static actions/pages, filtered by user role
	let staticActions: {
		label: string;
		href: string;
		roles: string[];
	}[] = $state([]);

	$effect(() => {
		const role = $page.data.profile?.role;

		const allActions = [
			{ label: 'View Dashboard', href: '/menu/dashboard', roles: ['Admin', 'Dean', 'Chairperson'] },
			{ label: 'Manage Users', href: '/menu/admin/users', roles: ['Admin'] },
			{
				label: 'Manage Subjects',
				href: '/menu/resources/subjects',
				roles: ['Admin', 'Dean', 'Chairperson']
			},
			{
				label: 'Manage Instructors',
				href: '/menu/resources/instructors',
				roles: ['Admin', 'Dean', 'Chairperson']
			},
			{ label: 'Manage Rooms', href: '/menu/resources/rooms', roles: ['Admin', 'Dean'] },
			{
				label: 'Manage Programs & Blocks',
				href: '/menu/resources/blocks',
				roles: ['Admin', 'Dean']
			},
			{
				label: 'Manage Offerings',
				href: '/menu/academics/offerings',
				roles: ['Admin', 'Dean', 'Chairperson']
			},
			{
				label: 'Assign Instructors',
				href: '/menu/academics/assignments',
				roles: ['Admin', 'Dean', 'Chairperson']
			},
			{
				label: 'Generate Timetables',
				href: '/menu/timetables/generate',
				roles: ['Admin', 'Dean', 'Chairperson']
			},
			{
				label: 'Change Password',
				href: '/menu/settings?tab=security',
				roles: ['Admin', 'Dean', 'Chairperson']
			}, // Example for a settings tab
			{ label: 'Logout', href: '/logout', roles: ['Admin', 'Dean', 'Chairperson'] },
			{ label: 'Prototypes', href: '/prototypes', roles: ['Admin'] }
		];

		if (!role) {
			staticActions = [];
		} else {
			staticActions = allActions.filter((action) => action.roles.includes(role));
		}
	});

	let filteredStaticActions: {
		label: string;
		href: string;
		roles: string[];
	}[] = $state([]);

	$effect(() => {
		if (!searchTerm) {
			filteredStaticActions = staticActions;
		} else {
			const lowerCaseSearchTerm = searchTerm.toLowerCase();
			filteredStaticActions = staticActions.filter((action) =>
				action.label.toLowerCase().includes(lowerCaseSearchTerm)
			);
		}
	});

	// Debounce function
	function debounce<T extends (...args: any[]) => void>(func: T, delay: number): T {
		let timeout: NodeJS.Timeout;
		return ((...args: any[]) => {
			clearTimeout(timeout);
			timeout = setTimeout(() => func(...args), delay);
		}) as T;
	}

	const fetchSearchResults = debounce(async (query: string) => {
		if (query.length < 2) {
			searchResults = { instructors: [], subjects: [] }; // Ensure empty arrays
			isLoading = false;
			return;
		}

		isLoading = true;
		// Placeholder for actual API call
		try {
			const response = await fetch(`/api/search?q=${encodeURIComponent(query)}`);
			if (!response.ok) {
				throw new Error('Failed to fetch search results');
			}
			const data = await response.json();
			// Ensure data.results has instructors and subjects as arrays
			searchResults = {
				instructors: data.results.instructors || [],
				subjects: data.results.subjects || []
			};
		} catch (error) {
			console.error('Search error:', error);
			searchResults = { instructors: [], subjects: [] };
		} finally {
			isLoading = false;
		}
	}, 300); // 300ms debounce

	$effect(() => {
		fetchSearchResults(searchTerm);
	});

	async function handleSelect(href: string) {
		// Await goto to ensure navigation completes before we close the modal.
		// This prevents a race condition where the component unmounts and cancels the navigation.
		// invalidateAll ensures the destination page's load function always re-runs.
		await goto(href, { invalidateAll: true });

		$isSearchOpen = false;
	}
</script>

<Dialog.Root bind:open={$isSearchOpen}>
	<Dialog.Content showCloseButton={false} class="overflow-hidden p-0 shadow-lg  ">
		<Command.Root
			class="max-h-[min(calc(100vh-8rem),500px)] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-md transition-all [--cmdk-shadow:0_2px_10px_rgb(0_0_0_/_0.06)]"
		>
			<Command.Input autofocus {placeholder} bind:value={searchTerm} spellcheck="false" />
			<Command.List class="p-2">
				{#if isLoading}
					<Command.Group heading="Loading...">
						<div class="space-y-2 p-2">
							<Skeleton class="h-10 w-full" />
							<Skeleton class="h-10 w-full" />
							<Skeleton class="h-10 w-full" />
						</div>
					</Command.Group>
				{:else if searchTerm.length < 2 && filteredStaticActions.length === 0}
					<Command.Empty>Start typing to search...</Command.Empty>
				{:else if searchTerm.length >= 2 && searchResults.instructors.length === 0 && searchResults.subjects.length === 0 && filteredStaticActions.length === 0}
					<Command.Empty>No results found.</Command.Empty>
				{:else}
					{#if searchResults.instructors.length > 0}
						<Command.Group heading="Instructors">
							{#each searchResults.instructors as instructor}
								<Command.Item
									value={instructor.name}
									onclick={() => handleSelect(`/menu/resources/instructors?id=${instructor.id}`)}
									class="text-base py-3 mb-1 rounded-md"
								>
									{instructor.name}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}

					{#if searchResults.subjects.length > 0}
						<Command.Group heading="Subjects">
							{#each searchResults.subjects as subject}
								<Command.Item
									value={`${subject.code}: ${subject.name}`}
									onclick={() => handleSelect(`/menu/resources/subjects?id=${subject.id}`)}
									class="text-base py-3 mb-1 rounded-md"
								>
									{subject.code}: {subject.name}
								</Command.Item>
							{/each}
						</Command.Group>
					{/if}
				{/if}

				{#if filteredStaticActions.length > 0}
					<Command.Group heading="Actions & Pages">
						{#each filteredStaticActions as action}
							<Command.Item
								value={action.label}
								onclick={() => handleSelect(action.href)}
								class=" py-3 mb-1 rounded-md flex items-center justify-between"
							>
								{action.label}
								<ChevronRight />
							</Command.Item>
						{/each}
					</Command.Group>
				{/if}
			</Command.List>
		</Command.Root>
	</Dialog.Content>
</Dialog.Root>

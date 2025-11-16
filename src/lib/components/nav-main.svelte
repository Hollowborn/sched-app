<script lang="ts">
	import * as Collapsible from '$lib/components/ui/collapsible/index.js';
	import * as Sidebar from '$lib/components/ui/sidebar/index.js';
	import ChevronRightIcon from '@lucide/svelte/icons/chevron-right';
	import type { NavItem } from '../../nav';

	// Dynamically import all icons from lucide-svelte
	import * as icons from '@lucide/svelte';

	let {
		items,
		currentPath
	}: {
		items: NavItem[];
		currentPath: string;
	} = $props();

	// Function to determine if a main nav item or one of its children is active
	function isItemActive(item: NavItem): boolean {
		if (currentPath === item.url) {
			return true;
		}
		if (item.items) {
			return item.items.some((subItem) => currentPath.startsWith(subItem.url));
		}
		return false;
	}
</script>

<Sidebar.Group>
	<Sidebar.GroupLabel>Navigation</Sidebar.GroupLabel>
	<Sidebar.Menu>
		<!-- Suggestion: Add a static Dashboard link -->
		<Sidebar.MenuItem>
			<Sidebar.MenuButton
				href="/menu/dashboard"
				isActive={currentPath === '/menu/dashboard'}
				tooltipContent="Dashboard"
			>
				<svelte:component this={icons['LayoutDashboard']} />
				<span>Dashboard</span>
			</Sidebar.MenuButton>
		</Sidebar.MenuItem>

		{#each items as item (item.title)}
			{@const isActive = isItemActive(item)}
			{@const IconComponent = icons[item.icon as keyof typeof icons] || icons['HelpCircle']}

			{#if item.items && item.items.length > 0}
				<!-- Render as a collapsible group -->
				<Collapsible.Root open={isActive} class="group/collapsible">
					<Sidebar.MenuItem>
						<Collapsible.Trigger class="w-full">
							<Sidebar.MenuButton {isActive} tooltipContent={item.title}>
								<svelte:component this={IconComponent} />
								<span>{item.title}</span>
								<ChevronRightIcon
									class="ml-auto transition-transform duration-200 group-data-[state=open]/collapsible:rotate-90"
								/>
							</Sidebar.MenuButton>
						</Collapsible.Trigger>
						<Collapsible.Content>
							<Sidebar.MenuSub>
								{#each item.items as subItem (subItem.title)}
									{@const isSubActive = currentPath.startsWith(subItem.url)}
									<Sidebar.MenuSubItem>
										<!-- Removed the duplicate `isActive` attributes -->
										<Sidebar.MenuSubButton href={subItem.url} isActive={isSubActive}>
											<span>{subItem.title}</span>
										</Sidebar.MenuSubButton>
									</Sidebar.MenuSubItem>
								{/each}
							</Sidebar.MenuSub>
						</Collapsible.Content>
					</Sidebar.MenuItem>
				</Collapsible.Root>
			{:else}
				<!-- Render as a direct link -->
				<Sidebar.MenuItem>
					<Sidebar.MenuButton href={item.url} {isActive} tooltipContent={item.title}>
						<svelte:component this={IconComponent} />
						<span>{item.title}</span>
					</Sidebar.MenuButton>
				</Sidebar.MenuItem>
			{/if}
		{/each}
	</Sidebar.Menu>
</Sidebar.Group>

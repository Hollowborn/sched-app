// src/routes/dashboard/+layout.server.ts
import type { LayoutServerLoad } from './$types';
// Assuming NavItem type is correctly imported from your nav-main.svelte module script
import type { NavItem } from '$lib/components/nav-main.svelte';

// Define your base navigation data with groups here.
// We'll filter this data based on user roles.
const allNavItemsData: { main: NavItem[]; administration: NavItem[] } = {
	main: [
		{
			title: 'Dashboard',
			url: '/dashboard',
			icon: 'dashboard',
			// Add a 'roles' array to each item indicating who can see it
			roles: ['admin', 'feeds', 'hardware'] // Example: All roles can see dashboard
		},
		{
			title: 'Clients',
			url: '/dashboard/clients',
			icon: 'users',
			roles: ['admin'] // Example: Only admin and feeds roles can see clients
		},
		{
			title: 'Feeds Inventory',
			url: '/dashboard/inventory/feeds',
			icon: 'fish',
			roles: ['admin', 'feeds'] // Example: Admin and feeds roles
		},
		{
			title: 'Hardware Inventory',
			url: '/dashboard/inventory/hardware',
			icon: 'hammer',
			roles: ['admin', 'hardware'] // Example: Admin and hardware roles
		},
		{
			title: 'Bookings',
			url: '/dashboard/bookings',
			icon: 'calendar',
			roles: ['admin'] // Example: Only admin can see bookings
		},
		{
			title: 'Ponds',
			url: '/dashboard/ponds',
			icon: 'fileText',
			roles: ['admin'] // Example: All can see ponds
		}
	],
	administration: [
		{
			title: 'Employees',
			url: '/dashboard/employees',
			icon: 'briefcase',
			roles: ['admin'] // Example: Only admin can see employees
		},
		{
			title: 'Activity Log',
			url: '/dashboard/activities',
			icon: 'fileText',
			roles: ['admin', 'feeds', 'hardware'] // Example: Only admin can see employees
		},
		{
			title: 'Settings',
			url: '/dashboard/settings',
			icon: 'settings',
			roles: ['admin', 'feeds', 'hardware'] // Example: All logged-in users can see settings
		},
		{
			title: 'Guide / Help Section',
			url: '/dashboard/guide',
			icon: 'help',
			roles: ['admin', 'feeds', 'hardware'] // Example: All can see help
		}
	]
};

export const load: LayoutServerLoad = async ({ locals }) => {
	// Get the user's role from locals.user, which is populated by hooks.server.ts
	// Provide a default 'guest' role if locals.user is null (e.g., not logged in)
	const userRole = locals.user?.role || 'guest';

	// Function to filter navigation items based on the user's role
	const filterNavItemsByRole = (items: NavItem[], role: string): NavItem[] => {
		return items.filter((item) => {
			// If an item has explicit roles defined, check if the user's role is included
			if (item.roles && item.roles.length > 0) {
				return item.roles.includes(role);
			}
			// If no specific roles are defined, the item is visible to everyone by default
			// (or you can decide to hide it if no roles are specified)
			return true; // Default to visible if no roles specified
		});
	};

	// Filter the navigation data based on the current user's role
	const filteredMainNavItems = filterNavItemsByRole(allNavItemsData.main, userRole);
	const filteredAdminNavItems = filterNavItemsByRole(allNavItemsData.administration, userRole);

	// Reconstruct the navItemsData with filtered items
	const navItemsForUser = {
		main: filteredMainNavItems,
		administration: filteredAdminNavItems
	};

	return {
		navItems: navItemsForUser, // Pass the filtered navigation items
		user: locals.user
			? {
					name: locals.user.username,
					display_name: locals.user.display_name,
					role: locals.user.role,
					avatar: locals.user.profile_image // should be a string URL or base64
				}
			: null // Pass null if no user is logged in
	};
};

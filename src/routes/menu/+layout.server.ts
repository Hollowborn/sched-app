// src/routes/menu/+layout.server.ts
import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { NavItem } from '../../nav';

// List of public routes that *do not* require authentication
const PUBLIC_ROUTES = ['/login', '/'];

// --- Navigation Data: Central source of truth for menu items (SmartSched Timetable Management) ---
// NOTE: Roles assumed for SmartSched: 'admin', 'editor' (can modify schedules/resources), 'viewer' (read-only access).
const ALL_NAV_ITEMS_DATA: NavItem[] = [
	{
		title: 'Timetable Manager',
		url: '/menu/timetables',
		icon: 'CalendarClock', // Used for scheduling
		roles: ['admin', 'editor', 'viewer'], // All roles need access to view schedules
		items: [
			{
				title: 'Current Schedules',
				url: '/menu/timetables/current',
				roles: ['admin', 'editor', 'viewer']
			},
			{
				title: 'Create New Timetable',
				url: '/menu/timetables/create',
				roles: ['admin', 'editor']
			},
			{
				title: 'Archived Timetables',
				url: '/menu/timetables/archive',
				roles: ['admin']
			}
		]
	},
	{
		title: 'Resource Setup',
		url: '/menu/resources',
		icon: 'LayoutGrid', // Used to group resources
		roles: ['admin', 'editor'], // Only admin and editors manage core resources
		items: [
			{
				title: 'Subjects & Courses',
				url: '/menu/resources/subjects',
				roles: ['admin', 'editor']
			},
			{
				title: 'Rooms & Venues',
				url: '/menu/resources/rooms',
				roles: ['admin', 'editor']
			},
			{
				title: 'Faculty & Staff List',
				url: '/menu/resources/faculty',
				roles: ['admin'] // Staff list creation/deletion usually Admin-only
			}
		]
	},
	{
		title: 'Admin Console',
		url: '/menu/admin',
		icon: 'SquareTerminal',
		roles: ['admin'], // Only 'admin' role can see this main item
		items: [
			{
				title: 'Users & Roles',
				url: '/menu/admin/users/create',
				roles: ['admin']
			},
			{
				title: 'Activity Log',
				url: '/menu/admin/log',
				roles: ['admin']
			},
			{
				title: 'System Maintenance',
				url: '/menu/admin/maintenance',
				roles: ['admin']
			}
		]
	},
	{
		title: 'Documentation',
		url: '/docs',
		icon: 'BookOpen',
		roles: ['admin', 'editor', 'viewer'],
		items: [
			{
				title: 'User Guide',
				url: '/docs/guide',
				roles: ['admin', 'editor', 'viewer']
			},
			{
				title: 'Support & FAQs',
				url: '/docs/support',
				roles: ['admin', 'editor', 'viewer']
			}
		]
	},
	{
		title: 'Settings',
		url: '/settings',
		icon: 'Settings2',
		roles: ['admin', 'editor', 'viewer'],
		items: [
			{
				title: 'My Profile',
				url: '/settings/profile',
				roles: ['admin', 'editor', 'viewer']
			},
			{
				title: 'System Configuration',
				url: '/settings/system',
				roles: ['admin']
			}
		]
	}
];

/**
 * Recursively filters navigation items based on the user's role.
 * Only returns items where the user's role is included in the item's 'roles' array.
 * @param navItems The full list of navigation items.
 * @param userRole The role of the current user.
 * @returns Filtered navigation items.
 */
function filterNavByRole(navItems: NavItem[], userRole: string | null): NavItem[] {
	if (!userRole) return []; // If no role (unauthenticated), return nothing

	return navItems.reduce((acc: NavItem[], item) => {
		// 1. Check if the user's role is allowed for the main item
		if (item.roles.includes(userRole)) {
			const filteredItem: NavItem = { ...item };

			// 2. Recursively filter sub-items if they exist
			if (item.items) {
				const filteredSubItems = filterNavByRole(item.items, userRole);

				// If the main item is visible but has no visible sub-items, we don't include the 'items' property.
				if (filteredSubItems.length > 0) {
					filteredItem.items = filteredSubItems;
				} else {
					delete filteredItem.items;
				}
			}

			// 3. Only keep the main item if its role check passed and it's not a parent stripped of all its children.
			// Note: Since we checked item.roles.includes(userRole) above, we just push the modified item.
			acc.push(filteredItem);
		}
		return acc;
	}, []);
}

// --- Layout Server Load Function ---
export const load: LayoutServerLoad = async ({ locals, url }) => {
	// Session and User state from src/hooks.server.ts
	const session = locals.session;
	const user = locals.user;

	const isPublicRoute = PUBLIC_ROUTES.includes(url.pathname);

	// --- 1. Authentication Protection ---

	// If NOT authenticated AND trying to access a protected route
	if (!session && !isPublicRoute) {
		throw redirect(303, '/login');
	}

	// If IS authenticated AND trying to access the login page
	if (session && url.pathname === '/login') {
		// Redirect logged-in users to the main protected page
		throw redirect(303, '/menu');
	}

	// --- 2. Fetch Role and Filter Navigation ---
	let userRole: string | null = null;
	let profile: { username: string; role: string } | null = null;
	let filteredNav: NavItem[] = [];

	if (user) {
		// Fetch the user's role and username from the 'users' profile table
		const { data, error } = await locals.supabase
			.from('users')
			.select('username, role')
			.eq('id', user.id)
			.single();

		if (error || !data) {
			console.error('Failed to fetch user profile in layout. Defaulting to "guest".', error);
			userRole = 'guest';
		} else {
			profile = data;
			userRole = data.role;
		}

		// Filter the main navigation based on the determined role
		filteredNav = filterNavByRole(ALL_NAV_ITEMS_DATA, userRole);
	}

	// Pass essential data to the client-side layout
	return {
		session,
		user,
		profile,
		navItems: filteredNav
	};
};

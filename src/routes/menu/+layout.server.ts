import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { NavItem } from '../../nav';

// --- Navigation Data: Central source of truth for menu items ---
const ALL_NAV_ITEMS_DATA: NavItem[] = [
	{
		title: 'Timetable Manager',
		url: '/menu/timetables',
		icon: 'CalendarClock',
		roles: ['Admin', 'Registrar', 'Dean'],
		items: [
			{
				title: 'Current Schedules',
				url: '/menu/timetables/current',
				roles: ['Admin', 'Registrar', 'Dean']
			},
			{
				title: 'Create New Timetable',
				url: '/menu/timetables/create',
				roles: ['Admin', 'Registrar']
			},
			{ title: 'Archived Timetables', url: '/menu/timetables/archive', roles: ['Admin'] }
		]
	},
	{
		title: 'Resource Setup',
		url: '/menu/resources',
		icon: 'LayoutGrid',
		roles: ['Admin', 'Registrar'],
		items: [
			{
				title: 'Subjects & Courses',
				url: '/menu/resources/subjects',
				roles: ['Admin', 'Registrar']
			},
			{ title: 'Rooms & Venues', url: '/menu/resources/rooms', roles: ['Admin', 'Registrar'] },
			{ title: 'Faculty & Staff List', url: '/menu/resources/faculty', roles: ['Admin'] }
		]
	},
	{
		title: 'Admin Console',
		url: '/menu/admin',
		icon: 'SquareTerminal',
		roles: ['Admin'],
		items: [
			{ title: 'Users & Roles', url: '/menu/admin/users/create', roles: ['Admin'] },
			{ title: 'Activity Log', url: '/menu/admin/log', roles: ['Admin'] },
			{ title: 'System Maintenance', url: '/menu/admin/maintenance', roles: ['Admin'] }
		]
	}
	// Note: Documentation and Settings can be added back if needed
];

/**
 * **Case-insensitive** recursive filter for navigation items.
 */
function filterNavByRole(navItems: NavItem[], userRole: string | null): NavItem[] {
	if (!userRole) return [];
	const lowerCaseUserRole = userRole.trim().toLowerCase();

	return navItems.reduce((acc: NavItem[], item) => {
		const lowerCaseItemRoles = item.roles.map((r) => r.toLowerCase());
		if (lowerCaseItemRoles.includes(lowerCaseUserRole)) {
			const filteredItem: NavItem = { ...item };
			if (item.items) {
				const filteredSubItems = filterNavByRole(item.items, userRole);
				if (filteredSubItems.length > 0) {
					filteredItem.items = filteredSubItems;
				} else {
					delete filteredItem.items; // Don't include empty submenus
				}
			}
			acc.push(filteredItem);
		}
		return acc;
	}, []);
}

export const load: LayoutServerLoad = async ({ locals }) => {
	const { session, user } = locals;

	if (!session) {
		throw redirect(303, '/login');
	}

	let profile: { username: string; role: string } | null = null;
	let filteredNav: NavItem[] = [];

	if (user) {
		const { data, error } = await locals.supabase
			.from('users')
			.select('username, role')
			.eq('id', user.id)
			.single();

		if (error || !data) {
			console.error('Error fetching user profile:', error?.message);
		} else {
			profile = data;
			filteredNav = filterNavByRole(ALL_NAV_ITEMS_DATA, data.role);
		}
	}

	// For debugging: log what's being sent to the client
	// console.log('Filtered Nav Items:', JSON.stringify(filteredNav, null, 2));

	return {
		session,
		user,
		profile,
		navItems: filteredNav
	};
};

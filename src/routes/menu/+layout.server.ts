import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';
import type { NavItem } from '../../nav';

// --- Navigation Data: Central source of truth for menu items ---
const ALL_NAV_ITEMS_DATA: NavItem[] = [
	{
		title: 'Academics',
		url: '/menu/academics',
		icon: 'BookOpen',
		roles: ['Admin', 'Dean', 'Registrar'],
		items: [
			{
				title: 'Class Offerings',
				url: '/menu/academics/offerings',
				roles: ['Admin', 'Dean', 'Registrar']
			},
			{
				title: 'Instructor Assignments',
				url: '/menu/academics/assignments',
				roles: ['Admin', 'Dean']
			}
		]
	},
	{
		title: 'Scheduling',
		url: '/menu/timetables',
		icon: 'CalendarClock',
		roles: ['Admin', 'Dean', 'Registrar'],
		items: [
			{
				title: 'Master Scheduler',
				url: '/menu/timetables/scheduler',
				roles: ['Admin', 'Dean', 'Registrar']
			},
			{
				title: 'View Schedules',
				url: '/menu/timetables/view',
				roles: ['Admin', 'Dean', 'Registrar'] // Eventually, a 'public' role can be added here
			}
		]
	},
	{
		title: 'Resources',
		url: '/menu/resources',
		icon: 'LayoutGrid',
		roles: ['Admin', 'Dean', 'Registrar'],
		items: [
			{
				title: 'Subjects (Catalog)',
				url: '/menu/resources/subjects',
				roles: ['Admin', 'Dean', 'Registrar']
			},
			{
				title: 'Instructors',
				url: '/menu/resources/instructors',
				roles: ['Admin', 'Dean']
			},
			{
				title: 'Rooms & Venues',
				url: '/menu/resources/rooms',
				roles: ['Admin', 'Registrar']
			},
			{
				title: 'Programs & Blocks',
				url: '/menu/resources/blocks',
				roles: ['Admin', 'Registrar']
			}
		]
	},
	{
		title: 'Admin Console',
		url: '/menu/admin',
		icon: 'SquareTerminal',
		roles: ['Admin'],
		items: [
			{
				title: 'User Management',
				url: '/menu/admin/users',
				roles: ['Admin']
			},
			{
				title: 'System Settings',
				url: '/menu/admin/settings',
				roles: ['Admin']
			}
			// { title: 'Activity Log', url: '/menu/admin/log', roles: ['Admin'] } // Can be added back later
		]
	}
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

	let profile: { username: string; role: string; college_id: number } | null = null;
	let filteredNav: NavItem[] = [];

	if (user) {
		const { data, error } = await locals.supabase
			.from('users')
			.select('username, role, college_id')
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

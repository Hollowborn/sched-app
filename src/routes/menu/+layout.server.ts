import type { LayoutServerLoad } from './$types';
import type { NavItem } from '../../nav';
import { fail, redirect } from '@sveltejs/kit';
// import type { Actions } from '@sveltejs/kit';

// --- Navigation Data: Central source of truth for menu items ---
const ALL_NAV_ITEMS_DATA: NavItem[] = [
	{
		title: 'Resources',
		url: '/menu/resources',
		icon: 'Library',
		description: 'Manage the fundamental building blocks of the schedule.',
		roles: ['Admin', 'Dean', 'Registrar', 'Chairperson'],
		items: [
			{
				title: 'Subjects (Catalog)',
				url: '/menu/resources/subjects',
				icon: 'Book',
				description: 'Manage the course catalog, including lecture/lab hours and subject codes.',
				roles: ['Admin', 'Dean', 'Registrar', 'Chairperson']
			},
			{
				title: 'Instructors',
				url: '/menu/resources/instructors',
				icon: 'User',
				description: 'Manage faculty profiles, teaching loads, and availability.',
				roles: ['Admin', 'Dean', 'Chairperson']
			},
			{
				title: 'Rooms & Venues',
				url: '/menu/resources/rooms',
				icon: 'Building',
				description: 'Manage classrooms, laboratories, and their capacities.',
				roles: ['Admin', 'Registrar', 'Chairperson']
			},
			{
				title: 'Blocks',
				url: '/menu/resources/blocks',
				icon: 'Users',
				description: 'Manage student blocks and program sections.',
				roles: ['Admin', 'Registrar', 'Chairperson']
			}
		]
	},
	{
		title: 'Academics',
		url: '/menu/academics',
		icon: 'School',
		description: 'Configure academic offerings and assignments.',
		roles: ['Admin', 'Dean', 'Registrar', 'Chairperson'],
		items: [
			{
				title: 'Class Offerings',
				url: '/menu/academics/offerings',
				icon: 'BookOpen',
				description: 'Manage course offerings, schedules, and split lectures.',
				roles: ['Admin', 'Dean', 'Registrar', 'Chairperson']
			},
			{
				title: 'Resource Assignments',
				url: '/menu/academics/assignments',
				icon: 'Users',
				description:
					'Assign faculty, rooms, and lecture splitting to classes and manage teaching loads.',
				roles: ['Admin', 'Dean', 'Chairperson']
			}
		]
	},

	{
		title: 'Timetables',
		url: '/menu/timetables',
		icon: 'CalendarDays',
		description: 'Generate and manage class schedules.',
		roles: ['Admin', 'Dean', 'Registrar', 'Chairperson'],
		items: [
			// {
			// 	title: 'Master Scheduler',
			// 	url: '/menu/timetables/scheduler',
			// 	icon: 'Calendar',
			// 	description: 'Interactive drag-and-drop interface for manual scheduling.',
			// 	roles: ['Admin', 'Dean', 'Registrar', 'Chairperson']
			// },
			{
				title: 'Generate Schedules',
				url: '/menu/timetables/generate',
				icon: 'Wand',
				description: 'Automated schedule generation using advanced algorithms.',
				roles: ['Admin', 'Dean', 'Registrar', 'Chairperson']
			},
			{
				title: 'View Schedules',
				url: '/menu/timetables/view',
				icon: 'Eye',
				description: 'Browse and print generated timetables.',
				roles: ['Admin', 'Dean', 'Registrar', 'Chairperson']
			}
		]
	},
	{
		title: 'Admin Console',
		url: '/menu/admin',
		icon: 'SquareTerminal',
		description: 'System administration and user management.',
		roles: ['Admin'],
		items: [
			{
				title: 'User Management',
				url: '/menu/admin/users',
				icon: 'UserCog',
				description: 'Manage system users, roles, and permissions.',
				roles: ['Admin']
			},
			{
				title: 'Programs',
				url: '/menu/admin/programs',
				icon: 'GraduationCap',
				description: 'Manage academic programs and colleges.',
				roles: ['Admin']
			}
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

export const load: LayoutServerLoad = async ({ locals, url }) => {
	if (!locals.session && !url.pathname.startsWith('/login')) {
		throw redirect(303, '/login');
	}
	let profile: { username: string; role: string; college_id: number } | null = null;

	const userRole = locals.profile?.role || null;
	const filteredNav = filterNavByRole(ALL_NAV_ITEMS_DATA, userRole);

	// Pass the data (which now includes the profile from the root hook) to the client.
	return {
		session: locals.session,
		user: locals.user,
		profile: locals.profile,
		navItems: filteredNav
	};
};
//

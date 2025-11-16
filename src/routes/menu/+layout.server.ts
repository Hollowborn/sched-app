import type { LayoutServerLoad } from './$types';
import type { NavItem } from '../../nav';
import { fail, redirect } from '@sveltejs/kit';
// import type { Actions } from '@sveltejs/kit';

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
			},
			{
				title: 'Dash-bro?',
				url: '/menu/dashboard',
				roles: ['Admin', 'Dean', 'Registrar']
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
				title: 'Generate Schedules',
				url: '/menu/timetables/generate',
				roles: ['Admin', 'Dean', 'Registrar'] // Eventually, a 'public' role can be added here
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
// export const actions: Actions = {
// 	/**

// 	updateProfile: async ({ request, locals }) => {
// 		const { user, supabase } = locals;
// 		if (!user) {
// 			return fail(401, { message: 'You must be logged in to update your profile.' });
// 		}

// 		const formData = await request.formData();
// 		const username = formData.get('username')?.toString().trim();

// 		if (!username) {
// 			return fail(400, { message: 'Username cannot be empty.' });
// 		}

// 		// Update the 'username' in the public.users table
// 		const { error } = await supabase.from('users').update({ username }).eq('id', user.id);

// 		if (error) {
// 			console.error('Error updating profile:', error);
// 			return fail(500, { message: 'Failed to update profile. Please try again.' });
// 		}

// 		return { message: 'Profile updated successfully.' };
// 	},

// 	/**

// 	updatePassword: async ({ request, locals }) => {
// 		const { supabase } = locals;
// 		if (!supabase) {
// 			return fail(401, { message: 'You must be logged in to update your password.' });
// 		}

// 		const formData = await request.formData();
// 		const newPassword = formData.get('newPassword')?.toString();
// 		const confirmPassword = formData.get('confirmPassword')?.toString();

// 		if (!newPassword || !confirmPassword) {
// 			return fail(400, { message: 'Both password fields are required.' });
// 		}
// 		if (newPassword.length < 8) {
// 			return fail(400, { message: 'Password must be at least 8 characters long.' });
// 		}
// 		if (newPassword !== confirmPassword) {
// 			return fail(400, { message: 'Passwords do not match.' });
// 		}

// 		// Update the password in Supabase Auth
// 		const { error } = await locals.supabase.auth.updateUser({ password: newPassword });

// 		if (error) {
// 			console.error('Error updating password:', error);
// 			return fail(500, { message: error.message || 'Failed to update password.' });
// 		}

// 		return { message: 'Password updated successfully. You may be signed out.' };
// 	}
// };

import { fail, error } from '@sveltejs/kit';
import type { PageServerLoad, Actions } from './$types';
import { supabaseAdmin } from '$lib/supabaseClients'; // Use the admin client for elevated privileges

// --- LOAD FUNCTION ---
export const load: PageServerLoad = async ({ locals }) => {
	// Security: This is a highly sensitive page, lock it down to Admins only.
	if (locals.profile?.role !== 'Admin') {
		throw error(403, 'Forbidden: You do not have permission to manage users.');
	}

	if (!supabaseAdmin) {
		throw error(500, 'Admin client is not configured. Cannot manage users.');
	}

	// Fetch all users from both Supabase Auth and our public users table
	const [
		{ data: authUsers, error: authUsersError },
		{ data: userProfiles, error: userProfilesError },
		{ data: colleges, error: collegesError }
	] = await Promise.all([
		supabaseAdmin.auth.admin.listUsers(),
		locals.supabase.from('users').select('*, colleges(college_name)'),
		locals.supabase.from('colleges').select('*')
	]);

	if (authUsersError || userProfilesError || collegesError) {
		console.error(
			'Error fetching user data:',
			authUsersError || userProfilesError || collegesError
		);
		throw error(500, 'Failed to load user management data.');
	}

	// Combine the auth user data (like last_sign_in_at) with our profile data (role, username)
	const combinedUsers = authUsers.users.map((authUser) => {
		const profile = userProfiles.find((p) => p.id === authUser.id);
		return {
			...authUser, // Includes id, email, last_sign_in_at, etc.
			username: profile?.username || 'N/A',
			role: profile?.role || 'Unknown',
			college_id: profile?.college_id,
			colleges: profile?.colleges,
			status: authUser.banned_until ? 'disabled' : 'active'
		};
	});

	// Calculate stats for the dashboard cards
	const totalUsers = combinedUsers.length;
	const roleCounts = combinedUsers.reduce(
		(acc, user) => {
			if (user.role === 'Admin') acc.admins++;
			else if (user.role === 'Dean') acc.deans++;
			else if (user.role === 'Registrar') acc.registrars++;
			return acc;
		},
		{ admins: 0, deans: 0, registrars: 0 }
	);

	return {
		users: combinedUsers,
		colleges: colleges || [],
		stats: { total: totalUsers, ...roleCounts },
		profile: locals.profile
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	// Action to create a new user (auth + profile)
	createUser: async ({ request }) => {
		// ... (logic from your old create user page, adapted slightly)
	},

	// Action to update a user's profile (role, college, etc.)
	updateUser: async ({ request, locals }) => {
		// ...
	},

	// Action to toggle a user's account status (enable/disable)
	updateUserStatus: async ({ request }) => {
		if (!supabaseAdmin) return fail(500, { message: 'Admin client not configured.' });
		const formData = await request.formData();
		const userId = formData.get('id')?.toString();
		const currentStatus = formData.get('status')?.toString();

		if (!userId) return fail(400, { message: 'User ID is required.' });

		const shouldDisable = currentStatus === 'active';
		const { error: updateError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
			ban_duration: shouldDisable ? '3650d' : 'none' // Effectively permanent ban or no ban
		});

		if (updateError) {
			return fail(500, { message: `Failed to ${shouldDisable ? 'disable' : 'enable'} user.` });
		}

		return { message: `User successfully ${shouldDisable ? 'disabled' : 'enabled'}.` };
	},

	// Action to send a password reset link
	sendPasswordReset: async ({ request }) => {
		if (!supabaseAdmin) return fail(500, { message: 'Admin client not configured.' });
		const formData = await request.formData();
		const email = formData.get('email')?.toString();

		if (!email) return fail(400, { message: 'Email is required.' });

		const { error: resetError } = await supabaseAdmin.auth.admin.generateLink({
			type: 'recovery',
			email: email
		});

		if (resetError) {
			return fail(500, { message: 'Failed to generate password reset link.' });
		}

		return { message: 'Password reset link sent successfully.' };
	},

	// Action to permanently delete a user
	deleteUser: async ({ request }) => {
		if (!supabaseAdmin) return fail(500, { message: 'Admin client not configured.' });
		const formData = await request.formData();
		const id = formData.get('id')?.toString();

		if (!id) return fail(400, { message: 'Invalid user ID.' });

		const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(id);

		if (deleteError) {
			return fail(500, { message: 'Failed to delete user.' });
		}

		return { message: 'User permanently deleted.' };
	}
};

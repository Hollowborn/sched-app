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
		{ data: authUsersData, error: authUsersError },
		{ data: userProfiles, error: userProfilesError },
		{ data: colleges, error: collegesError },
		{ data: programs, error: programsError }
	] = await Promise.all([
		supabaseAdmin.auth.admin.listUsers(),
		locals.supabase.from('users').select('*, colleges(college_name), programs(program_name)'),
		locals.supabase.from('colleges').select('*'),
		locals.supabase.from('programs').select('*')
	]);

	if (authUsersError || userProfilesError || collegesError || programsError) {
		console.error(
			'Error fetching user data:',
			authUsersError || userProfilesError || collegesError || programsError
		);
		throw error(500, 'Failed to load user management data.');
	}

	// Combine the auth user data (like last_sign_in_at) with our profile data (role, username)
	const combinedUsers = authUsersData.users.map((authUser) => {
		const profile = userProfiles.find((p) => p.id === authUser.id);
		return {
			...authUser, // Includes id, email, last_sign_in_at, etc.
			username: profile?.username || 'N/A',
			role: profile?.role || 'Unknown',
			college_id: profile?.college_id,
			program_id: profile?.program_id,
			colleges: profile?.colleges,
			programs: profile?.programs,
			status: authUser.banned_until ? 'disabled' : 'active'
		};
	});

	// Calculate stats for the dashboard cards
	const roleCounts = combinedUsers.reduce(
		(acc, user) => {
			if (user.role === 'Admin') acc.admins++;
			else if (user.role === 'Dean') acc.deans++;
			else if (user.role === 'Registrar') acc.registrars++;
			else if (user.role === 'Chairperson') acc.chairpersons++;
			return acc;
		},
		{ admins: 0, deans: 0, registrars: 0, chairpersons: 0 }
	);

	return {
		users: combinedUsers,
		colleges: colleges || [],
		programs: programs || [],
		stats: { ...roleCounts },
		profile: locals.profile,
		validRoles: ['Admin', 'Dean', 'Registrar', 'Chairperson']
	};
};

// --- ACTIONS ---
export const actions: Actions = {
	createUser: async ({ request }) => {
		if (!supabaseAdmin) return fail(500, { message: 'Admin client not configured.' });

		const formData = await request.formData();
		const email = formData.get('email')?.toString().trim();
		const password = formData.get('password')?.toString();
		const username = formData.get('username')?.toString().trim();
		const role = formData.get('role')?.toString();
		const college_id_str = formData.get('college_id')?.toString();
		const college_id = college_id_str ? Number(college_id_str) : null;
		const program_id_str = formData.get('program_id')?.toString();
		const program_id = program_id_str ? Number(program_id_str) : null;

		if (!email || !password || !username || !role) {
			return fail(400, { message: 'Email, password, username, and role are required.' });
		}
		if (password.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters long.' });
		}

		let newAuthUser = null;
		try {
			// Step 1: Create the user in Supabase Auth
			const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
				email,
				password,
				email_confirm: true // Auto-confirm email
			});

			if (authError) throw new Error(authError.message);
			newAuthUser = authData.user;

			// Step 2: Create the corresponding profile in the public.users table
			const { error: profileError } = await supabaseAdmin.from('users').insert({
				id: newAuthUser.id,
				username,
				role,
				college_id,
				program_id,
				email
			});

			if (profileError) throw new Error(profileError.message);

			return { message: 'User created successfully.' };
		} catch (err: any) {
			// Rollback: If profile creation fails, delete the auth user
			if (newAuthUser) {
				await supabaseAdmin.auth.admin.deleteUser(newAuthUser.id);
			}
			console.error('Create user error:', err.message);
			return fail(500, { message: err.message || 'Failed to create user.' });
		}
	},

	updateUser: async ({ request }) => {
		if (!supabaseAdmin) return fail(500, { message: 'Admin client not configured.' });

		const formData = await request.formData();
		const id = formData.get('id')?.toString();
		const username = formData.get('username')?.toString().trim();
		const role = formData.get('role')?.toString();
		const college_id_str = formData.get('college_id')?.toString();
		const college_id = college_id_str ? Number(college_id_str) : null;
		const program_id_str = formData.get('program_id')?.toString();
		const program_id = program_id_str ? Number(program_id_str) : null;

		if (!id || !username || !role) {
			return fail(400, { message: 'User ID, username, and role are required.' });
		}

		// Update public.users profile
		const { error: profileError } = await supabaseAdmin
			.from('users')
			.update({ username, role, college_id, program_id })
			.eq('id', id);

		if (profileError) {
			console.error('Update user error:', profileError);
			return fail(500, { message: 'Failed to update user profile.' });
		}

		return { message: 'User updated successfully.' };
	},

	updateUserStatus: async ({ request, locals }) => {
		if (locals.profile?.role !== 'Admin') {
			return fail(403, { message: 'Forbidden: You do not have permission to modify user status.' });
		}
		if (!supabaseAdmin) return fail(500, { message: 'Admin client not configured.' });

		const formData = await request.formData();
		const userId = formData.get('id')?.toString();
		const currentStatus = formData.get('status')?.toString();

		if (!userId) {
			return fail(400, { message: 'User ID is required.' });
		}

		const shouldDisable = currentStatus === 'active';
		const newStatus = shouldDisable ? 'disabled' : 'active';

		// --- THE FIX IS HERE ---

		// Step 1: Update the Supabase Auth user to actually ban/unban them.
		const { error: authError } = await supabaseAdmin.auth.admin.updateUserById(userId, {
			ban_duration: shouldDisable ? '3650d' : 'none' // Effectively permanent ban or no ban
		});

		if (authError) {
			// Add detailed logging so you can see the actual error from Supabase in your server console.
			console.error('Supabase Auth update error:', authError);
			return fail(500, { message: `Failed to ${newStatus} user in authentication system.` });
		}

		// Step 2: Update the 'status' column in your public.users table to match.
		const { error: profileError } = await locals.supabase
			.from('users')
			.update({ status: newStatus })
			.eq('id', userId);

		if (profileError) {
			// If this fails, you have an inconsistency. It's a server error.
			console.error('Error updating user profile status:', profileError);
			// You could attempt to roll back the auth change here, but for now, logging is key.
			return fail(500, { message: 'Failed to update user profile status.' });
		}

		return { message: `User successfully ${newStatus}.` };
	},

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

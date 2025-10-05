import { fail } from '@sveltejs/kit';
import { supabase, supabaseAdmin } from '$lib/supabaseClients';
import { validRoles } from '$lib/schemas';

// --- Types for cleaner server-side error handling (Using 'type' for TypeScript) ---
export type FormErrors = {
	email?: string;
	username?: string;
	password?: string;
	role?: string;
	college_id?: string;
};

// --- Loader Function (fetches required data for the form) ---
export const load = async ({ locals }) => {
	// Note: The structure of this loader is simplified to match the context of the user's request,
	// assuming 'colleges' and 'validRoles' are required.
	const { data: colleges, error: collegesError } = await supabase
		.from('colleges')
		.select('id, college_name');

	if (collegesError) {
		console.error('Failed to load colleges:', collegesError);
		return {
			colleges: [],
			roles: validRoles,
			globalError: 'Failed to load college data. Check logs.'
		};
	}

	return {
		colleges: colleges.map((c) => ({ id: c.id, name: c.college_name })),
		roles: validRoles
	};
};

// --- Form Action (handles submission) ---
export const actions = {
	createUser: async ({ request }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() || '';
		const username = formData.get('username')?.toString() || '';
		const password = formData.get('password')?.toString() || '';
		const role = formData.get('role')?.toString() || '';
		const college_id_str = formData.get('college_id')?.toString() || '';
		const college_id = parseInt(college_id_str, 10);

		let formErrors: FormErrors = {};
		let hasErrors = false;

		// --- 1. Manual Validation ---
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			formErrors.email = 'Must be a valid email address.';
			hasErrors = true;
		}
		if (username.length < 3) {
			formErrors.username = 'Username must be at least 3 characters long.';
			hasErrors = true;
		}
		// Password validation can be more complex, but 8 characters is a good minimum.
		if (password.length < 8) {
			formErrors.password = 'Password must be at least 8 characters long.';
			hasErrors = true;
		}
		if (!validRoles.includes(role)) {
			formErrors.role = 'Invalid role selected.';
			hasErrors = true;
		}
		if (isNaN(college_id) || college_id < 1) {
			formErrors.college_id = 'Please select a college.';
			hasErrors = true;
		}

		if (hasErrors) {
			// Return errors and the submitted data back to the client
			return fail(400, {
				formErrors,
				data: { email, username, role, college_id: college_id_str },
				message: 'Please correct the errors in the form.'
			});
		}

		// --- Supabase Admin Logic ---
		if (!supabaseAdmin) {
			return fail(500, { message: 'Admin client is not configured. Cannot create user.' });
		}

		let authId = null;

		try {
			// 2. Create the Auth user (Supabase Auth Admin)
			const { data: authData, error: authError } = await supabaseAdmin.auth.admin.createUser({
				email: email,
				password: password,
				email_confirm: true
			});

			if (authError) {
				console.error('Supabase Auth User Creation Error:', authError.message);
				return fail(400, {
					message: authError.message,
					data: { email, username, role, college_id: college_id_str }
				});
			}

			authId = authData.user.id;

			// 3. Create the linked profile entry in the 'users' table
			const { error: profileError } = await supabaseAdmin.from('users').insert({
				id: authId, // Link Auth ID to Profile ID
				username: username,
				role: role,
				college_id: college_id
			});

			if (profileError) {
				console.error('Profile Creation Error:', profileError);
				// Rollback: Delete the Auth user if profile creation fails
				await supabaseAdmin.auth.admin.deleteUser(authId);
				return fail(500, {
					message: 'Failed to link user profile to database. Transaction rolled back.'
				});
			}

			// Success! Return success state and message.
			return {
				status: 201, // Created
				success: true,
				message: `User ${username} created successfully!`,
				// Clear the data object to reset the form on success
				data: { email: '', username: '', role: '', college_id: '' }
			};
		} catch (e) {
			console.error('Unexpected error during user creation:', e);
			if (authId) {
				await supabaseAdmin.auth.admin.deleteUser(authId);
			}
			return fail(500, { message: 'An unexpected server error occurred.' });
		}
	}
};

import { fail, json } from '@sveltejs/kit';
import type { RequestHandler } from './$types';

// This file hosts server-side actions for components in the layout (like the settings modal).

export const actions = {
	/**
	 * Updates the user's public profile (e.g., username).
	 */
	updateProfile: async ({ request, locals }) => {
		const { user, supabase } = locals;
		if (!user) {
			return fail(401, { message: 'You must be logged in to update your profile.' });
		}

		const formData = await request.formData();
		const username = formData.get('username')?.toString().trim();

		if (!username) {
			return fail(400, { message: 'Username cannot be empty.' });
		}

		// Update the 'username' in the public.users table
		const { error } = await supabase.from('users').update({ username }).eq('id', user.id);

		if (error) {
			console.error('Error updating profile:', error);
			return fail(500, { message: 'Failed to update profile. Please try again.' });
		}

		return { message: 'Profile updated successfully.' };
	},

	/**
	 * Updates the user's authentication password.
	 */
	updatePassword: async ({ request, locals }) => {
		const { supabase } = locals;
		if (!supabase) {
			return fail(401, { message: 'You must be logged in to update your password.' });
		}

		const formData = await request.formData();
		const newPassword = formData.get('newPassword')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		if (!newPassword || !confirmPassword) {
			return fail(400, { message: 'Both password fields are required.' });
		}
		if (newPassword.length < 8) {
			return fail(400, { message: 'Password must be at least 8 characters long.' });
		}
		if (newPassword !== confirmPassword) {
			return fail(400, { message: 'Passwords do not match.' });
		}

		// Update the password in Supabase Auth
		const { error } = await locals.supabase.auth.updateUser({ password: newPassword });

		if (error) {
			console.error('Error updating password:', error);
			return fail(500, { message: error.message || 'Failed to update password.' });
		}

		return { message: 'Password updated successfully. You may be signed out.' };
	}
};

import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

export const load: PageServerLoad = async ({ locals, url }) => {
	const session = locals.session;

	// The password reset flow sets a temporary session after the user clicks the link.
	// If no session exists, the link was invalid or expired.
	if (!session) {
		// We can't show a toast here, so we redirect with an error query param.
		// A more robust solution might use flash messages.
		throw redirect(303, '/forgot-password?error=invalid_token');
	}

	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const { request, locals } = event;
		const formData = await request.formData();
		const password = formData.get('password')?.toString();
		const confirmPassword = formData.get('confirmPassword')?.toString();

		const formErrors = {
			password: '',
			confirmPassword: ''
		};

		if (!password || password.length < 8) {
			formErrors.password = 'Password must be at least 8 characters long.';
		}

		if (password !== confirmPassword) {
			formErrors.confirmPassword = 'Passwords do not match.';
		}

		if (formErrors.password || formErrors.confirmPassword) {
			return fail(400, { formErrors });
		}

		// The user is authenticated at this point via the token in the URL,
		// which the Supabase client handles to create a temporary session.
		const { error } = await locals.supabase.auth.updateUser({
			password: password
		});

		if (error) {
			if (error.message.includes('expired')) {
				return fail(401, {
					formErrors,
					message: 'Your password reset token has expired. Please request a new one.'
				});
			}
			return fail(500, { formErrors, message: 'Failed to update password. Please try again.' });
		}

		// On success, sign the user out of the temporary session
		// and redirect them to the login page with a success message.
		await locals.supabase.auth.signOut();

		throw redirect(303, '/login?passwordUpdated=true');
	}
};

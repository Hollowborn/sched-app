import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types.js';

// The load function is no longer needed to initialize a form with superforms.
// It can be removed if no other server-side data is needed for the page.
export const load: PageServerLoad = async () => {
	return {};
};

export const actions: Actions = {
	default: async (event) => {
		const formData = await event.request.formData();
		const email = formData.get('email')?.toString();

		const formErrors = {
			email: ''
		};

		if (!email || !/^\S+@\S+\.\S+$/.test(email)) {
			formErrors.email = 'Please enter a valid email address.';
			return fail(400, { email, formErrors });
		}

		const { error: authError } = await event.locals.supabase.auth.resetPasswordForEmail(email, {
			redirectTo: `${event.url.origin}/update-password`
		});

		if (authError) {
			console.error('Supabase password reset error:', authError);
			// Do not reveal if an email is in the system.
			// Return a generic failure to the client to show an error toast.
			return fail(500, {
				email,
				message: 'An internal error occurred. Please try again later.'
			});
		}

		// Always return a success message to prevent email enumeration.
		return { success: true, message: 'Password reset link sent!' };
	}
};

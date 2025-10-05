import { fail, redirect } from '@sveltejs/kit';

// --- Form Action: Handle User Sign-In ---
export const actions = {
	// Use 'default' action name for the main login form submission
	default: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() || '';
		const password = formData.get('password')?.toString() || '';

		// --- 1. Manual Validation ---
		if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
			return fail(400, {
				email,
				message: 'Please enter a valid email address.',
				formErrors: { email: 'Must be a valid email address.' }
			});
		}
		if (!password) {
			return fail(400, {
				email,
				message: 'Password cannot be empty.',
				formErrors: { password: 'Password is required.' }
			});
		}

		try {
			// 2. Sign in with Supabase
			// 'locals.supabase' is typically the Supabase client configured to handle cookies
			const { error } = await locals.supabase.auth.signInWithPassword({
				email,
				password
			});

			if (error) {
				console.error('Supabase Sign-In Error:', error.message);
				return fail(400, {
					email,
					message: 'Invalid login credentials.', // Generic message for security
					formErrors: {}
				});
			}

			// 3. Redirect on success (to the protected main menu)
			throw redirect(303, '/menu');
		} catch (e) {
			// Re-throw SvelteKit redirect exceptions
			if (e instanceof Error && e.name === 'Redirect') {
				throw e;
			}
			console.error('Unexpected login error:', e);
			return fail(500, { message: 'An unexpected server error occurred during login.' });
		}
	}
};

// --- Loader: Redirect authenticated users away from the login page ---
export const load = async ({ locals }) => {
	// Check if a session already exists (meaning the user is logged in)
	const {
		data: { session }
	} = await locals.supabase.auth.getSession();

	if (session) {
		// User is already logged in, send them to the main menu
		throw redirect(303, '/menu');
	}

	return {};
};

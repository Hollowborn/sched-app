import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const actions: Actions = {
	login: async ({ request, locals }) => {
		const formData = await request.formData();
		const email = formData.get('email')?.toString() || '';
		const password = formData.get('password')?.toString() || '';

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

		// Simplified and corrected logic without the unnecessary try...catch
		const { error } = await locals.supabase.auth.signInWithPassword({
			email,
			password
		});

		if (error) {
			console.error('Supabase Sign-In Error:', error.message);
			return fail(400, {
				email,
				message: 'Invalid login credentials.',
				formErrors: {}
			});
		}

		// If there's no error, SvelteKit will handle this redirect correctly.
		throw redirect(303, '/menu/dashboard');
	}
};

export const load: PageServerLoad = async ({ locals, url }) => {
	const {
		data: { session }
	} = await locals.supabase.auth.getSession();

	if (session) {
		throw redirect(303, '/menu/dashboard');
	}

	return { url };
};

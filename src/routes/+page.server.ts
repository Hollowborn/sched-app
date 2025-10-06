import { redirect } from '@sveltejs/kit';

export const load = async ({ locals }) => {
	// Check for an active session (adjust if you use a different session method)
	const {
		data: { session }
	} = await locals.supabase.auth.getSession();

	// Redirect based on session
	if (session) {
		throw redirect(303, '/menu'); // or your desired authenticated page
	} else {
		throw redirect(303, '/login'); // or your desired public page
	}
};

import type { PageServerLoad } from './$types';

export const load: PageServerLoad = async ({ locals }) => {
	// The user is guaranteed to be logged in here due to the +layout.server.ts protection.
	// 'locals.user' contains the basic Auth user data (UUID, email, etc.)

	// We can now fetch the custom profile data (role, username, college_id) from the 'users' table
	const { data: profile, error } = await locals.supabase
		.from('users')
		.select('username, role, college_id')
		.eq('id', locals.user.id)
		.single();

	if (error) {
		console.error('Failed to fetch user profile:', error);
		// Note: A 500 error is appropriate here since a logged-in user should always have a profile.
		return { profile: { username: 'Unknown User', role: 'guest' } };
	}

	return {
		profile
	};
};

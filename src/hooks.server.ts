import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

/**
 * First hook: Initializes Supabase client.
 */
const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * Helper to get a validated session.
	 */
	event.locals.safeGetSession = async () => {
		const {
			data: { session }
		} = await event.locals.supabase.auth.getSession();
		if (!session) {
			return { session: null, user: null };
		}

		const {
			data: { user },
			error
		} = await event.locals.supabase.auth.getUser();
		if (error) {
			return { session: null, user: null };
		}

		return { session, user };
	};

	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

/**
 * Second hook: Populates user, session, and profile into locals.
 */
const auth: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	// --- NEWLY ADDED PROFILE LOGIC ---
	// If the user is authenticated, fetch their profile from the database.
	if (user) {
		const { data: profile } = await event.locals.supabase
			.from('users')
			.select('username, role, college_id')
			.eq('id', user.id)
			.single();

		// Add the profile to locals. It will be `null` if no profile is found.
		event.locals.profile = profile;
	} else {
		// Ensure profile is null if there is no user
		event.locals.profile = null;
	}

	return resolve(event);
};

export const handle: Handle = sequence(supabase, auth);

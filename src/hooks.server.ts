import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';
import { createServerClient } from '@supabase/ssr';
import { sequence } from '@sveltejs/kit/hooks';
import type { Handle } from '@sveltejs/kit';

/**
 * First hook in the sequence: Initializes Supabase client.
 * This function creates a new Supabase client for each server request,
 * ensuring that the authentication context is not shared between users.
 */
const supabase: Handle = async ({ event, resolve }) => {
	event.locals.supabase = createServerClient(PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY, {
		cookies: {
			getAll: () => event.cookies.getAll(),
			// SvelteKit's cookies API requires `path` to be explicitly set.
			// Setting `path` to `/` makes the cookie available across the entire site.
			setAll: (cookiesToSet) => {
				cookiesToSet.forEach(({ name, value, options }) => {
					event.cookies.set(name, value, { ...options, path: '/' });
				});
			}
		}
	});

	/**
	 * A helper function to safely get the session and user data.
	 * `getSession()` alone just reads the cookie, while `getUser()` validates the JWT.
	 * This helper combines both for robust authentication checks.
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
			// The JWT is invalid or expired.
			return { session: null, user: null };
		}

		return { session, user };
	};

	// Continue processing the request, but filter headers to allow Supabase to work correctly.
	return resolve(event, {
		filterSerializedResponseHeaders(name) {
			return name === 'content-range' || name === 'x-supabase-api-version';
		}
	});
};

/**
 * Second hook in the sequence: Populates session data into locals.
 * This makes `event.locals.session` and `event.locals.user` available
 * in all subsequent server functions (`+page.server.ts`, `+layout.server.ts`, etc.).
 */
const auth: Handle = async ({ event, resolve }) => {
	const { session, user } = await event.locals.safeGetSession();
	event.locals.session = session;
	event.locals.user = user;

	return resolve(event);
};

// The `sequence` helper runs our hooks in the specified order.
export const handle: Handle = sequence(supabase, auth);

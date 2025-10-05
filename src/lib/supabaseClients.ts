import { createClient } from '@supabase/supabase-js';
import {
	PUBLIC_SUPABASE_URL,
	PUBLIC_SUPABASE_ANON_KEY,
	PUBLIC_SUPABASE_PUBLISHABLE_KEY
} from '$env/static/public';
import { env } from '$env/dynamic/private';

const supabaseUrl = PUBLIC_SUPABASE_URL;
const supabaseKey = PUBLIC_SUPABASE_ANON_KEY;
const supabasePubKey = PUBLIC_SUPABASE_PUBLISHABLE_KEY;

const SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

// Standard client (safe for client/server)
const supabase = createClient(supabaseUrl, supabaseKey);

// Admin client (server-only, throws if key is missing)
let supabaseAdmin: ReturnType<typeof createClient> | undefined = undefined;
if (SERVICE_ROLE_KEY) {
	supabaseAdmin = createClient(supabaseUrl, SERVICE_ROLE_KEY, {
		auth: { persistSession: false }
	});
}

export { supabase, supabaseAdmin };

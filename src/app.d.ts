import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './database.types.ts'; // import generated types

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
			profile: { username: string; role: string } | null;
		}
		interface PageData {
			session: Session | null;
			user: User | null;
			// The profile contains the role fetched from the DB
			profile: { username: string; role: string } | null;
			// The filtered navigation items
			navItems: NavItem[];
		}
		// interface PageState {}
		// interface Platform {}
	}
}

export {};

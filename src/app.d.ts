import type { Session, SupabaseClient, User } from '@supabase/supabase-js';
import type { Database } from './database.types.ts'; // import generated types

interface NavItem {
	title: string;
	url: string;
	icon?: string; // Using string to represent the icon name (e.g., 'SquareTerminal')
	roles: string[]; // List of roles permitted to see this item
	items?: NavItem[]; // Optional submenu items (recursively NavItem structure)
}

declare global {
	namespace App {
		// interface Error {}
		interface Locals {
			supabase: SupabaseClient<Database>;
			safeGetSession: () => Promise<{ session: Session | null; user: User | null }>;
			session: Session | null;
			user: User | null;
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

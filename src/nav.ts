export interface NavItem {
	title: string;
	url: string;
	icon?: string; // Using string to represent the icon name (e.g., 'SquareTerminal')
	description?: string; // Short description for navigation hubs
	roles: string[]; // List of roles permitted to see this item
	items?: NavItem[]; // Optional submenu items (recursively NavItem structure)
}

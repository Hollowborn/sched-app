export interface NavItem {
	title: string;
	url: string;
	icon?: string; // Using string to represent the icon name (e.g., 'SquareTerminal')
	roles: string[]; // List of roles permitted to see this item
	items?: NavItem[]; // Optional submenu items (recursively NavItem structure)
}

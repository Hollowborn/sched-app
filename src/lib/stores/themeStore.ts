import { browser } from '$app/environment';
import { writable } from 'svelte/store';

// We manage custom color themes (e.g. default, oklch) separate from mode-watcher's dark mode.
const initialTheme = browser ? window.localStorage.getItem('app-theme') || 'default' : 'default';

export const appTheme = writable<string>(initialTheme);

if (browser) {
	appTheme.subscribe((value) => {
		window.localStorage.setItem('app-theme', value);
		if (value === 'default') {
			document.documentElement.removeAttribute('data-theme');
		} else {
			document.documentElement.setAttribute('data-theme', value);
		}
	});
}

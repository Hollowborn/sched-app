import { writable } from 'svelte/store';

// A simple store to control the settings modal.
// Any component can import this and call .set(true) to open it.
export const settingsModalOpen = writable(false);

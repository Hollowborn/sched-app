// src/lib/actions/viewport.ts

import type { Action } from 'svelte/action';

interface ViewportOptions {
	once?: boolean;
	margin?: string;
	threshold?: number;
}

/**
 * Svelte Action to detect when an element enters or leaves the viewport.
 * Dispatches `enterViewport` and `exitViewport` custom events.
 *
 * @param {HTMLElement} node - The element to observe.
 * @param {ViewportOptions} options - Configuration for the IntersectionObserver.
 */
export const viewport: Action<HTMLElement, ViewportOptions | undefined> = (node, options) => {
	let observer: IntersectionObserver;

	const handleIntersect = (entries: IntersectionObserverEntry[]) => {
		entries.forEach((entry) => {
			if (entry.isIntersecting) {
				node.dispatchEvent(new CustomEvent('enterViewport'));
				if (options?.once) {
					observer.unobserve(node);
				}
			} else {
				node.dispatchEvent(new CustomEvent('exitViewport'));
			}
		});
	};

	const createObserver = () => {
		const observerOptions = {
			rootMargin: options?.margin ?? '0px',
			threshold: options?.threshold ?? 0.1
		};
		observer = new IntersectionObserver(handleIntersect, observerOptions);
		observer.observe(node);
	};

	createObserver();

	return {
		destroy() {
			observer.unobserve(node);
		}
	};
};

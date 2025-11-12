// src/lib/actions/animate-in-view.ts
import { viewport } from './viewport';
import type { Action } from 'svelte/action';

interface AnimateInViewOptions {
	stagger?: number; // ms delay between each element
	selector?: string;
}

/**
 * Svelte Action to apply staggered entrance animations to child elements
 * when the parent container scrolls into view.
 *
 * @param {HTMLElement} node - The parent container element.
 * @param {AnimateInViewOptions} options - Configuration for the animation.
 */
export const animateInView: Action<HTMLElement, AnimateInViewOptions | undefined> = (
	node,
	options
) => {
	const stagger = options?.stagger ?? 75; // Default stagger delay of 75ms
	const selector = options?.selector ?? '[data-animate]';

	const elements = node.querySelectorAll<HTMLElement>(selector);
	if (elements.length === 0) {
		// If no children to animate, apply to the node itself
		node.dataset.animate = ''; // Ensure it has the data attribute
	}

	const viewportAction = viewport(node, { once: true, threshold: 0.2 });

	node.addEventListener('enterViewport', () => {
		const targetElements =
			elements.length > 0 ? Array.from(elements) : [node];

		targetElements.forEach((el, i) => {
			el.style.setProperty('--stagger-delay', `${i * stagger}ms`);
			el.classList.add('is-visible');
		});
	});

	return {
		destroy() {
			viewportAction.destroy?.();
		}
	};
};

interface ShimmerOptions {
	duration?: number;
	delay?: number;
	opacity?: number;
}

export function shimmer(node: HTMLElement, options: ShimmerOptions = {}) {
	const { duration = 2000, delay = 0, opacity = 0.3 } = options;

	const shimmerDiv = document.createElement('div');
	shimmerDiv.style.position = 'absolute';
	shimmerDiv.style.top = '0';
	shimmerDiv.style.left = '0';
	shimmerDiv.style.width = '100%';
	shimmerDiv.style.height = '100%';
	shimmerDiv.style.background = `linear-gradient(
        90deg,
        transparent 0%,
        rgba(255, 255, 255, ${opacity}) 50%,
        transparent 100%
    )`;
	shimmerDiv.style.transform = 'translateX(-100%)';
	shimmerDiv.style.animation = `shimmer ${duration}ms ${delay}ms infinite`;

	// Add shimmer keyframes if they don't exist
	if (!document.querySelector('#shimmer-keyframes')) {
		const style = document.createElement('style');
		style.id = 'shimmer-keyframes';
		style.textContent = `
            @keyframes shimmer {
                0% {
                    transform: translateX(-100%);
                }
                100% {
                    transform: translateX(100%);
                }
            }
        `;
		document.head.appendChild(style);
	}

	// Ensure parent has position relative
	if (getComputedStyle(node).position === 'static') {
		node.style.position = 'relative';
	}
	node.style.overflow = 'hidden';
	node.appendChild(shimmerDiv);

	return {
		destroy() {
			shimmerDiv.remove();
		}
	};
}

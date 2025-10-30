// tailwind.config.js
/** @type {import('tailwindcss').Config} */
export default {
	theme: {
		extend: {
			animation: {
				shimmer: 'shimmer 1.5s linear infinite'
			},
			keyframes: {
				shimmer: {
					'0%': { transform: 'translateX(-100%)' },
					'100%': { transform: 'translateX(100%)' }
				}
			}
		}
	}
	// ... other config
};

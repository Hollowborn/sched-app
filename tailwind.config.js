/** @type {import('tailwindcss').Config} */
export default {
	content: [
		'./src/**/*.{html,svelte}',
		'./node_modules/layerchart/**/*.{svelte,js}' // <--- Add this
	],
	theme: {
		extend: {
			colors: {
				'chart-1': 'oklch(0.67 0.17 153.85)',
				'chart-2': 'oklch(0.5 0.1 270.06)',
				'chart-3': 'oklch(0.72 0.12 201.79)',
				'chart-4': 'oklch(0.8 0.1 100.65)',
				'chart-5': 'oklch(0.6 0.15 300.14)'
			},
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
};
module.exports = {
	content: [
		'./src/**/*.{html,svelte}',
		'./node_modules/layerchart/**/*.{svelte,js}' // <--- Add this
	]
};

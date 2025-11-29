<script lang="ts">
	import { scaleBand } from 'd3-scale';
	import { BarChart, type ChartContextValue } from 'layerchart';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cubicInOut } from 'svelte/easing';
	import { TrendingDown } from 'lucide-svelte';
	type WorkloadData = {
		name: string;
		value: number;
	};

	let { data } = $props<{ data: WorkloadData[] }>();

	const chartConfig = {
		desktop: { label: 'Desktop', color: 'var(--chart-1)' }
	} satisfies Chart.ChartConfig;

	const statistics = $derived.by(() => {
		// 1. Safely extract values (don't rely on array index order)
		const underload = data.find((d) => d.name === 'Under-loaded')?.value || 0;
		const optimal = data.find((d) => d.name === 'Optimal')?.value || 0;
		const overloaded = data.find((d) => d.name === 'Overloaded')?.value || 0;
		const total = underload + optimal + overloaded;

		// METHOD A: Percentage of Total (Standard Approach)
		// Formula: (Part / Whole) * 100
		const percentOfTotalUnder = total > 0 ? (underload / total) * 100 : 0;
		const percentOfTotalOptimal = total > 0 ? (optimal / total) * 100 : 0;
		const percentOfTotalOver = total > 0 ? (overloaded / total) * 100 : 0;

		// METHOD B: Lowest to Highest Ratio (Your specific request)
		// Formula: (Smallest / Largest) * 100
		const min = Math.min(underload, optimal, overloaded);
		const max = Math.max(underload, optimal, overloaded);
		const ratio = max > 0 ? (min / max) * 100 : 0;

		return {
			underload,
			optimal,
			overloaded,
			total,
			percentOfTotalUnder: percentOfTotalUnder.toFixed(1),
			percentOfTotalOptimal: percentOfTotalOptimal.toFixed(1),
			percentOfTotalOver: percentOfTotalOver.toFixed(1), // e.g., "11.1"
			ratio: ratio.toFixed(1) // e.g., "12.5"
		};
	});
	let context = $state<ChartContextValue>();
</script>

<Card.Root>
	<Card.Content>
		<Chart.Container config={chartConfig} class="h-72 w-full">
			<BarChart
				bind:context
				{data}
				xScale={scaleBand().padding(0.25)}
				x="name"
				y="value"
				axis="x"
				legend
				series={[{ label: 'Workload', color: 'var(--chart-1)', key: 'value' }]}
				props={{
					bars: {
						stroke: 'none',
						rounded: 'all',
						radius: 8,
						// use the height of the chart to animate the bars
						initialY: context?.height,
						initialHeight: 0,
						motion: {
							x: { type: 'tween', duration: 500, easing: cubicInOut },
							width: { type: 'tween', duration: 500, easing: cubicInOut },
							height: { type: 'tween', duration: 500, easing: cubicInOut },
							y: { type: 'tween', duration: 500, easing: cubicInOut }
						}
					},
					highlight: { area: { fill: 'none' } }
				}}
			>
				{#snippet tooltip()}
					<Chart.Tooltip hideLabel />
				{/snippet}
			</BarChart>
		</Chart.Container>
	</Card.Content>
	<Card.Footer>
		{#if statistics.total === 0}
			No instructors available.
		{:else if statistics.underload >= statistics.optimal && statistics.underload >= statistics.overloaded}
			{statistics.percentOfTotalUnder}% of instructors are under-loaded <TrendingDown
				class="ml-2 size-4"
			/>
		{:else}
			Only {statistics.percentOfTotalOptimal}% out of {statistics.total} instructors are optimally balanced.
		{/if}
	</Card.Footer>
</Card.Root>

<script lang="ts">
	import { scaleBand } from 'd3-scale';
	import { BarChart, type ChartContextValue } from 'layerchart';
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { cubicInOut } from 'svelte/easing';
	type WorkloadData = {
		name: string;
		value: number;
	};

	let { data } = $props<{ data: WorkloadData[] }>();

	const chartConfig = {
		desktop: { label: 'Desktop', color: 'var(--chart-1)' }
	} satisfies Chart.ChartConfig;

	let context = $state<ChartContextValue>();
</script>

<Chart.Container config={chartConfig} class="h-72 w-full">
	<BarChart
		bind:context
		{data}
		xScale={scaleBand().padding(0.25)}
		x="name"
		y="value"
		axis="x"
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

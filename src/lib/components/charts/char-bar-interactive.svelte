<script lang="ts">
	import TrendingUpIcon from '@lucide/svelte/icons/trending-up';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import { scaleUtc } from 'd3-scale';
	import { BarChart, type ChartContextValue, Highlight } from 'layerchart';
	import { cubicInOut } from 'svelte/easing';

	type WorkloadData = {
		name: string;
		value: number;
	};

	let { data } = $props<{ data: WorkloadData[] }>();
	const chartConfig = {
		views: { label: 'Page Views', color: '' },
		desktop: { label: 'Desktop', color: 'var(--chart-2)' },
		mobile: { label: 'Mobile', color: 'var(--chart-1)' }
	} satisfies Chart.ChartConfig;
	let context = $state<ChartContextValue>();

	let activeChart = $state<keyof typeof chartConfig>('desktop');

	const total = $derived({
		desktop: chartData.reduce((acc, curr) => acc + curr.desktop, 0),
		mobile: chartData.reduce((acc, curr) => acc + curr.mobile, 0)
	});

	const activeSeries = $derived([
		{
			key: activeChart,
			label: chartConfig[activeChart].label,
			color: chartConfig[activeChart].color
		}
	]);
</script>

<Card.Root>
	<Card.Header class="flex flex-col items-stretch space-y-0 border-b p-0 sm:flex-row">
		<div class="flex flex-1 flex-col justify-center gap-1 px-6 py-5 sm:py-6">
			<Card.Title>Bar Chart - Interactive</Card.Title>
			<Card.Description>Showing total visitors for the last 3 months</Card.Description>
		</div>
		<div class="flex">
			{#each ['desktop', 'mobile'] as key (key)}
				{@const chart = key as keyof typeof chartConfig}
				<button
					data-active={activeChart === chart}
					class="data-[active=true]:bg-muted/50 relative z-30 flex flex-1 flex-col justify-center gap-1 border-t px-6 py-4 text-start even:border-s sm:border-s sm:border-t-0 sm:px-8 sm:py-6"
					onclick={() => (activeChart = chart)}
				>
					<span class="text-muted-foreground text-xs">
						{chartConfig[chart].label}
					</span>
					<span class="text-lg font-bold leading-none sm:text-3xl">
						{total[key as keyof typeof total].toLocaleString()}
					</span>
				</button>
			{/each}
		</div>
	</Card.Header>
	<Card.Content class="px-2 sm:p-6">
		<Chart.Container config={chartConfig} class="aspect-auto h-[250px] w-full">
			<BarChart
				bind:context
				data={chartData}
				x="date"
				axis="x"
				series={activeSeries}
				props={{
					bars: {
						stroke: 'none',
						rounded: 'none',
						// use the height of the chart to animate the bars
						initialY: context?.height,
						initialHeight: 0,
						motion: {
							y: { type: 'tween', duration: 500, easing: cubicInOut },
							height: { type: 'tween', duration: 500, easing: cubicInOut }
						}
					},
					highlight: { area: { fill: 'none' } },
					xAxis: {
						format: (d: Date) => {
							return d.toLocaleDateString('en-US', {
								month: 'short',
								day: '2-digit'
							});
						},
						ticks: (scale) => scaleUtc(scale.domain(), scale.range()).ticks()
					}
				}}
			>
				{#snippet belowMarks()}
					<Highlight area={{ class: 'fill-muted' }} />
				{/snippet}
				{#snippet tooltip()}
					<Chart.Tooltip
						nameKey="views"
						labelFormatter={(v: Date) => {
							return v.toLocaleDateString('en-US', {
								month: 'short',
								day: 'numeric',
								year: 'numeric'
							});
						}}
					/>
				{/snippet}
			</BarChart>
		</Chart.Container>
	</Card.Content>
	<Card.Footer>
		<div class="flex w-full items-start gap-2 text-sm">
			<div class="grid gap-2">
				<div class="flex items-center gap-2 font-medium leading-none">
					Trending up by 5.2% this month <TrendingUpIcon class="size-4" />
				</div>
				<div class="text-muted-foreground flex items-center gap-2 leading-none">
					Showing total visitors for the last 6 months
				</div>
			</div>
		</div>
	</Card.Footer>
</Card.Root>

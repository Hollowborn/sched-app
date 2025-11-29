<script lang="ts">
	import { Arc, PieChart, Text } from 'layerchart';
	import * as Chart from '$lib/components/ui/chart/index.js';
	import * as Card from '$lib/components/ui/card/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import ChartStyle from '../ui/chart/chart-style.svelte';

	import { TrendingUp, TrendingDown } from '@lucide/svelte';

	type ScheduleStatusData = {
		name: string;
		value: number;
	};

	let { data } = $props<{ data: ScheduleStatusData[] }>();

	const chartConfig = $derived(
		data.reduce((acc, item, index) => {
			acc[item.name] = {
				label: item.name,
				color: `var(--chart-${index + 1})`
			};
			return acc;
		}, {} as Chart.ChartConfig)
	);

	const chartData = $derived(
		data.map((item) => ({
			...item,
			color: chartConfig[item.name].color
		}))
	);

	let activeStatus = $state(data[0]?.name ?? '');

	const id = 'pie-interactive-status';
	const statistics = $derived.by(() => {
		// 1. Safely extract values (don't rely on array index order)
		const assigned = data.find((d) => d.name === 'Assigned')?.value || 0;
		const unassigned = data.find((d) => d.name === 'Unassigned')?.value || 0;
		const total = assigned + unassigned;

		// METHOD A: Percentage of Total (Standard Approach)
		// Formula: (Part / Whole) * 100
		const percentOfTotal = total > 0 ? (assigned / total) * 100 : 0;

		// METHOD B: Lowest to Highest Ratio (Your specific request)
		// Formula: (Smallest / Largest) * 100
		const min = Math.min(assigned, unassigned);
		const max = Math.max(assigned, unassigned);
		const ratio = max > 0 ? (min / max) * 100 : 0;

		return {
			assigned,
			unassigned,
			total,
			percentOfTotal: percentOfTotal.toFixed(1), // e.g., "11.1"
			ratio: ratio.toFixed(1) // e.g., "12.5"
		};
	});
	const activeIndex = $derived(chartData.findIndex((item) => item.name === activeStatus));
	const activeValue = $derived(chartData.find((item) => item.name === activeStatus)?.value ?? 0);

	const statuses = $derived(chartData.map((item) => item.name));
</script>

<Card.Root data-chart={id} class="flex flex-col">
	<ChartStyle {id} config={chartConfig} />
	<Card.Header class="flex flex-row items-start space-y-0 pb-0">
		<div class="grid gap-1">
			<Card.Title>Schedule Status</Card.Title>
			<Card.Description>Assignment status for the current term.</Card.Description>
		</div>
		<Select.Root
			type="single"
			value={activeStatus}
			onValueChange={(v) => {
				if (v) activeStatus = v;
			}}
		>
			<Select.Trigger
				class="ml-auto h-7 w-[130px] rounded-lg pl-2.5 text-sm"
				aria-label="Select a value"
			>
				<span
					class="flex h-3 w-3 shrink-0 rounded-sm"
					style:background-color={`var(--color-${activeStatus})`}
				></span>
				{activeStatus
					? chartConfig[activeStatus as keyof typeof chartConfig].label
					: 'Select status'}
			</Select.Trigger>
			<Select.Content align="end" class="rounded-xl">
				{#each statuses as status (status)}
					{@const config = chartConfig[status as keyof typeof chartConfig]}
					{#if config}
						<Select.Item value={status} label={config.label} class="rounded-lg [&_span]:flex">
							<div class="flex items-center gap-2 text-xs">
								{config?.label}
							</div>
						</Select.Item>
					{/if}
				{/each}
			</Select.Content>
		</Select.Root>
	</Card.Header>
	<Card.Content class="flex-1">
		<Chart.Container {id} config={chartConfig} class="mx-auto aspect-square max-h-[250px]">
			<PieChart
				data={chartData}
				label="name"
				key="name"
				value="value"
				c="color"
				props={{
					pie: {
						sort: null,
						motion: 'tween'
					}
				}}
				innerRadius={60}
				padding={29}
			>
				{#snippet aboveMarks()}
					<Text
						value={activeValue.toLocaleString()}
						textAnchor="middle"
						verticalAnchor="middle"
						class="fill-foreground !text-3xl font-bold"
						dy={3}
					/>
					<Text
						value={activeStatus}
						textAnchor="middle"
						verticalAnchor="middle"
						class="!fill-muted-foreground text-muted-foreground"
						dy={22}
					/>
				{/snippet}
				{#snippet arc({ props, index })}
					{@const isActive = index === activeIndex}
					{@const arcProps = isActive ? { ...props, outerRadius: 60, innerRadius: 105 } : props}

					{#if isActive}
						<g>
							<Arc {...arcProps} />
							<Arc {...arcProps} outerRadius={107} innerRadius={119} />
						</g>
					{:else}
						<Arc {...arcProps} />
					{/if}
				{/snippet}
				{#snippet tooltip()}
					<Chart.Tooltip
						labelKey="value"
						nameKey="name"
						indicator="line"
						labelFormatter={(_, payload) => {
							return chartConfig[payload?.[0].key as keyof typeof chartConfig].label;
						}}
					/>
				{/snippet}
			</PieChart>
		</Chart.Container>
	</Card.Content>
	<Card.Footer class="text-center text-muted-foreground text-sm">
		{#if statistics.total === 0}
			No classes available.
		{:else if statistics.assigned >= statistics.unassigned}
			{statistics.percentOfTotal}% of classes are assigned <TrendingUp />
		{:else}
			Only {statistics.percentOfTotal}% out of {statistics.total} classes are assigned <TrendingDown
				class="ml-2 size-4"
			/>
		{/if}
	</Card.Footer>
</Card.Root>

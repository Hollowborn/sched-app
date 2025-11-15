<script lang="ts">
	import { BarChart } from 'layerchart';

	type WorkloadData = {
		name: string;
		value: number;
	};

	let { data } = $props<{ data: WorkloadData[] }>();
</script>

<div class="chart-container">
	<BarChart {data} x="name" y="value" legend />
</div>

<style>
	.chart-container {
		width: 100%;
		height: 350px;
	}
</style>

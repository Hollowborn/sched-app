<script lang="ts">
	import { PieChart } from 'layerchart';

	type ScheduleStatusData = {
		name: string;
		value: number;
	};

	let { data } = $props<{ data: ScheduleStatusData[] }>();
</script>

<div class="chart-container">
	<PieChart {data} label="name" value="value" innerRadius={60} legend={true} />
</div>

<style>
	.chart-container {
		width: 100%;
		height: 350px;
	}
</style>

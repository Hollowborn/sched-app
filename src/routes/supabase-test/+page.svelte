<script>
	export let data;
</script>

<ul>
	{#each data.instructors as country}
		<li>{country.name}</li>
	{/each}
</ul>

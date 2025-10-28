<script>
	import { flip } from 'svelte/animate';
	import { dndzone } from 'svelte-dnd-action';

	let draggableItems = $state([]);
	let tableGrid = $state([]);
	let isSwapping = false;

	const initialItems = [
		{ id: 1, name: 'item1' },
		{ id: 2, name: 'item2' },
		{ id: 3, name: 'item3' },
		{ id: 4, name: 'item4' }
	];

	const initialGrid = () =>
		Array(8)
			.fill(null)
			.map((_, i) =>
				Array(5)
					.fill(null)
					.map((_, j) => ({ id: `cell-${i}-${j}`, name: ` ` }))
			);

	function initialize() {
		draggableItems = [...initialItems];
		tableGrid = initialGrid();
	}

	initialize();

	const flipDurationMs = 300;

	function handleDraggableFinalize(e) {
		if (isSwapping) {
			isSwapping = false;
			return;
		}
		draggableItems = e.detail.items;
		if (e.detail.info.source.id.startsWith('cell-')) {
			const [_, si, sj] = e.detail.info.source.id.split('-');
			tableGrid[parseInt(si)][parseInt(sj)] = { id: e.detail.info.source.id, name: ' ' };
		}
	}

	function handleTableFinalize(e, i, j) {
		if (isSwapping) {
			isSwapping = false;
			return;
		}
		const { items, info } = e.detail;

		if (items.length > 1) {
			// dropped
			const originalCellContent = tableGrid[i][j];
			const droppedItem = items.find((item) => item.id !== originalCellContent.id);
			if (!droppedItem) return;

			tableGrid[i][j] = droppedItem;

			if (originalCellContent.name.trim() !== '') {
				// swap
				if (info.source.id === 'draggable-list') {
					isSwapping = true;
					draggableItems = [
						...draggableItems.filter((item) => item.id !== droppedItem.id),
						originalCellContent
					];
				} else if (info.source.id.startsWith('cell-')) {
					const [_, si, sj] = info.source.id.split('-');
					isSwapping = true;
					tableGrid[parseInt(si)][parseInt(sj)] = originalCellContent;
				}
			} else {
				// move
				if (info.source.id === 'draggable-list') {
					isSwapping = true;
					draggableItems = draggableItems.filter((item) => item.id !== droppedItem.id);
				}
			}
		} else if (items.length === 0) {
			// dragged out
			tableGrid[i][j] = { id: `cell-${i}-${j}`, name: ' ' };
		}
	}
</script>

<button onclick={initialize}>Reset</button>

<div class="card">
	<section
		id="draggable-list"
		use:dndzone={{ items: draggableItems, flipDurationMs }}
		onfinalize={handleDraggableFinalize}
	>
		{#each draggableItems as item (item.id)}
			<div id="draggable-item-{item.id}" animate:flip={{ duration: flipDurationMs }}>
				{item.name}
			</div>
		{/each}
	</section>
</div>

<div class="card">
	<table>
		<thead>
			<tr>
				<th>Monday</th>
				<th>Tuesday</th>
				<th>Wednesday</th>
				<th>Thursday</th>
				<th>Friday</th>
			</tr>
		</thead>
		<tbody>
			{#each tableGrid as row, i (i)}
				<tr>
					{#each row as cell, j (cell.id)}
						<td
							id={cell.id}
							use:dndzone={{ items: [cell], flipDurationMs }}
							onfinalize={(e) => handleTableFinalize(e, i, j)}
						>
							<div>{cell.name}</div>
						</td>
					{/each}
				</tr>
			{/each}
		</tbody>
	</table>
</div>

<style>
	.card {
		border: 1px solid #ccc;
		border-radius: 5px;
		padding: 1em;
		margin-bottom: 1em;
	}
	section {
		width: 100%;
		padding: 0.3em;
		border: 1px solid black;
		margin-bottom: 1em;
	}
	button {
		margin-bottom: 1em;
	}
	table {
		width: 100%;
		border-collapse: collapse;
	}
	thead th {
		border-bottom: 2px solid #000;
		padding-bottom: 0.5em;
	}
	td {
		width: 20%;
		height: 50px;
		border: 1px solid black;
		text-align: center;
		vertical-align: middle;
	}
	div {
		padding: 0.2em;
		border: 1px solid blue;
		margin: 0.15em 0;
	}
</style>

<script lang="ts">
	import * as Drawer from '$lib/components/ui/drawer/index.js';
	import { Button } from '$lib/components/ui/button/index.js';
	import { Label } from '$lib/components/ui/label/index.js';
	import { Input } from '$lib/components/ui/input/index.js';
	import * as Select from '$lib/components/ui/select/index.js';
	import { Separator } from '$lib/components/ui/separator/index.js';
	import type { Schema } from './schemas.js';

	let { item }: { item: Schema } = $props();
	let type = $state(item.type);
	let status = $state(item.status);
	let reviewer = $state(item.reviewer);
</script>

<Drawer.Root>
	<Drawer.Trigger>
		{#snippet child({ props })}
			<Button variant="link" class="text-foreground w-fit px-0 text-left" {...props}>
				{item.header}
			</Button>
		{/snippet}
	</Drawer.Trigger>
	<Drawer.Content>
		<Drawer.Header class="gap-1">
			<Drawer.Title>{item.header}</Drawer.Title>
			<Drawer.Description>Showing total visitors for the last 6 months</Drawer.Description>
		</Drawer.Header>
		<div class="flex flex-col gap-4 overflow-y-auto px-4 text-sm">
			<form class="flex flex-col gap-4">
				<div class="flex flex-col gap-3">
					<Label for="header">Header</Label>
					<Input id="header" value={item.header} />
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-3">
						<Label for="type">Type</Label>
						<Select.Root type="single" bind:value={type}>
							<Select.Trigger id="type" class="w-full">
								{type ?? 'Select a type'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="Table of Contents">Table of Contents</Select.Item>
								<Select.Item value="Executive Summary">Executive Summary</Select.Item>
								<Select.Item value="Technical Approach">Technical Approach</Select.Item>
								<Select.Item value="Design">Design</Select.Item>
								<Select.Item value="Capabilities">Capabilities</Select.Item>
								<Select.Item value="Focus Documents">Focus Documents</Select.Item>
								<Select.Item value="Narrative">Narrative</Select.Item>
								<Select.Item value="Cover Page">Cover Page</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
					<div class="flex flex-col gap-3">
						<Label for="status">Status</Label>
						<Select.Root type="single" bind:value={status}>
							<Select.Trigger id="status" class="w-full">
								{status ?? 'Select a status'}
							</Select.Trigger>
							<Select.Content>
								<Select.Item value="Done">Done</Select.Item>
								<Select.Item value="In Progress">In Progress</Select.Item>
								<Select.Item value="Not Started">Not Started</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="flex flex-col gap-3">
						<Label for="target">Target</Label>
						<Input id="target" value={item.target} />
					</div>
					<div class="flex flex-col gap-3">
						<Label for="limit">Limit</Label>
						<Input id="limit" value={item.limit} />
					</div>
				</div>
				<div class="flex flex-col gap-3">
					<Label for="reviewer">Reviewer</Label>
					<Select.Root type="single" bind:value={reviewer}>
						<Select.Trigger id="reviewer" class="w-full">
							{reviewer ?? 'Select a reviewer'}
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="Eddie Lake">Eddie Lake</Select.Item>
							<Select.Item value="Jamik Tashpulatov">Jamik Tashpulatov</Select.Item>
							<Select.Item value="Emily Whalen">Emily Whalen</Select.Item>
						</Select.Content>
					</Select.Root>
				</div>
			</form>
		</div>
		<Drawer.Footer>
			<Button>Submit</Button>
			<Drawer.Close>
				{#snippet child({ props })}
					<Button variant="outline" {...props}>Done</Button>
				{/snippet}
			</Drawer.Close>
		</Drawer.Footer>
	</Drawer.Content>
</Drawer.Root>

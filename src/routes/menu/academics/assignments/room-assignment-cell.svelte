<script lang="ts">
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import { cn } from '$lib/utils';
	import { Button } from '$lib/components/ui/button';
	import * as Popover from '$lib/components/ui/popover';
	import * as Select from '$lib/components/ui/select';
	import { Label } from '$lib/components/ui/label';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import type { PageData } from './$types';

	type ClassOffering = PageData['classes'][number];

	let { rowData, data } = $props<{
		rowData: ClassOffering;
		data: PageData;
	}>();

	let open = $state(false);

	// Initialize preferences from rowData
	let prefs = $state({
		priority: rowData.room_preferences?.priority?.toString() ?? '',
		options: rowData.room_preferences?.options ?? []
	});

	// Update local state when rowData changes (e.g. after save)
	$effect(() => {
		prefs = {
			priority: rowData.room_preferences?.priority?.toString() ?? '',
			options: rowData.room_preferences?.options ?? []
		};
	});
</script>

<Popover.Root bind:open>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button variant="outline" class="w-full justify-start text-left font-normal" {...props}>
				<div class="flex flex-col items-start truncate">
					<span class="font-medium">
						{prefs.priority
							? data.rooms?.find((r) => r.id.toString() === prefs.priority)?.room_name
							: 'No Priority'}
					</span>
					{#if prefs.options.length > 0}
						<span class="text-xs text-muted-foreground">
							+{prefs.options.length} alternatives
						</span>
					{/if}
				</div>
			</Button>
		{/snippet}
	</Popover.Trigger>
	<Popover.Content class="w-80 p-4">
		<form
			method="POST"
			action="?/assignRoom"
			use:enhance={() => {
				const toastId = toast.loading('Saving room preferences...');
				return async ({ update, result }) => {
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						open = false;
						await update({ reset: false });
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
						await invalidateAll();
					}
				};
			}}
			class="space-y-4"
		>
			<input type="hidden" name="classId" value={rowData.id} />

			<!-- Priority Room -->
			<div class="space-y-2">
				<Label>Priority Room</Label>
				<Select.Root
					type="single"
					name="priorityRoomId"
					value={prefs.priority}
					onValueChange={(v) => {
						prefs.priority = v;
					}}
				>
					<Select.Trigger>
						{prefs.priority
							? data.rooms?.find((r) => r.id.toString() === prefs.priority)?.room_name
							: 'Select priority room'}
					</Select.Trigger>
					<Select.Content class="max-h-[200px]">
						<Select.Item value="">None</Select.Item>
						{#each data.rooms || [] as room}
							<Select.Item value={room.id.toString()}>
								{room.room_name}
								({room.type})
							</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>

			<!-- Alternative Rooms -->
			<div class="space-y-2">
				<Label>Alternative Rooms</Label>
				<div class="border rounded-md p-2 max-h-[150px] overflow-y-auto space-y-1">
					{#each data.rooms || [] as room}
						<div class="flex items-center space-x-2">
							<Checkbox
								id="opt-{rowData.id}-{room.id}"
								checked={prefs.options.includes(room.id)}
								onCheckedChange={(checked) => {
									if (checked) {
										prefs.options = [...prefs.options, room.id];
									} else {
										prefs.options = prefs.options.filter((id) => id !== room.id);
									}
								}}
							/>
							<Label for="opt-{rowData.id}-{room.id}" class="text-sm font-normal cursor-pointer">
								{room.room_name}
							</Label>
						</div>
					{/each}
				</div>
				<input type="hidden" name="optionRoomIds" value={JSON.stringify(prefs.options)} />
			</div>

			<Button type="submit" class="w-full">Save Preferences</Button>
		</form>
	</Popover.Content>
</Popover.Root>

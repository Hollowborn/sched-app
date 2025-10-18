<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { invalidateAll } from '$app/navigation';
	import {
		PlusCircle,
		Trash2,
		Pencil,
		LoaderCircle,
		Search,
		Building,
		Users,
		Tag,
		LayoutGrid,
		List
	} from '@lucide/svelte';
	import { Checkbox } from '$lib/components/ui/checkbox';
	import { Switch } from '$lib/components/ui/switch';

	// Shadcn Components
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Table from '$lib/components/ui/table';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Badge } from '$lib/components/ui/badge';

	type Room = {
		id: number;
		room_name: string;
		building: string | null;
		capacity: number;
		type: string;
		owner_college_id: number | null;
		is_general_use: boolean;
		features: string[] | null;
		colleges: { college_name: string } | null;
	};

	let { data } = $props<{ data: PageData; form: ActionData }>();

	// --- Component State ---
	let viewMode: 'table' | 'grid' = $state('grid');
	let isSubmitting = $state(false);
	let searchQuery = $state('');
	let selectedRoom = $state<Room | null>(null);

	// Modal States
	let createOpen = $state(false);
	let editOpen = $state(false);
	let deleteOpen = $state(false);

	// Form State
	let formName = $state('');
	let formBuilding = $state('');
	let formCapacity = $state(30);
	let roomType = $state('');
	let formType = $state('Lecture');
	let formCreateCollegeId = $state<string | undefined>('');
	let formCollegeId = $state<string | undefined>('');
	let formIsGeneralUse = $state(true);
	let formFeatures = $state<string[]>([]);

	const definedFeatures = ['Projector', 'Computers', 'Whiteboard', 'Airconditioned'];

	// --- Derived State ---
	const filteredRooms: Room[] = $derived.by(() => {
		const rooms = data.rooms || [];
		if (!searchQuery) return rooms;
		const lowerQuery = searchQuery.toLowerCase();
		return rooms.filter(
			(r) =>
				r.room_name.toLowerCase().includes(lowerQuery) ||
				r.building?.toLowerCase().includes(lowerQuery) ||
				r.type.toLowerCase().includes(lowerQuery)
		);
	});

	// --- Event Handlers ---
	function openEditModal(room: Room) {
		selectedRoom = room;
		formName = room.room_name;
		formBuilding = room.building || '';
		formCapacity = room.capacity;
		formType = room.type;
		formCollegeId = room.owner_college_id?.toString() || '';
		formIsGeneralUse = room.is_general_use;
		formFeatures = room.features || [];
		editOpen = true;
	}

	function openDeleteModal(room: Room) {
		selectedRoom = room;
		deleteOpen = true;
	}

	const formCreateCollegeName = $derived(
		data.colleges?.find((c) => c.id.toString() === formCreateCollegeId)?.college_name
	);

	const formCollegeName = $derived(
		data.colleges?.find((c) => c.id.toString() === formCollegeId)?.college_name
	);
</script>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Rooms & Venues</h1>
		<p class="text-muted-foreground mt-1">
			Manage all schedulable spaces, their capacities, and features.
		</p>
	</header>

	<Card.Root>
		<Card.Content class="p-4 flex items-center justify-between gap-4">
			<div class="flex flex-1 items-center gap-4">
				<div class="relative w-full max-w-sm">
					<Search class="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
					<Input
						placeholder="Search by name, building, or type..."
						class="pl-10"
						bind:value={searchQuery}
					/>
				</div>
				<!-- Future filter controls can go here -->
			</div>
			<div class="flex items-center gap-2">
				<Button
					variant={viewMode === 'table' ? 'secondary' : 'ghost'}
					size="icon"
					onclick={() => (viewMode = 'table')}><List class="h-4 w-4" /></Button
				>
				<Button
					variant={viewMode === 'grid' ? 'secondary' : 'ghost'}
					size="icon"
					onclick={() => (viewMode = 'grid')}><LayoutGrid class="h-4 w-4" /></Button
				>
				{#if data.profile?.role === 'Admin'}
					<Button onclick={() => (createOpen = true)}>
						<PlusCircle class="mr-2 h-4 w-4" /> Add Room
					</Button>
				{/if}
			</div>
		</Card.Content>
	</Card.Root>

	{#if viewMode === 'grid'}
		<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
			{#each filteredRooms as room (room.id)}
				<Card.Root class="flex flex-col">
					<Card.Header>
						<div class="flex justify-between items-start">
							<div>
								<Card.Title>{room.room_name}</Card.Title>
								<Card.Description>{room.building || 'N/A'}</Card.Description>
							</div>
							<Badge variant="outline">{room.type}</Badge>
						</div>
					</Card.Header>
					<Card.Content class="flex-grow space-y-4">
						<div class="flex items-center text-sm text-muted-foreground">
							<Users class="mr-2 h-4 w-4" />
							<span>Capacity: {room.capacity}</span>
						</div>
						<div class="flex flex-wrap gap-2">
							{#if room.features && room.features.length > 0}
								{#each room.features as feature}
									<Badge variant="secondary">{feature}</Badge>
								{/each}
							{/if}
						</div>
					</Card.Content>
					<Card.Footer class="flex justify-end gap-2">
						<Button variant="outline" size="sm">View Schedule</Button>
						<Button variant="secondary" size="sm" onclick={() => openEditModal(room)}>Edit</Button>
					</Card.Footer>
				</Card.Root>
			{/each}
		</div>
	{:else}
		<div class="border rounded-md">
			<Table.Root>
				<Table.Header>
					<Table.Row>
						<Table.Head>Room Name</Table.Head>
						<Table.Head>Building</Table.Head>
						<Table.Head>Type</Table.Head>
						<Table.Head>Capacity</Table.Head>
						<Table.Head>Owner</Table.Head>
						<Table.Head class="text-right pr-6">Actions</Table.Head>
					</Table.Row>
				</Table.Header>
				<Table.Body>
					{#each filteredRooms as room (room.id)}
						<Table.Row>
							<Table.Cell class="font-medium">{room.room_name}</Table.Cell>
							<Table.Cell>{room.building || 'N/A'}</Table.Cell>
							<Table.Cell><Badge variant="outline">{room.type}</Badge></Table.Cell>
							<Table.Cell>{room.capacity}</Table.Cell>
							<Table.Cell>{room.colleges?.college_name || 'General Use'}</Table.Cell>
							<Table.Cell class="text-right">
								<Button variant="ghost" size="sm">View Schedule</Button>
								<Button variant="ghost" size="sm" onclick={() => openEditModal(room)}>Edit</Button>
								<Button
									variant="ghost"
									size="icon"
									class="text-destructive hover:text-destructive"
									onclick={() => openDeleteModal(room)}><Trash2 class="h-4 w-4" /></Button
								>
							</Table.Cell>
						</Table.Row>
					{/each}
				</Table.Body>
			</Table.Root>
		</div>
	{/if}
</div>

<!-- Modals -->
<Dialog.Root bind:open={createOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Add New Room</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/createRoom"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Creating room...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						roomType = '';
						invalidateAll();
						createOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<div class="grid gap-4 py-4">
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="create-name">Room Name</Label>
						<Input id="create-name" name="room_name" placeholder="e.g. DCS Lab 1" required />
					</div>
					<div class="space-y-2">
						<Label for="create-building">Building</Label>
						<Input id="create-building" name="building" placeholder="e.g. COT Building" />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="create-capacity">Capacity</Label>
						<Input id="create-capacity" name="capacity" type="number" value={30} required />
					</div>
					<div class="space-y-2">
						<Label for="create-type">Room Type</Label>
						<Select.Root type="single" name="type" bind:value={roomType}>
							<Select.Trigger><span>{roomType || 'Select a type'}</span></Select.Trigger>
							<Select.Content>
								<Select.Item value="Lecture">Lecture</Select.Item>
								<Select.Item value="Lab">Lab</Select.Item>
								<Select.Item value="Auditorium">Auditorium</Select.Item>
								<Select.Item value="Conference">Conference</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				<div class="space-y-2">
					<Label>Owner College</Label>
					<Select.Root type="single" name="owner_college_id" bind:value={formCreateCollegeId}>
						<Select.Trigger><span>{formCreateCollegeName || 'General Use'}</span></Select.Trigger>
						<Select.Content>
							<Select.Item value="">General Use</Select.Item>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Features</Label>
					<div class="grid grid-cols-2 gap-4 rounded-md border p-4">
						{#each definedFeatures as feature}
							<div class="flex items-center gap-2">
								<Checkbox id="create-feat-{feature}" name="features" value={feature} />
								<Label for="create-feat-{feature}" class="font-normal">{feature}</Label>
							</div>
						{/each}
					</div>
				</div>
				<div class="flex items-center space-x-2">
					<Switch id="is-general-use" name="is_general_use" checked />
					<Label for="is-general-use">Available for other colleges to use</Label>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Create Room
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={editOpen}>
	<Dialog.Content>
		<Dialog.Header>
			<Dialog.Title>Edit Room: {selectedRoom?.room_name}</Dialog.Title>
		</Dialog.Header>
		<form
			method="POST"
			action="?/updateRoom"
			use:enhance={() => {
				isSubmitting = true;
				const toastId = toast.loading('Saving changes...');
				return async ({ update, result }) => {
					isSubmitting = false;
					if (result.type === 'success') {
						toast.success(result.data?.message, { id: toastId });
						invalidateAll();
						editOpen = false;
					} else if (result.type === 'failure') {
						toast.error(result.data?.message, { id: toastId });
					}
					await update();
				};
			}}
		>
			<input type="hidden" name="id" value={selectedRoom?.id} />
			<div class="grid gap-4 py-4">
				<!-- Similar form fields as create, but bound to `form...` state variables -->
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="edit-name">Room Name</Label>
						<Input id="edit-name" name="room_name" bind:value={formName} required />
					</div>
					<div class="space-y-2">
						<Label for="edit-building">Building</Label>
						<Input id="edit-building" name="building" bind:value={formBuilding} />
					</div>
				</div>
				<div class="grid grid-cols-2 gap-4">
					<div class="space-y-2">
						<Label for="edit-capacity">Capacity</Label>
						<Input
							id="edit-capacity"
							name="capacity"
							type="number"
							bind:value={formCapacity}
							required
						/>
					</div>
					<div class="space-y-2">
						<Label for="edit-type">Room Type</Label>
						<Select.Root type="single" name="type" bind:value={formType}>
							<Select.Trigger><span>{formType || 'Select room type'}</span></Select.Trigger>
							<Select.Content>
								<Select.Item value="Lecture">Lecture</Select.Item>
								<Select.Item value="Lab">Lab</Select.Item>
								<Select.Item value="Auditorium">Auditorium</Select.Item>
								<Select.Item value="Conference">Conference</Select.Item>
							</Select.Content>
						</Select.Root>
					</div>
				</div>
				<div class="space-y-2">
					<Label>Owner College</Label>
					<Select.Root type="single" name="owner_college_id" bind:value={formCollegeId}>
						<Select.Trigger>
							<span>{formCollegeName || 'General Use'}</span>
						</Select.Trigger>
						<Select.Content>
							<Select.Item value="">General Use</Select.Item>
							{#each data.colleges as college}
								<Select.Item value={college.id.toString()}>{college.college_name}</Select.Item>
							{/each}
						</Select.Content>
					</Select.Root>
				</div>
				<div class="space-y-2">
					<Label>Features</Label>
					<div class="grid grid-cols-2 gap-4 rounded-md border p-4">
						{#each definedFeatures as feature}
							<div class="flex items-center gap-2">
								<Checkbox
									id="edit-feat-{feature}"
									name="features"
									value={feature}
									checked={formFeatures.includes(feature)}
									onCheckedChange={(checked) => {
										if (checked) {
											formFeatures = [...formFeatures, feature];
										} else {
											formFeatures = formFeatures.filter((f) => f !== feature);
										}
									}}
								/>
								<Label for="edit-feat-{feature}" class="font-normal">{feature}</Label>
							</div>
						{/each}
					</div>
				</div>
				<div class="flex items-center space-x-2">
					<Switch id="edit-is-general-use" name="is_general_use" bind:checked={formIsGeneralUse} />
					<Label for="edit-is-general-use">Available for other colleges to use</Label>
				</div>
			</div>
			<Dialog.Footer>
				<Button type="submit" disabled={isSubmitting}>
					{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
					Save Changes
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>

{#if selectedRoom}
	<Dialog.Root bind:open={deleteOpen}>
		<Dialog.Content>
			<Dialog.Header>
				<Dialog.Title>Are you sure?</Dialog.Title>
				<Dialog.Description>
					This will permanently delete the room <strong>{selectedRoom.room_name}</strong>. This
					action cannot be undone.
				</Dialog.Description>
			</Dialog.Header>
			<form
				method="POST"
				action="?/deleteRoom"
				use:enhance={() => {
					isSubmitting = true;
					const toastId = toast.loading('Deleting room...');
					return async ({ update, result }) => {
						isSubmitting = false;
						if (result.type === 'success') {
							toast.success(result.data?.message, { id: toastId });
							invalidateAll();
							deleteOpen = false;
						} else if (result.type === 'failure') {
							toast.error(result.data?.message, { id: toastId });
						}
						await update();
					};
				}}
			>
				<input type="hidden" name="id" value={selectedRoom.id} />
				<Dialog.Footer>
					<Button
						type="button"
						variant="outline"
						onclick={() => (deleteOpen = false)}
						disabled={isSubmitting}>Cancel</Button
					>
					<Button type="submit" variant="destructive" disabled={isSubmitting}>
						{#if isSubmitting}<LoaderCircle class="mr-2 h-4 w-4 animate-spin" />{/if}
						Yes, Delete Room
					</Button>
				</Dialog.Footer>
			</form>
		</Dialog.Content>
	</Dialog.Root>
{/if}

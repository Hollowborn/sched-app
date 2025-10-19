<script lang="ts">
	import type { PageData } from './$types';
	import { goto } from '$app/navigation';
	import {
		Calendar,
		BookOpen,
		Users,
		DoorOpen,
		User,
		PlusCircle,
		Clock,
		Filter
	} from '@lucide/svelte';

	// Shadcn Components
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Badge } from '$lib/components/ui/badge';

	let { data } = $props<{ data: PageData }>();

	// --- State from URL Filters ---
	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let viewBy = $state(data.filters.view_by);
	let viewId = $state(data.filters.view_id);

	// --- UI State ---
	const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
	const timeSlots = Array.from({ length: 14 }, (_, i) => {
		const hour = 7 + Math.floor(i / 2);
		const minute = i % 2 === 0 ? '00' : '30';
		const nextMinute = i % 2 === 0 ? '30' : '00';
		const nextHour = i % 2 === 0 ? hour : hour + 1;
		const formattedHour = hour < 10 ? `0${hour}` : hour;
		const formattedNextHour = nextHour < 10 ? `0${nextHour}` : nextHour;
		return {
			start: `${formattedHour}:${minute}`,
			end: `${formattedNextHour}:${nextMinute}`
		};
	});

	// --- Derived State ---
	const viewSelectLabel = $derived.by(() => {
		if (viewBy === 'block') return 'Select a Block';
		if (viewBy === 'room') return 'Select a Room';
		if (viewBy === 'instructor') return 'Select an Instructor';
		return 'Select...';
	});

	const viewSelectOptions = $derived.by(() => {
		if (viewBy === 'block') return data.blocks;
		if (viewBy === 'room') return data.rooms;
		if (viewBy === 'instructor') return data.instructors;
		return [];
	});

	// --- Event Handlers ---
	function handleFilterChange() {
		const params = new URLSearchParams();
		params.set('year', academicYear);
		params.set('semester', semester);
		params.set('view_by', viewBy);
		if (viewId) {
			params.set('id', viewId);
		}
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true });
	}
</script>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Master Scheduler</h1>
		<p class="text-muted-foreground mt-1">
			Visually assign classes to time slots, rooms, and instructors.
		</p>
	</header>

	<!-- Filter Control Panel -->
	<Card.Root>
		<Card.Content class="p-4 flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={academicYear}
					onValueChange={(v) => {
						if (v) academicYear = v;
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]"><span>{academicYear}</span></Select.Trigger>
					<Select.Content></Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<BookOpen class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={semester}
					onValueChange={(v) => {
						if (v) semester = v;
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]"><span>{semester}</span></Select.Trigger>
					<Select.Content>
						<Select.Item value="1st Semester">1st Semester</Select.Item>
						<Select.Item value="2nd Semester">2nd Semester</Select.Item>
						<Select.Item value="Summer">Summer</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<Filter class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={viewBy}
					onValueChange={(v) => {
						if (v) viewBy = v;
						viewId = undefined; // Reset ID when view changes
						handleFilterChange();
					}}
				>
					<Select.Trigger class="w-[150px]">
						<span class="capitalize">{viewBy}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="block">View by Block</Select.Item>
						<Select.Item value="room">View by Room</Select.Item>
						<Select.Item value="instructor">View by Instructor</Select.Item>
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex-1">
				<Select.Root
					type="single"
					value={viewId}
					onValueChange={(v) => {
						if (v) viewId = v;
						handleFilterChange();
					}}
				>
					<Select.Trigger
						><span
							>{viewSelectOptions.find((o) => o.id.toString() === viewId)?.name ||
								viewSelectOptions.find((o) => o.id.toString() === viewId)?.block_name ||
								viewSelectOptions.find((o) => o.id.toString() === viewId)?.room_name ||
								viewSelectLabel}</span
						></Select.Trigger
					>
					<Select.Content>
						{#each viewSelectOptions as option}
							<Select.Item value={option.id.toString()}
								>{option.name || option.block_name || option.room_name}</Select.Item
							>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Main Scheduler Layout -->
	<div class="grid grid-cols-1 lg:grid-cols-[280px_1fr] gap-6">
		<!-- Unscheduled Classes Panel -->
		<div class="space-y-4">
			<h2 class="text-lg font-semibold">Unscheduled Classes</h2>
			<div class="space-y-3 max-h-[60vh] overflow-y-auto pr-2">
				{#each data.unscheduledClasses as classItem (classItem.id)}
					<Card.Root>
						<Card.Content class="p-3">
							<p class="font-semibold">{classItem.subjects.subject_code}</p>
							<p class="text-sm text-muted-foreground">{classItem.subjects.subject_name}</p>
							<div class="flex justify-between items-center mt-2">
								<Badge variant="secondary">{classItem.blocks.block_name}</Badge>
								<Button size="sm"><PlusCircle class="mr-2 h-4 w-4" /> Schedule</Button>
							</div>
						</Card.Content>
					</Card.Root>
				{/each}
			</div>
		</div>

		<!-- Timetable Grid -->
		<div class="border rounded-lg overflow-hidden">
			<div class="grid grid-cols-[60px_repeat(6,_1fr)] text-center font-semibold text-sm">
				<div class="p-2 border-b border-r"><Clock class="h-4 w-4 mx-auto" /></div>
				{#each days as day}
					<div class="p-2 border-b border-r">{day}</div>
				{/each}

				{#each timeSlots as slot}
					<div class="p-2 text-xs text-muted-foreground border-r">{slot.start}</div>
					{#each days as day}
						{@const scheduledItem = data.scheduleData.find(
							(s) => s.day_of_week === day && s.start_time === `${slot.start}:00`
						)}
						<div class="p-1 border-r border-t min-h-[60px]">
							{#if scheduledItem}
								<div
									class="bg-primary/10 text-primary-foreground p-2 rounded-md text-left text-xs h-full"
								>
									<p class="font-bold">{scheduledItem.class.subjects.subject_code}</p>
									<p>{scheduledItem.class.instructors?.name || 'N/A'}</p>
									<p>{scheduledItem.class.blocks.block_name}</p>
								</div>
							{/if}
						</div>
					{/each}
				{/each}
			</div>
		</div>
	</div>
</div>

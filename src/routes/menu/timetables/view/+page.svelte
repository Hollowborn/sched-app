<script lang="ts">
	import type { ActionData, PageData } from './$types';
	import { goto, invalidateAll } from '$app/navigation';
	import { enhance } from '$app/forms';
	import { toast } from 'svelte-sonner';
	import { Archive, Edit, Eye, LoaderCircle, Calendar, BookOpen } from '@lucide/svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';

	let { data } = $props<{ data: PageData; form: ActionData }>();

	let academicYear = $state(data.filters.academic_year);
	let semester = $state(data.filters.semester);
	let status = $state(data.filters.status);
	let isSubmitting = $state(false);

	function handleFilterChange() {
		const params = new URLSearchParams();
		params.set('year', academicYear);
		params.set('semester', semester);
		params.set('status', status);
		goto(`?${params.toString()}`, { invalidateAll: true, noScroll: true });
	}

	function generateAcademicYears() {
		const currentYear = new Date().getFullYear();
		const years = [];
		for (let i = -2; i <= 2; i++) {
			const startYear = currentYear + i;
			years.push(`${startYear}-${startYear + 1}`);
		}
		return years;
	}

	function getStatusVariant(status: string): 'default' | 'secondary' | 'outline' | 'destructive' {
		switch (status) {
			case 'Published':
				return 'default';
			case 'Draft':
				return 'secondary';
			case 'Archived':
				return 'outline';
			default:
				return 'secondary';
		}
	}
</script>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">View Timetables</h1>
		<p class="text-muted-foreground mt-1">
			Browse, view, and manage all published and draft timetables.
		</p>
	</header>

	<div class="p-4 flex flex-col md:flex-row gap-4">
		<!-- Filters -->
		<div class="flex items-center gap-4">
			<div class="flex items-center gap-2">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={academicYear}
					onValueChange={(v) => {
						if (v) {
							academicYear = v;
							handleFilterChange();
						}
					}}
				>
					<Select.Trigger class="w-[150px]"><span>{academicYear}</span></Select.Trigger>
					<Select.Content>
						{#each generateAcademicYears() as year}
							<Select.Item value={year}>{year}</Select.Item>
						{/each}
					</Select.Content>
				</Select.Root>
			</div>
			<div class="flex items-center gap-2">
				<BookOpen class="h-4 w-4 text-muted-foreground" />
				<Select.Root
					type="single"
					value={semester}
					onValueChange={(v) => {
						if (v) {
							semester = v;
							handleFilterChange();
						}
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
		</div>
		<!-- Status Tabs -->
		<div class="flex-1 md:flex md:justify-end">
			<Tabs.Root
				value={status}
				onValueChange={(v) => {
					if (v) {
						status = v;
						handleFilterChange();
					}
				}}
			>
				<Tabs.List>
					<Tabs.Trigger value="All">All</Tabs.Trigger>
					<Tabs.Trigger value="draft">Drafts</Tabs.Trigger>
					<Tabs.Trigger value="published">Published</Tabs.Trigger>
					<Tabs.Trigger value="archived">Archived</Tabs.Trigger>
				</Tabs.List>
			</Tabs.Root>
		</div>
	</div>

	<!-- Timetable Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
		{#if data.timetables.length > 0}
			{#each data.timetables as tt (tt.id)}
				<Card.Root class="flex flex-col hover-lift transition-base">
					<Card.Header>
						<div class="flex justify-between items-start gap-2">
							<Card.Title class="text-lg">{tt.name}</Card.Title>
							<Badge variant={getStatusVariant(tt.status)}>{tt.status}</Badge>
						</div>
						<Card.Description>
							{tt.colleges?.college_name || 'System-wide'}
						</Card.Description>
					</Card.Header>
					<Card.Content class="flex-grow">
						<p class="text-sm text-muted-foreground">
							Last updated: {new Date(tt.created_at).toLocaleDateString()}
						</p>
					</Card.Content>
					<Card.Footer class="flex justify-start gap-2">
						{#if tt.status !== 'archived'}
							<form
								method="POST"
								action="?/archiveTimetable"
								use:enhance={() => {
									isSubmitting = true;
									const toastId = toast.loading('Archiving timetable...');
									return async ({ update, result }) => {
										isSubmitting = false;
										if (result.type === 'success') {
											toast.success(result.data?.message, { id: toastId });
											await invalidateAll();
										} else if (result.type === 'failure') {
											toast.error(result.data?.message, { id: toastId });
										}
										await update({ reset: false });
									};
								}}
							>
								<input type="hidden" name="timetableId" value={tt.id} />
								<div class="hidden sm:block">
									<Button type="submit" variant="ghost" size="sm" disabled={isSubmitting}>
										<Archive class="mr-2 h-4 w-4" />Archive
									</Button>
								</div>
							</form>
						{/if}
						<div class="ml-auto flex gap-2">
							<Button href="/menu/timetables/view/{tt.id}" variant="default" size="sm">
								<Eye class="mr-2 h-4 w-4" />View
							</Button>
						</div>
					</Card.Footer>
				</Card.Root>
			{/each}
		{:else}
			<div class="sm:col-span-2 lg:col-span-3 text-center py-16 text-muted-foreground">
				No timetables found for the selected filters.
			</div>
		{/if}
	</div>
</div>

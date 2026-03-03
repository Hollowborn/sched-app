<script lang="ts">
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Select from '$lib/components/ui/select';
	import { Search, MapPin, Users, BookOpen, Clock, Calendar } from 'lucide-svelte';
	import { Badge } from '$lib/components/ui/badge';
    import { goto } from '$app/navigation';
	import type { PageData } from './$types';

    let { data }: { data: PageData } = $props();
    
    // Derived states for filtering
    let searchFilter = $state('');
    let collegeFilter = $state('all');
    let termFilter = $state('current');

    // Extract unique terms and colleges from timetables
    const uniqueColleges = $derived.by(() => {
        const colleges = new Set<string>();
        data.timetables.forEach(t => {
            if (t.colleges?.college_name) colleges.add(t.colleges.college_name);
        });
        return Array.from(colleges).sort();
    });

    const uniqueTerms = $derived.by(() => {
        const terms = new Set<string>();
        data.timetables.forEach(t => {
            terms.add(`${t.academic_year}, ${t.semester}`);
        });
        // Sort terms descending (newest first roughly by year)
        return Array.from(terms).sort((a, b) => b.localeCompare(a));
    });

    // Determine the "current" term automatically based on the newest published timetable
    const currentTermString = $derived(uniqueTerms.length > 0 ? uniqueTerms[0] : '');
    
    $effect(() => {
         if (termFilter === 'current' && currentTermString) {
             // We use 'current' as a logical flag, but actual filter uses currentTermString
         }
    });

    // Apply Filters
    const filteredTimetables = $derived.by(() => {
        let result = data.timetables;

        // Semantic Text Search
        if (searchFilter.trim()) {
            const q = searchFilter.toLowerCase();
            result = result.filter(t => 
                t.name.toLowerCase().includes(q) || 
                t.colleges?.college_name?.toLowerCase().includes(q) ||
                t.programs?.program_name?.toLowerCase().includes(q)
            );
        }

        // College Filter
        if (collegeFilter !== 'all') {
            result = result.filter(t => t.colleges?.college_name === collegeFilter);
        }

        // Term Filter
        if (termFilter !== 'all') {
            const activeTermFilter = termFilter === 'current' ? currentTermString : termFilter;
            result = result.filter(t => `${t.academic_year}, ${t.semester}` === activeTermFilter);
        }

        return result;
    });

    // Helper to format dates
    function formatDate(dateStr: string) {
        return new Date(dateStr).toLocaleDateString('en-US', { 
            month: 'short', day: 'numeric', year: 'numeric' 
        });
    }
</script>

<div class="flex flex-col">
	<!-- Hero Section -->
	<section class="relative bg-muted/30 py-16 md:py-24 overflow-hidden border-b">
		<div class="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none"></div>
		<div class="container relative z-10 mx-auto px-4 flex flex-col items-center text-center space-y-6">
            {#if currentTermString}
			<Badge variant="secondary" class="font-mono bg-primary/10 text-primary border-primary/20">
				Current Term: {currentTermString}
			</Badge>
            {/if}
			<h1 class="text-4xl md:text-6xl font-extrabold tracking-tight max-w-3xl">
				Find Your <span class="text-primary">Class Schedule</span> Instantly
			</h1>
			<p class="text-lg md:text-xl text-muted-foreground max-w-2xl">
				Browse the latest published timetables for all colleges and programs. Search for your specific block, instructor, or room to see where you need to be.
			</p>

			<!-- Global Public Search Bar -->
			<div class="w-full max-w-2xl mt-8 relative group">
				<div class="absolute inset-0 bg-primary/20 blur-xl rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
				<div class="relative flex items-center bg-card border shadow-lg rounded-full overflow-hidden p-1">
					<Search class="h-5 w-5 text-muted-foreground ml-4 mr-2" />
					<Input 
						type="text" 
                        bind:value={searchFilter}
						placeholder="Search timetables by name or college..."
						class="border-0 focus-visible:ring-0 shadow-none text-base h-12 bg-transparent w-full"
					/>
				</div>
			</div>
		</div>
	</section>

	<!-- Main Content Section -->
	<section class="container mx-auto px-4 py-12">
		<div class="flex flex-col md:flex-row justify-between items-start md:items-center mb-8 gap-4">
			<div>
				<h2 class="text-2xl font-bold tracking-tight">Published Timetables</h2>
				<p class="text-muted-foreground text-sm mt-1">Select a timetable to view its full schedule grid.</p>
			</div>

			<!-- Filters -->
			<div class="flex items-center gap-3 w-full md:w-auto overflow-x-auto pb-2 md:pb-0">
				<Select.Root type="single" bind:value={collegeFilter}>
					<Select.Trigger class="w-[200px] bg-card shrink-0">
						<span class="truncate">{collegeFilter === 'all' ? 'All Colleges' : collegeFilter}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="all">All Colleges</Select.Item>
                        {#each uniqueColleges as college}
						    <Select.Item value={college}>{college}</Select.Item>
                        {/each}
					</Select.Content>
				</Select.Root>

				<Select.Root type="single" bind:value={termFilter}>
					<Select.Trigger class="w-[200px] bg-card shrink-0">
						<span class="truncate">{termFilter === 'current' ? 'Current Term' : (termFilter === 'all' ? 'All Terms' : termFilter)}</span>
					</Select.Trigger>
					<Select.Content>
						<Select.Item value="current">Current Term</Select.Item>
                        <Select.Item value="all">All Terms</Select.Item>
                        {#each uniqueTerms as term}
						    <Select.Item value={term}>{term}</Select.Item>
                        {/each}
					</Select.Content>
				</Select.Root>
			</div>
		</div>

		<!-- Timetables Grid -->
        {#if filteredTimetables.length === 0}
            <div class="flex flex-col items-center justify-center p-12 border rounded-xl bg-muted/10 border-dashed">
                <Calendar class="w-12 h-12 text-muted-foreground/50 mb-4" />
                <h3 class="text-xl font-semibold">No Timetables Found</h3>
                <p class="text-muted-foreground mt-2 max-w-sm text-center">
                   Based on your current filters, there are no published timetables available to view.
                </p>
            </div>
        {/if}

		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {#each filteredTimetables as target}
                {@const isArchived = target.status === 'archived'}
                {@const meta = target.metadata as any}
                
                <a href={`/schedules/${target.id}`} class="block h-full cursor-pointer">
                <Card.Root 
                    class="h-full group hover:border-primary/50 hover:shadow-md transition-all relative overflow-hidden {isArchived ? 'grayscale-[0.3] hover:grayscale-0' : ''}"
                >
                    {#if !isArchived}
                    <div class="absolute top-0 right-0 w-24 h-24 bg-primary/10 rounded-bl-full -mr-8 -mt-8 transition-transform group-hover:scale-110"></div>
                    {/if}
                    <Card.Header>
                        <div class="flex justify-between items-start mb-2">
                            <Badge variant={isArchived ? "secondary" : "default"} class={!isArchived ? "bg-primary text-primary-foreground shadow-sm" : ""}>
                                {target.status.charAt(0).toUpperCase() + target.status.slice(1)}
                            </Badge>
                            <span class="text-xs text-muted-foreground font-medium flex items-center">
                                <Calendar class="w-3 h-3 mr-1"/>
                                {formatDate(target.created_at)}
                            </span>
                        </div>
                        <Card.Title class="text-xl {isArchived ? 'group-hover:text-foreground' : 'group-hover:text-primary'} transition-colors line-clamp-1">
                            {target.name}
                        </Card.Title>
                        <Card.Description class="line-clamp-1">
                            {target.colleges?.college_name || target.programs?.program_name || 'General Override'}
                        </Card.Description>
                    </Card.Header>
                    <Card.Content>
                        <div class="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                            <div class="flex items-center">
                                <BookOpen class="w-4 h-4 mr-2 {!isArchived ? 'text-primary' : 'text-muted-foreground'}" />
                                <span>{meta?.scheduledCount || '?'} Classes</span>
                            </div>
                            <div class="flex items-center">
                                <MapPin class="w-4 h-4 mr-2 {!isArchived ? 'text-primary' : 'text-muted-foreground'}" />
                                <span>{meta?.roomsUsed || '?'} Rooms</span>
                            </div>
                            <div class="flex items-center col-span-2 mt-2 pt-2 border-t">
                                <Clock class="w-4 h-4 mr-2 {!isArchived ? 'text-primary' : 'text-muted-foreground'}" />
                                <span>{target.semester}, {target.academic_year}</span>
                            </div>
                        </div>
                    </Card.Content>
                    <Card.Footer class="pt-2">
                        <Button variant={isArchived ? "ghost" : "outline"} class="w-full {isArchived ? 'border shadow-sm' : ''} {isArchived ? 'group-hover:bg-secondary group-hover:text-secondary-foreground' : 'group-hover:bg-primary group-hover:text-primary-foreground'} transition-all">
                            View Timetable
                        </Button>
                    </Card.Footer>
                </Card.Root>
                </a>
            {/each}
		</div>
	</section>
</div>

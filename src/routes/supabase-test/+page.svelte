<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Separator } from '$lib/components/ui/separator';

	// Mock Data
	const mockClass = {
		subject_code: 'IT 312',
		subject_name: 'Information Assurance and Security 1',
		block: 'BSIT 3-1',
		instructor: 'Mr. John Doe',
		room: 'Comlab 1',
		type: 'Lab'
	};

	const mockClass2 = {
		subject_code: 'GEC 005',
		subject_name: 'Purposive Communication',
		block: 'BSIT 1-1',
		instructor: 'Ms. Jane Smith',
		room: 'Room 305',
		type: 'Lecture'
	};

	const colorVars = ['--chart-1', '--chart-2', '--chart-3', '--chart-4', '--chart-5'];
</script>

<div class="container mx-auto py-10 space-y-12">
	<div class="space-y-2">
		<h1 class="text-3xl font-bold">Timetable UI Playground</h1>
		<p class="text-muted-foreground">
			Exploring different visual styles for schedule cells and tables.
		</p>
	</div>

	<!-- SECTION 1: GRID CELL VARIANTS -->
	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b pb-2">Grid Cell Variants</h2>
		<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
			<!-- Variant 1: Modern Glass (Current Improved) -->
			<div class="space-y-4">
				<h3 class="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					1. Modern Glass (Improved)
				</h3>
				<p class="text-xs text-muted-foreground mb-2">
					Higher opacity background, solid border.
				</p>
				<div class="space-y-2">
					{#each colorVars as color}
						<div
							class="w-full p-2 rounded-md border-l-4 text-left leading-tight overflow-hidden transition-colors hover:brightness-95"
							style="
                                background-color: oklch(from var({color}) l c h / 0.25);
                                border-left-color: var({color});
                                color: oklch(from var({color}) l c h / 0.9);
                            "
						>
							<div class="flex justify-between items-start mb-1">
								<p class="font-bold text-xs truncate">
									{mockClass.subject_code}
								</p>
								<Badge
									variant="outline"
									class="text-[9px] h-4 px-1 ml-1 shrink-0 bg-white/60 border-current backdrop-blur-sm"
									style="color: var({color});"
								>
									Lab
								</Badge>
							</div>
							<p class="text-[10px] font-medium opacity-90 truncate">
								{mockClass.subject_name}
							</p>
							<div class="text-[10px] mt-1 opacity-80">
								<p>{mockClass.room}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Variant 2: Solid Left Border (Clean) -->
			<div class="space-y-4">
				<h3 class="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					2. Clean & Solid
				</h3>
				<p class="text-xs text-muted-foreground mb-2">
					White background, thick colored border, shadow.
				</p>
				<div class="space-y-2 bg-slate-50 p-4 rounded-lg">
					{#each colorVars as color}
						<div
							class="w-full p-2 rounded-r-md border-l-[6px] bg-white shadow-sm text-left leading-tight overflow-hidden hover:shadow-md transition-all"
							style="border-left-color: var({color});"
						>
							<div class="flex justify-between items-start mb-1">
								<p class="font-bold text-xs text-foreground truncate">
									{mockClass2.subject_code}
								</p>
								<span
									class="text-[9px] font-bold px-1.5 py-0.5 rounded-full"
									style="background-color: oklch(from var({color}) l c h / 0.2); color: var({color});"
								>
									Lec
								</span>
							</div>
							<p class="text-[10px] text-muted-foreground truncate">
								{mockClass2.subject_name}
							</p>
							<div class="text-[10px] mt-1 text-foreground/80 font-medium">
								<p>{mockClass2.room}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Variant 3: Full Solid (Pastel) -->
			<div class="space-y-4">
				<h3 class="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					3. Full Pastel
				</h3>
				<p class="text-xs text-muted-foreground mb-2">
					Solid pastel background, dark text. Good contrast.
				</p>
				<div class="space-y-2">
					{#each colorVars as color}
						<div
							class="w-full p-2 rounded-md text-left leading-tight overflow-hidden hover:opacity-90 transition-opacity"
							style="
                                background-color: oklch(from var({color}) 0.93 c h);
                                color: oklch(from var({color}) 0.3 c h);
                                border: 1px solid oklch(from var({color}) 0.85 c h);
                            "
						>
							<div class="flex justify-between items-start mb-1">
								<p class="font-bold text-xs truncate">
									{mockClass.subject_code}
								</p>
							</div>
							<p class="text-[10px] font-medium truncate opacity-90">
								{mockClass.subject_name}
							</p>
							<div class="flex items-center gap-2 mt-1.5">
								<Badge
									class="text-[9px] h-3.5 px-1 bg-white/50 hover:bg-white/60 text-current border-0 shadow-none"
								>
									Lab
								</Badge>
								<p class="text-[10px] font-medium">{mockClass.room}</p>
							</div>
						</div>
					{/each}
				</div>
			</div>

			<!-- Variant 4: Card Style (Detailed) -->
			<div class="space-y-4">
				<h3 class="font-medium text-sm text-muted-foreground uppercase tracking-wider">
					4. Detailed Card
				</h3>
				<p class="text-xs text-muted-foreground mb-2">
					Colored header, white body. Best for tall cells.
				</p>
				<div class="space-y-2 bg-slate-100 p-4 rounded-lg">
					{#each colorVars as color}
						<div
							class="w-full rounded-md bg-white shadow-sm border overflow-hidden text-left"
						>
							<div
								class="h-1.5 w-full"
								style="background-color: var({color});"
							></div>
							<div class="p-2">
								<div class="flex justify-between items-center mb-1">
									<p class="font-bold text-xs text-foreground truncate">
										{mockClass2.subject_code}
									</p>
                                    <div class="h-1.5 w-1.5 rounded-full" style="background-color: var({color});"></div>
								</div>
								<p class="text-[10px] text-muted-foreground truncate mb-1">
									{mockClass2.subject_name}
								</p>
								<div class="flex items-center justify-between text-[10px] text-foreground/80">
									<span class="font-medium">{mockClass2.room}</span>
                                    <span class="text-muted-foreground opacity-70">Lec</span>
								</div>
							</div>
						</div>
					{/each}
				</div>
			</div>
		</div>
	</section>

	<Separator />

	<!-- SECTION 2: TABLE ROW VARIANTS -->
	<section class="space-y-6">
		<h2 class="text-2xl font-semibold border-b pb-2">Table Row Variants</h2>

		<!-- Table Variant 1: Modern Minimal -->
		<div class="space-y-4">
			<h3 class="font-medium text-sm text-muted-foreground uppercase tracking-wider">
				1. Modern Minimal (Hover Highlight)
			</h3>
			<div class="rounded-md border">
				<table class="w-full text-sm text-left">
					<thead class="bg-muted/30 text-muted-foreground font-medium">
						<tr>
							<th class="h-10 px-4">Subject</th>
							<th class="h-10 px-4">Type</th>
							<th class="h-10 px-4">Room</th>
							<th class="h-10 px-4">Instructor</th>
						</tr>
					</thead>
					<tbody class="divide-y">
						{#each [1, 2, 3] as i}
							<tr class="group hover:bg-muted/40 transition-colors">
								<td class="p-4">
									<div class="font-medium">{mockClass.subject_name}</div>
									<div class="text-xs text-muted-foreground group-hover:text-primary transition-colors">
										{mockClass.subject_code}
									</div>
								</td>
								<td class="p-4">
									<Badge variant="secondary" class="font-normal">Lab</Badge>
								</td>
								<td class="p-4">{mockClass.room}</td>
								<td class="p-4 text-muted-foreground">{mockClass.instructor}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>

		<!-- Table Variant 2: Status Indicator -->
		<div class="space-y-4">
			<h3 class="font-medium text-sm text-muted-foreground uppercase tracking-wider">
				2. Status Indicator (Left Border)
			</h3>
			<div class="rounded-md border bg-card">
				<table class="w-full text-sm text-left">
					<thead class="border-b bg-muted/20">
						<tr>
							<th class="h-10 px-4 w-1"></th>
							<th class="h-10 px-4">Subject</th>
							<th class="h-10 px-4">Type</th>
							<th class="h-10 px-4">Room</th>
						</tr>
					</thead>
					<tbody>
						{#each colorVars.slice(0, 3) as color, i}
							<tr class="border-b last:border-0 hover:bg-muted/20">
								<td class="p-0 w-1">
									<div class="h-8 w-1 rounded-r-full my-3" style="background-color: var({color});"></div>
								</td>
								<td class="p-4">
									<div class="font-semibold text-foreground">{mockClass2.subject_code}</div>
									<div class="text-xs text-muted-foreground">{mockClass2.subject_name}</div>
								</td>
								<td class="p-4">
									<span
										class="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium"
										style="background-color: oklch(from var({color}) 0.95 c h); color: oklch(from var({color}) 0.4 c h);"
									>
										Lecture
									</span>
								</td>
								<td class="p-4 font-mono text-xs">{mockClass2.room}</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	</section>
</div>

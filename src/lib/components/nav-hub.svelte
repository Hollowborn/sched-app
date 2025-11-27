<script lang="ts">
	import { ArrowRight } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import { icons } from 'lucide-svelte';
	import type { NavItem } from '../../nav';

	let { items, section }: { items: NavItem[]; section: string } = $props();

	// Find the requested section from the nav items
	const currentSection = $derived(items.find((item) => item.title === section));
	const subItems = $derived(currentSection?.items || []);
	const SectionIcon = $derived(
		currentSection?.icon && (icons as any)[currentSection.icon]
			? (icons as any)[currentSection.icon]
			: null
	);
</script>

<div class="container mx-auto flex items-center justify-center min-h-[80vh]">
	<Card.Root class="w-full max-w-5xl shadow-sm">
		<Card.Content class="p-8">
			<div class="flex flex-col md:flex-row gap-8">
				<!-- Left Side: Header/Intro -->
				<div class="w-full md:w-1/3 space-y-4">
					{#if SectionIcon}
						<div
							class="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center text-primary"
						>
							<svelte:component this={SectionIcon} class="h-6 w-6" />
						</div>
					{/if}
					<div>
						<h1 class="text-2xl font-bold mb-2">{currentSection?.title || section}</h1>
						<p class="text-muted-foreground text-sm leading-relaxed">
							{currentSection?.description || `Manage ${section.toLowerCase()}.`}
						</p>
					</div>
				</div>

				<!-- Right Side: Navigation Links -->
				<div class="w-full md:w-2/3 grid gap-4">
					{#each subItems as item}
						{@const ItemIcon =
							item.icon && (icons as any)[item.icon] ? (icons as any)[item.icon] : null}
						<a
							href={item.url}
							class="group block p-4 rounded-lg border bg-background hover:border-primary hover:bg-primary/5 transition-all"
						>
							<div class="flex justify-between items-center mb-1">
								<h3
									class="font-semibold flex items-center gap-2 group-hover:text-primary transition-colors"
								>
									{#if ItemIcon}
										<svelte:component
											this={ItemIcon}
											class="h-4 w-4 text-muted-foreground group-hover:text-primary"
										/>
									{/if}
									{item.title}
								</h3>
								<ArrowRight
									class="h-4 w-4 text-muted-foreground group-hover:translate-x-1 transition-transform"
								/>
							</div>
							<p class="text-sm text-muted-foreground pl-6">{item.description}</p>
						</a>
					{/each}
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</div>

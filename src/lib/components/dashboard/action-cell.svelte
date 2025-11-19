<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { ArrowRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Optional prop: the subject code to push into the assignments page search
	export let subjectCode: string | undefined;

	function goWithSearch() {
		// Use SvelteKit's goto with a `state` object which becomes `history.state` on the target
		goto('/menu/academics/assignments', { state: { searchQuery: 'T1' } });
	}
</script>

<Button variant="outline" size="sm" onclick={goWithSearch}>
	Assign <ArrowRight class="ml-2 h-4 w-4" />
</Button>

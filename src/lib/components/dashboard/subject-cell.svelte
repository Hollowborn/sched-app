<script lang="ts">
	export let subject: { subject_code: string; subject_name: string };
</script>

<div class="font-medium">{subject.subject_code}</div>
<div class="text-sm text-muted-foreground">{subject.subject_name}</div>

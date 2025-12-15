<script lang="ts">
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	onMount(() => {
		goto('/login');
	});
</script>

<div class="min-h-screen flex items-center justify-center bg-black">
	<div class="text-center">
		<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
		<p class="mt-4 text-white">Redirigiendo...</p>
	</div>
</div>

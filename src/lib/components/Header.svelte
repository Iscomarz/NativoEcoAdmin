<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';

	const user = $derived($auth);

	async function handleLogout() {
		await auth.logout();
		toast.success('Sesión cerrada');
		goto('/login');
	}
</script>

<header class="bg-neutral-900 border-b border-green-700 shadow-md h-16 fixed top-0 left-0 right-0 z-10">
	<div class="h-full px-6 flex items-center justify-between">
		<div class="flex items-center space-x-4">
			<h1 class="text-xl font-bold text-white">Nativo Tours Admin</h1>
		</div>

		<div class="flex items-center space-x-4">
			{#if user}
				<div class="flex items-center space-x-3">
					<div class="text-right">
						<p class="text-sm font-medium text-white">{user.name}</p>
						<p class="text-xs text-green-400">{user.email}</p>
					</div>
					<div class="w-10 h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-semibold">
						{user.name.charAt(0).toUpperCase()}
					</div>
				</div>
				<button
					onclick={handleLogout}
					class="px-4 py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-sm font-medium transition"
				>
					Cerrar Sesión
				</button>
			{/if}
		</div>
	</div>
</header>

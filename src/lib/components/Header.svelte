<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { toast } from 'svelte-sonner';
	import { sidebarOpen } from '$lib/stores/sidebar';

	const user = $derived($auth);

	async function handleLogout() {
		await auth.logout();
		toast.success('Sesión cerrada');
		goto('/login');
	}
</script>

<header class="bg-neutral-900 border-b border-green-700 shadow-md h-16 fixed top-0 left-0 right-0 z-30">
	<div class="h-full px-4 sm:px-6 flex items-center justify-between">
		<div class="flex items-center space-x-3 sm:space-x-4">
			{#if user}
				<button
					onclick={() => sidebarOpen.toggle()}
					class="lg:hidden p-2 text-white hover:bg-neutral-800 rounded-lg focus:outline-none transition-colors"
					aria-label="Menú de navegación"
				>
					<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
					</svg>
				</button>
			{/if}
			<h1 class="text-lg sm:text-xl font-bold text-white truncate">Nativo Tours Admin</h1>
		</div>

		<div class="flex items-center space-x-3 sm:space-x-4">
			{#if user}
				<div class="flex items-center space-x-2 sm:space-x-3">
					<div class="text-right hidden sm:block">
						<p class="text-sm font-medium text-white">{user.name}</p>
						<p class="text-xs text-green-400">{user.email}</p>
					</div>
					<div class="w-8 h-8 sm:w-10 sm:h-10 rounded-full bg-green-700 flex items-center justify-center text-white font-semibold">
						{user.name.charAt(0).toUpperCase()}
					</div>
				</div>
				<button
					onclick={handleLogout}
					class="px-2.5 py-1.5 sm:px-4 sm:py-2 bg-red-700 hover:bg-red-600 text-white rounded-lg text-xs sm:text-sm font-medium transition flex items-center gap-1.5"
					title="Cerrar Sesión"
				>
					<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
					</svg>
					<span class="hidden md:inline">Cerrar Sesión</span>
				</button>
			{/if}
		</div>
	</div>
</header>


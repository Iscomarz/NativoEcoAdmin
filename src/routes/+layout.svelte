<script lang="ts">
	import { onMount } from 'svelte';
	import { auth } from '$lib/stores/auth';
	import { goto } from '$app/navigation';
	import { page } from '$app/stores';
	import Header from '$lib/components/Header.svelte';
	import Sidebar from '$lib/components/Sidebar.svelte';
	import { Toaster } from 'svelte-sonner';
	import './layout.css';
	import favicon from '$lib/assets/favicon.svg';
	import { invalidate } from '$app/navigation';
	import { supabase } from '$lib/supabaseClient';

	let { children, data } = $props();
	
	const user = $derived($auth);
	const currentPath = $derived($page.url.pathname);

	// Rutas públicas que no requieren autenticación
	const publicRoutes = ['/', '/login'];

	onMount(() => {
		auth.checkAuth();
	});

	// Redirigir si no está autenticado y no está en una ruta pública
	$effect(() => {
		if (!user && !publicRoutes.includes(currentPath)) {
			goto('/login');
		} else if (user && (currentPath === '/' || currentPath === '/login')) {
			goto('/dashboard');
		}
	});

	const session = $derived(data?.session);

	onMount(() => {
		const {
			data: { subscription },
		} = supabase.auth.onAuthStateChange((event, _session) => {
			if (_session?.expires_at !== session?.expires_at) {
				invalidate('supabase:auth');
			}
		});

		return () => subscription.unsubscribe();
	});
</script>

<svelte:head>
	<link rel="icon" href={favicon} />
</svelte:head>

{#if currentPath === '/login' || currentPath === '/'}
	<!-- Layout para páginas públicas (login) -->
	{@render children()}
	<Toaster position="top-right" theme="dark" />
{:else if user}
	<!-- Layout para páginas autenticadas -->
	<div class="min-h-screen bg-neutral-950">
		<Header />
		<Sidebar />
		<main class="ml-64 mt-16 p-6">
			<div class="max-w-7xl mx-auto">
				{@render children()}
			</div>
		</main>
	</div>
	<Toaster position="top-right" theme="dark" />
{:else}
	<!-- Loading o redirect -->
	<div class="min-h-screen flex items-center justify-center bg-black">
		<div class="text-center">
			<div class="inline-block animate-spin rounded-full h-12 w-12 border-b-2 border-green-500"></div>
			<p class="mt-4 text-white">Cargando...</p>
		</div>
	</div>
{/if}


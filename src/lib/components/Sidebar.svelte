<script lang="ts">
	import { page } from '$app/stores';
	import { menuState } from '$lib/stores/menu';
	import { sidebarOpen } from '$lib/stores/sidebar';

	const openMenus = $derived($menuState);
	const currentPath = $derived($page.url.pathname);
	const isOpen = $derived($sidebarOpen);

	interface MenuItem {
		title: string;
		icon: string;
		path?: string;
		submenu?: { title: string; path: string }[];
		key?: string;
	}

	const menuItems: MenuItem[] = [
		{
			title: 'Dashboard',
			icon: '📊',
			path: '/dashboard'
		},
		{
			title: 'Catálogos',
			icon: '📚',
			key: 'catalogos',
			submenu: [
				{ title: 'Ubicaciones', path: '/dashboard/catalogos/ubicaciones' }
			]
		},
		{
			title: 'Experiencias',
			icon: '🎯',
			key: 'experiencias',
			submenu: [
				{ title: 'Crear Experiencia', path: '/dashboard/experiencias/crear' },
				{ title: 'Gestionar Experiencia', path: '/dashboard/experiencias/modificar' }
			]
		},
		{
			title: 'Reportes',
			icon: '📈',
			key: 'reportes',
			submenu: [
				{ title: 'Reporte de Ventas', path: '/dashboard/reportes/ventas' },
				{ title: 'Reporte de Experiencias', path: '/dashboard/reportes/experiencias' }
			]
		}
	];

	function toggleMenu(key: string) {
		menuState.toggle(key);
	}

	function isActive(path: string): boolean {
		return currentPath === path;
	}

	// Cierra automáticamente el sidebar al cambiar de ruta
	$effect(() => {
		if (currentPath) {
			sidebarOpen.close();
		}
	});
</script>

{#if isOpen}
	<!-- Backdrop para móvil -->
	<button
		type="button"
		class="fixed inset-0 bg-neutral-950/60 z-40 lg:hidden transition-opacity duration-300"
		onclick={() => sidebarOpen.close()}
		aria-label="Cerrar menú"
	></button>
{/if}

<aside
	class="w-64 bg-black border-r border-green-700 text-white h-screen fixed left-0 top-0 lg:top-16 overflow-y-auto z-50 lg:z-20 transition-transform duration-300 ease-in-out
	{isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
	<!-- Cabecera del Sidebar visible solo en móvil para poder cerrar -->
	<div class="p-4 flex items-center justify-between border-b border-green-700/30 lg:hidden">
		<span class="font-bold text-lg text-white">Nativo Tours</span>
		<button
			onclick={() => sidebarOpen.close()}
			class="p-2 hover:bg-neutral-950 rounded-lg text-gray-400 hover:text-white transition-colors"
			aria-label="Cerrar menú"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
			</svg>
		</button>
	</div>

	<nav class="p-4 space-y-2">
		{#each menuItems as item}
			{#if item.path}
				<!-- Menú simple sin submenú -->
				<a
					href={item.path}
					class="flex items-center space-x-3 px-4 py-3 rounded-lg transition {isActive(item.path)
						? 'bg-green-700 text-white'
						: 'hover:bg-neutral-900'}"
				>
					<span class="text-xl">{item.icon}</span>
					<span class="font-medium">{item.title}</span>
				</a>
			{:else if item.submenu && item.key}
				<!-- Menú con submenú -->
				<div>
					<button
						onclick={() => toggleMenu(item.key!)}
						class="w-full flex items-center justify-between px-4 py-3 rounded-lg hover:bg-neutral-900 transition"
					>
						<div class="flex items-center space-x-3">
							<span class="text-xl">{item.icon}</span>
							<span class="font-medium">{item.title}</span>
						</div>
						<svg
							class="w-5 h-5 transition-transform {openMenus[item.key] ? 'rotate-180' : ''}"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
						</svg>
					</button>
					
					{#if openMenus[item.key]}
						<div class="ml-4 mt-2 space-y-1">
							{#each item.submenu as subitem}
								<a
									href={subitem.path}
									class="block px-4 py-2 rounded-lg text-sm transition {isActive(subitem.path)
										? 'bg-green-700 text-white'
										: 'hover:bg-neutral-900 text-gray-300'}"
								>
									{subitem.title}
								</a>
							{/each}
						</div>
					{/if}
				</div>
			{/if}
		{/each}
	</nav>
</aside>


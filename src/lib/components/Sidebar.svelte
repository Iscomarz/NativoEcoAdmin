<script lang="ts">
	import { page } from '$app/stores';
	import { menuState } from '$lib/stores/menu';
	import { sidebarOpen } from '$lib/stores/sidebar';
	import logoNativo from '$lib/assets/logos/logoNativo.png';

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
			icon: 'ph ph-chart-bar',
			path: '/dashboard'
		},
		{
			title: 'Catálogos',
			icon: 'ph ph-folder',
			key: 'catalogos',
			submenu: [{ title: 'Ubicaciones', path: '/dashboard/catalogos/ubicaciones' }]
		},
		{
			title: 'Experiencias',
			icon: 'ph ph-compass',
			key: 'experiencias',
			submenu: [
				{ title: 'Crear Experiencia', path: '/dashboard/experiencias/crear' },
				{ title: 'Gestionar Experiencia', path: '/dashboard/experiencias/modificar' }
			]
		},
		{
			title: 'Reportes',
			icon: 'ph ph-presentation-chart',
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
		class="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden transition-opacity duration-300"
		onclick={() => sidebarOpen.close()}
		aria-label="Cerrar menú"
	></button>
{/if}

<aside
	class="glass-sidebar w-64 text-white h-screen fixed left-0 top-0 lg:top-16 overflow-y-auto z-50 lg:z-20 transition-transform duration-300 ease-in-out
	{isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}"
>
	<!-- Cabecera del Sidebar visible solo en móvil para poder cerrar -->
	<div class="p-4 flex items-center justify-between border-b border-white/5 lg:hidden">
		<img src={logoNativo} alt="Nativo Tours" class="h-8 w-auto object-contain" />
		<button
			onclick={() => sidebarOpen.close()}
			class="p-2 hover:bg-white/5 rounded-xl text-white/40 hover:text-white transition-all duration-200"
			aria-label="Cerrar menú"
		>
			<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path
					stroke-linecap="round"
					stroke-linejoin="round"
					stroke-width="2"
					d="M6 18L18 6M6 6l12 12"
				/>
			</svg>
		</button>
	</div>

	<nav class="p-4 space-y-1">
		{#each menuItems as item}
			{#if item.path}
				<!-- Menú simple sin submenú -->
				<a href={item.path} class="sidebar-item {isActive(item.path) ? 'sidebar-item-active' : ''}">
					<i class="{item.icon} text-xl"></i>
					<span>{item.title}</span>
				</a>
			{:else if item.submenu && item.key}
				<!-- Menú con submenú -->
				<div>
					<button onclick={() => toggleMenu(item.key!)} class="sidebar-item w-full justify-between">
						<div class="flex items-center gap-3">
							<i class="{item.icon} text-xl"></i>
							<span>{item.title}</span>
						</div>
						<i
							class="ph ph-caret-down text-sm transition-transform duration-200 {openMenus[item.key]
								? 'rotate-180'
								: ''}"
						></i>
					</button>

					{#if openMenus[item.key]}
						<div class="ml-8 mt-1 space-y-0.5">
							{#each item.submenu as subitem}
								<a
									href={subitem.path}
									class="sidebar-subitem {isActive(subitem.path) ? 'sidebar-subitem-active' : ''}"
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

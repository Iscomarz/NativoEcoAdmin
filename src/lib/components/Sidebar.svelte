<script lang="ts">
	import { page } from '$app/stores';
	import { menuState } from '$lib/stores/menu';

	const openMenus = $derived($menuState);
	const currentPath = $derived($page.url.pathname);

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
</script>

<aside class="w-64 bg-black border-r border-green-700 text-white h-screen fixed left-0 top-16 overflow-y-auto">
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

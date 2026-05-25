<script lang="ts">
	import type { Experiencia } from '$lib/services/experienciasService';
	import type { mreserva } from '$lib/services/reservasService';

	let { data }: { data: { experiencias: Experiencia[], reservas: mreserva[] } } = $props();

	const expData = $derived(data.experiencias || []);
	const reservas = $derived(data.reservas || []);

	// Estructura derivada para el reporte
	interface ExperienciaReporte {
		id: number;
		nombre: string;
		reservas: number;
		ingresos: number;
		activo: boolean;
	}

	const experienciasReporte = $derived.by(() => {
		return expData.map(e => {
			const reservasFiltradas = reservas.filter(r => r.experiencia_id === e.id);
			const totalReservas = reservasFiltradas.length;
			const totalIngresos = reservasFiltradas.reduce((sum, r) => sum + (r.total || 0), 0);

			return {
				id: e.id || 0,
				nombre: e.titulo,
				reservas: totalReservas,
				ingresos: totalIngresos,
				activo: e.activo
			};
		}).sort((a, b) => b.reservas - a.reservas);
	});

	const totalExperiencias = $derived(experienciasReporte.length);
	const totalReservas = $derived(experienciasReporte.reduce((sum, e) => sum + e.reservas, 0));
	const totalIngresos = $derived(experienciasReporte.reduce((sum, e) => sum + e.ingresos, 0));
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-white">Reporte de Experiencias</h1>
		<p class="text-green-400 mt-1">Estadísticas de las experiencias disponibles</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Total Experiencias</p>
			<p class="text-3xl font-bold text-white mt-2">{totalExperiencias}</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Total Reservas</p>
			<p class="text-3xl font-bold text-green-500 mt-2">{totalReservas}</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Ingresos Totales</p>
			<p class="text-3xl font-bold text-yellow-500 mt-2">${totalIngresos.toLocaleString()} MXN</p>
		</div>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md overflow-hidden">
		<div class="px-6 py-4 bg-neutral-800 border-b border-green-700">
			<h2 class="text-lg font-semibold text-white">Detalles por Experiencia</h2>
		</div>
		
		<table class="w-full">
			<thead class="bg-neutral-800 border-b border-green-700">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Experiencia</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Reservas</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Ingresos</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-green-900">
				{#each experienciasReporte as exp}
					<tr class="hover:bg-neutral-800">
						<td class="px-6 py-4 text-sm font-medium text-white">{exp.nombre}</td>
						<td class="px-6 py-4 text-sm text-white">{exp.reservas}</td>
						<td class="px-6 py-4 text-sm text-green-500 font-semibold">${exp.ingresos.toLocaleString()} MXN</td>
						<td class="px-6 py-4">
							<span class="px-3 py-1 text-xs font-semibold rounded-full {exp.activo ? 'bg-green-800/30 text-green-400 border border-green-700' : 'bg-red-800/30 text-red-400 border border-red-700'}">
								{exp.activo ? 'Activa' : 'Inactiva'}
							</span>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="4" class="px-6 py-8 text-center text-neutral-500">
							No se han encontrado experiencias.
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
		<h2 class="text-lg font-semibold text-white mb-4">Gráfico de Reservas</h2>
		<div class="space-y-4">
			{#each experienciasReporte as exp}
				<div>
					<div class="flex justify-between mb-1">
						<span class="text-sm font-medium text-white">{exp.nombre}</span>
						<span class="text-sm text-gray-300">
							{exp.reservas} reservas ({totalReservas > 0 ? Math.round((exp.reservas / totalReservas) * 100) : 0}%)
						</span>
					</div>
					<div class="w-full bg-neutral-800 rounded-full h-3">
						<div
							class="bg-green-600 h-3 rounded-full transition-all"
							style="width: {totalReservas > 0 ? (exp.reservas / totalReservas) * 100 : 0}%"
						></div>
					</div>
				</div>
			{:else}
				<p class="text-neutral-500 text-center py-4">No hay datos para graficar.</p>
			{/each}
		</div>
	</div>
</div>


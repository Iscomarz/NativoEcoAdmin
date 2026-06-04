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
		<h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Reporte de Experiencias</h1>
		<p class="text-brand-400/70 mt-1 text-sm sm:text-base">Estadísticas de las experiencias disponibles</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
		<div class="stat-card">
			<p class="text-xs sm:text-sm text-white/50 font-medium">Total Experiencias</p>
			<p class="text-2xl sm:text-3xl font-bold text-white mt-2">{totalExperiencias}</p>
		</div>
		
		<div class="stat-card">
			<p class="text-xs sm:text-sm text-white/50 font-medium">Total Reservas</p>
			<p class="text-2xl sm:text-3xl font-bold text-brand-400 mt-2">{totalReservas}</p>
		</div>
		
		<div class="stat-card col-span-1 sm:col-span-2 md:col-span-1">
			<p class="text-xs sm:text-sm text-white/50 font-medium">Ingresos Totales</p>
			<p class="text-2xl sm:text-3xl font-bold text-brand-300 mt-2">${totalIngresos.toLocaleString()} MXN</p>
		</div>
	</div>

	<div class="glass-card overflow-hidden">
		<div class="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/[0.06]">
			<h2 class="text-base sm:text-lg font-semibold text-white">Detalles por Experiencia</h2>
		</div>
		
		<div class="overflow-x-auto">
			<table class="premium-table min-w-[550px] sm:min-w-0">
				<thead>
					<tr>
						<th>Experiencia</th>
						<th>Reservas</th>
						<th>Ingresos</th>
						<th>Status</th>
					</tr>
				</thead>
				<tbody>
					{#each experienciasReporte as exp}
						<tr>
							<td class="font-medium text-white">{exp.nombre}</td>
							<td class="text-white">{exp.reservas}</td>
							<td class="font-semibold text-brand-400">${exp.ingresos.toLocaleString()} MXN</td>
							<td>
								<span class="{exp.activo ? 'badge-active' : 'badge-inactive'}">
									{exp.activo ? 'Activa' : 'Inactiva'}
								</span>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="4" class="px-6 py-8 text-center text-white/30">
								No se han encontrado experiencias.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>

	<!-- Progress Bars Chart -->
	<div class="glass-card p-5 sm:p-6">
		<h2 class="text-base sm:text-lg font-semibold text-white mb-5">Gráfico de Reservas</h2>
		<div class="space-y-4">
			{#each experienciasReporte as exp}
				<div>
					<div class="flex flex-col sm:flex-row sm:justify-between mb-2 gap-0.5 sm:gap-2">
						<span class="text-sm font-medium text-white/80">{exp.nombre}</span>
						<span class="text-xs sm:text-sm text-white/40">
							{exp.reservas} reservas ({totalReservas > 0 ? Math.round((exp.reservas / totalReservas) * 100) : 0}%)
						</span>
					</div>
					<div class="progress-bar-track h-3">
						<div
							class="progress-bar-fill h-3"
							style="width: {totalReservas > 0 ? (exp.reservas / totalReservas) * 100 : 0}%"
						></div>
					</div>
				</div>
			{:else}
				<p class="text-white/30 text-center py-4">No hay datos para graficar.</p>
			{/each}
		</div>
	</div>
</div>

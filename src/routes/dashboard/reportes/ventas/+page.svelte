<script lang="ts">
	import type { mreserva } from '$lib/services/reservasService';
	import DateRangePicker from '$lib/components/DateRangePicker.svelte';

	interface ReservaConExperiencia extends mreserva {
		cexperiencia?: {
			titulo: string;
		} | null;
	}

	let { data }: { data: { reservas: ReservaConExperiencia[] } } = $props();

	// Estado de filtros
	let fechaInicio = $state('');
	let fechaFin = $state('');

	// Derivar reservas filtradas
	const reservasFiltradas = $derived(() => {
		let filtradas = data.reservas || [];
		
		if (fechaInicio) {
			const inicio = new Date(fechaInicio + 'T00:00:00');
			filtradas = filtradas.filter(r => new Date(r.fecha_reserva) >= inicio);
		}
		
		if (fechaFin) {
			const fin = new Date(fechaFin + 'T23:59:59');
			filtradas = filtradas.filter(r => new Date(r.fecha_reserva) <= fin);
		}
		
		return filtradas;
	});

	// Métricas derivadas de las reservas filtradas
	const totalVentas = $derived(reservasFiltradas().reduce((sum, r) => sum + (r.total || 0), 0));
	const totalCantidad = $derived(reservasFiltradas().length);
	const promedioPorVenta = $derived(totalCantidad > 0 ? Math.round(totalVentas / totalCantidad) : 0);

	function limpiarFiltros() {
		fechaInicio = '';
		fechaFin = '';
	}

	// Helper para formatear fecha de reserva
	function formatearFecha(fechaStr: string): string {
		if (!fechaStr) return '';
		const fecha = new Date(fechaStr);
		return fecha.toLocaleDateString('es-MX', {
			year: 'numeric',
			month: '2-digit',
			day: '2-digit'
		});
	}
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Reporte de Ventas</h1>
		<p class="text-brand-400/70 mt-1 text-sm sm:text-base">Consulta las ventas realizadas</p>
	</div>

	<!-- Filtros de Periodo -->
	<div class="glass-card p-5 sm:p-6 relative z-30 overflow-visible">
		<div class="flex flex-col lg:flex-row lg:items-end gap-6 overflow-visible">
			<div class="flex-1 relative overflow-visible">
				<label class="block text-xs font-medium text-white/50 uppercase tracking-wider mb-2">Filtrar por Periodo</label>
				<DateRangePicker 
					bind:fechaInicio={fechaInicio} 
					bind:fechaFin={fechaFin} 
					onClear={limpiarFiltros}
				/>
			</div>

			<div class="hidden lg:flex items-center text-white/10 self-stretch pb-1">
				<div class="w-px h-8 bg-current"></div>
			</div>

			<div class="text-xs text-white/30 italic lg:pb-3">
				Selecciona un rango de fechas para actualizar las métricas y la tabla automáticamente.
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-5">
		<div class="stat-card">
			<p class="text-xs sm:text-sm text-white/50 font-medium">Total Ventas</p>
			<p class="text-2xl sm:text-3xl font-bold text-brand-400 mt-2">${totalVentas.toLocaleString()} MXN</p>
		</div>
		
		<div class="stat-card">
			<p class="text-xs sm:text-sm text-white/50 font-medium">Total Reservas</p>
			<p class="text-2xl sm:text-3xl font-bold text-white mt-2">{totalCantidad}</p>
		</div>
		
		<div class="stat-card col-span-1 sm:col-span-2 md:col-span-1">
			<p class="text-xs sm:text-sm text-white/50 font-medium">Promedio por Venta</p>
			<p class="text-2xl sm:text-3xl font-bold text-white mt-2">
				${promedioPorVenta.toLocaleString()} MXN
			</p>
		</div>
	</div>

	<div class="glass-card overflow-hidden">
		<div class="px-5 py-4 sm:px-6 sm:py-5 border-b border-white/[0.06] flex justify-between items-center">
			<h2 class="text-base sm:text-lg font-semibold text-white">Detalle de Ventas</h2>
			<span class="text-xs text-white/35">
				Mostrando {totalCantidad} resultados
			</span>
		</div>
		
		<div class="overflow-x-auto">
			<table class="premium-table min-w-[650px] sm:min-w-0">
				<thead>
					<tr>
						<th>Fecha</th>
						<th>Cliente</th>
						<th>Experiencia</th>
						<th class="hidden sm:table-cell">Pax</th>
						<th>Total</th>
					</tr>
				</thead>
				<tbody>
					{#each reservasFiltradas() as reserva}
						<tr>
							<td class="text-white">{formatearFecha(reserva.fecha_reserva)}</td>
							<td>
								<div class="font-medium text-white">{reserva.nombre_cliente || reserva.susuario?.nombre || 'Cliente Registrado'}</div>
								<div class="text-xs text-white/35 mt-0.5">{reserva.correo_cliente || reserva.susuario?.correo || ''}</div>
							</td>
							<td>{reserva.cexperiencia?.titulo || 'Sin experiencia'}</td>
							<td class="hidden sm:table-cell">
								{#if reserva.grupo}
									<i class="ph ph-users inline mr-1"></i> {reserva.cantidad_grupo}
								{:else}
									<i class="ph ph-user inline mr-1"></i> {reserva.numero_cliente || 1}
								{/if}
							</td>
							<td class="font-semibold text-brand-400">${reserva.total.toLocaleString()} MXN</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-6 py-8 text-center text-white/30">
								No se han encontrado registros de ventas en este periodo.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>

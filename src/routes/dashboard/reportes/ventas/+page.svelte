<script lang="ts">
	import type { mreserva } from '$lib/services/reservasService';

	interface ReservaConExperiencia extends mreserva {
		cexperiencia?: {
			titulo: string;
		} | null;
	}

	let { data }: { data: { reservas: ReservaConExperiencia[] } } = $props();

	const reservas = $derived(data.reservas || []);

	// Métricas derivadas de las reservas reales
	const totalVentas = $derived(reservas.reduce((sum, r) => sum + (r.total || 0), 0));
	const totalCantidad = $derived(reservas.length);
	const promedioPorVenta = $derived(totalCantidad > 0 ? Math.round(totalVentas / totalCantidad) : 0);

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
		<h1 class="text-2xl sm:text-3xl font-bold text-white">Reporte de Ventas</h1>
		<p class="text-green-400 mt-1 text-sm sm:text-base">Consulta las ventas realizadas</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 sm:gap-6">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-4 sm:p-6">
			<p class="text-xs sm:text-sm text-green-400">Total Ventas</p>
			<p class="text-2xl sm:text-3xl font-bold text-green-500 mt-2">${totalVentas.toLocaleString()} MXN</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-4 sm:p-6">
			<p class="text-xs sm:text-sm text-green-400">Total Reservas</p>
			<p class="text-2xl sm:text-3xl font-bold text-white mt-2">{totalCantidad}</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-4 sm:p-6 col-span-1 sm:col-span-2 md:col-span-1">
			<p class="text-xs sm:text-sm text-green-400">Promedio por Venta</p>
			<p class="text-2xl sm:text-3xl font-bold text-white mt-2">
				${promedioPorVenta.toLocaleString()} MXN
			</p>
		</div>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md overflow-hidden">
		<div class="px-4 py-3 sm:px-6 sm:py-4 bg-neutral-800 border-b border-green-700">
			<h2 class="text-base sm:text-lg font-semibold text-white">Detalle de Ventas</h2>
		</div>
		
		<div class="overflow-x-auto">
			<table class="w-full min-w-[650px] sm:min-w-0">
				<thead class="bg-neutral-800 border-b border-green-700">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Fecha</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Cliente</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Experiencia</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase hidden sm:table-cell">Pax</th>
						<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Total</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-green-900">
					{#each reservas as reserva}
						<tr class="hover:bg-neutral-800">
							<td class="px-6 py-4 text-sm text-white">{formatearFecha(reserva.fecha_reserva)}</td>
							<td class="px-6 py-4 text-sm text-white font-medium">
								<div>{reserva.nombre_cliente}</div>
								<div class="text-xs text-gray-400 mt-0.5">{reserva.correo_cliente}</div>
							</td>
							<td class="px-6 py-4 text-sm text-gray-300">{reserva.cexperiencia?.titulo || 'Sin experiencia'}</td>
							<td class="px-6 py-4 text-sm text-gray-300 hidden sm:table-cell">
								{reserva.grupo ? `👥 ${reserva.cantidad_grupo}` : `👤 ${reserva.numero_cliente || 1}`}
							</td>
							<td class="px-6 py-4 text-sm font-semibold text-green-500">${reserva.total.toLocaleString()} MXN</td>
						</tr>
					{:else}
						<tr>
							<td colspan="5" class="px-6 py-8 text-center text-neutral-500">
								No se han encontrado registros de ventas.
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	</div>
</div>


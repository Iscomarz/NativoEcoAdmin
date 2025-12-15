<script lang="ts">
	let ventas = [
		{ fecha: '2025-12-01', experiencia: 'Tour en Cenotes', cantidad: 5, total: 7500 },
		{ fecha: '2025-12-02', experiencia: 'Snorkel en Arrecife', cantidad: 3, total: 6000 },
		{ fecha: '2025-12-03', experiencia: 'Visita a Ruinas Mayas', cantidad: 8, total: 9600 }
	];

	let totalVentas = $derived(ventas.reduce((sum, v) => sum + v.total, 0));
	let totalCantidad = $derived(ventas.reduce((sum, v) => sum + v.cantidad, 0));
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-white">Reporte de Ventas</h1>
		<p class="text-green-400 mt-1">Consulta las ventas realizadas</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Total Ventas</p>
			<p class="text-3xl font-bold text-green-500 mt-2">${totalVentas.toLocaleString()} MXN</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Total Reservas</p>
			<p class="text-3xl font-bold text-white mt-2">{totalCantidad}</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Promedio por Venta</p>
			<p class="text-3xl font-bold text-white mt-2">
				${Math.round(totalVentas / totalCantidad).toLocaleString()} MXN
			</p>
		</div>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md overflow-hidden">
		<div class="px-6 py-4 bg-neutral-800 border-b border-green-700">
			<h2 class="text-lg font-semibold text-white">Detalle de Ventas</h2>
		</div>
		
		<table class="w-full">
			<thead class="bg-neutral-800 border-b border-green-700">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Fecha</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Experiencia</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Cantidad</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Total</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-green-900">
				{#each ventas as venta}
					<tr class="hover:bg-neutral-800">
						<td class="px-6 py-4 text-sm text-white">{venta.fecha}</td>
						<td class="px-6 py-4 text-sm font-medium text-white">{venta.experiencia}</td>
						<td class="px-6 py-4 text-sm text-gray-300">{venta.cantidad}</td>
						<td class="px-6 py-4 text-sm font-semibold text-green-500">${venta.total.toLocaleString()} MXN</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

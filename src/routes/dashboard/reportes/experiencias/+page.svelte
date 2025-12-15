<script lang="ts">
	let experiencias = [
		{ nombre: 'Tour en Cenotes', reservas: 45, rating: 4.8, activo: true },
		{ nombre: 'Snorkel en Arrecife', reservas: 32, rating: 4.6, activo: true },
		{ nombre: 'Visita a Ruinas Mayas', reservas: 28, rating: 4.9, activo: false },
		{ nombre: 'Kayak en Manglar', reservas: 15, rating: 4.5, activo: true }
	];

	let totalReservas = $derived(experiencias.reduce((sum, e) => sum + e.reservas, 0));
	let promedioRating = $derived(experiencias.reduce((sum, e) => sum + e.rating, 0) / experiencias.length);
</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-white">Reporte de Experiencias</h1>
		<p class="text-green-400 mt-1">Estadísticas de las experiencias disponibles</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-3 gap-6">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Total Experiencias</p>
			<p class="text-3xl font-bold text-white mt-2">{experiencias.length}</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Total Reservas</p>
			<p class="text-3xl font-bold text-green-500 mt-2">{totalReservas}</p>
		</div>
		
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<p class="text-sm text-green-400">Rating Promedio</p>
			<p class="text-3xl font-bold text-yellow-500 mt-2">⭐ {promedioRating.toFixed(1)}</p>
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
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Rating</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Status</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-green-900">
				{#each experiencias as exp}
					<tr class="hover:bg-neutral-800">
						<td class="px-6 py-4 text-sm font-medium text-white">{exp.nombre}</td>
						<td class="px-6 py-4 text-sm text-white">{exp.reservas}</td>
						<td class="px-6 py-4 text-sm text-yellow-500 font-semibold">⭐ {exp.rating}</td>
						<td class="px-6 py-4">
							<span class="px-3 py-1 text-xs font-semibold rounded-full {exp.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{exp.activo ? 'Activo' : 'Inactivo'}
							</span>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
		<h2 class="text-lg font-semibold text-white mb-4">Gráfico de Reservas</h2>
		<div class="space-y-4">
			{#each experiencias as exp}
				<div>
					<div class="flex justify-between mb-1">
						<span class="text-sm font-medium text-white">{exp.nombre}</span>
						<span class="text-sm text-gray-300">{exp.reservas} reservas</span>
					</div>
					<div class="w-full bg-neutral-800 rounded-full h-3">
						<div
							class="bg-green-600 h-3 rounded-full transition-all"
							style="width: {(exp.reservas / totalReservas) * 100}%"
						></div>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>

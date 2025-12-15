<script lang="ts">
	import { auth } from '$lib/stores/auth';

	const user = $derived($auth);
</script>

<div class="space-y-6">
	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
		<h1 class="text-3xl font-bold text-white mb-2">
			Bienvenido, {user?.name || 'Usuario'}!
		</h1>
		<p class="text-green-400">Panel de administración de Nativo Tours</p>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
		<div class="bg-linear-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm opacity-90">Total Experiencias</p>
					<p class="text-3xl font-bold mt-2">24</p>
				</div>
				<div class="text-4xl opacity-80">🎯</div>
			</div>
		</div>

		<div class="bg-linear-to-br from-green-500 to-green-600 rounded-lg shadow-md p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm opacity-90">Ubicaciones</p>
					<p class="text-3xl font-bold mt-2">12</p>
				</div>
				<div class="text-4xl opacity-80">📍</div>
			</div>
		</div>

		<div class="bg-linear-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm opacity-90">Reservas Hoy</p>
					<p class="text-3xl font-bold mt-2">8</p>
				</div>
				<div class="text-4xl opacity-80">📅</div>
			</div>
		</div>

		<div class="bg-linear-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-sm opacity-90">Reportes</p>
					<p class="text-3xl font-bold mt-2">15</p>
				</div>
				<div class="text-4xl opacity-80">📈</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold text-white mb-4">Accesos Rápidos</h2>
			<div class="space-y-3">
				<a
					href="/dashboard/experiencias/crear"
					class="block p-4 bg-neutral-800 border border-green-800 hover:bg-neutral-700 rounded-lg transition"
				>
					<p class="font-semibold text-green-400">➕ Crear Nueva Experiencia</p>
					<p class="text-sm text-gray-300 mt-1">Agregar una nueva experiencia al catálogo</p>
				</a>
				<a
					href="/dashboard/catalogos/ubicaciones"
					class="block p-4 bg-neutral-800 border border-green-800 hover:bg-neutral-700 rounded-lg transition"
				>
					<p class="font-semibold text-green-400">📚 Gestionar Ubicaciones</p>
					<p class="text-sm text-gray-300 mt-1">Ver y editar ubicaciones disponibles</p>
				</a>
				<a
					href="/dashboard/reportes/ventas"
					class="block p-4 bg-neutral-800 border border-green-800 hover:bg-neutral-700 rounded-lg transition"
				>
					<p class="font-semibold text-green-400">📊 Ver Reportes</p>
					<p class="text-sm text-gray-300 mt-1">Consultar estadísticas y reportes</p>
				</a>
			</div>
		</div>

		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold text-white mb-4">Actividad Reciente</h2>
			<div class="space-y-3">
				<div class="flex items-start space-x-3 p-3 bg-neutral-800 border border-green-800 rounded-lg">
					<span class="text-2xl">✅</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-white">Nueva experiencia creada</p>
						<p class="text-xs text-gray-400 mt-1">Hace 2 horas</p>
					</div>
				</div>
				<div class="flex items-start space-x-3 p-3 bg-neutral-800 border border-green-800 rounded-lg">
					<span class="text-2xl">📝</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-white">Ubicación actualizada</p>
						<p class="text-xs text-gray-400 mt-1">Hace 5 horas</p>
					</div>
				</div>
				<div class="flex items-start space-x-3 p-3 bg-neutral-800 border border-green-800 rounded-lg">
					<span class="text-2xl">📈</span>
					<div class="flex-1">
						<p class="text-sm font-medium text-white">Reporte generado</p>
						<p class="text-xs text-gray-400 mt-1">Hace 1 día</p>
					</div>
				</div>
			</div>
		</div>
	</div>
</div>

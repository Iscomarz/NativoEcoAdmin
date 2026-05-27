<script lang="ts">
	import { auth } from '$lib/stores/auth';
	import type { Experiencia } from '$lib/services/experienciasService';
	import type { Ubicacion } from '$lib/services/ubicacionesService';
	import type { mreserva } from '$lib/services/reservasService';

	let { data }: { data: { experiencias: Experiencia[], ubicaciones: Ubicacion[], reservas: mreserva[] } } = $props();

	const user = $derived($auth);

	const experiencias = $derived(data.experiencias || []);
	const ubicaciones = $derived(data.ubicaciones || []);
	const reservas = $derived(data.reservas || []);

	// Calcular reservas de hoy
	const reservasHoy = $derived(
		reservas.filter(r => {
			if (!r.fecha_reserva) return false;
			const fecha = new Date(r.fecha_reserva);
			const hoyLocal = new Date();
			return (
				fecha.getFullYear() === hoyLocal.getFullYear() &&
				fecha.getMonth() === hoyLocal.getMonth() &&
				fecha.getDate() === hoyLocal.getDate()
			);
		}).length
	);

	interface Actividad {
		id: string;
		tipo: 'reserva' | 'experiencia' | 'ubicacion';
		titulo: string;
		descripcion: string;
		fecha: Date;
		icono: string;
	}

	// Derivar actividades recientes dinámicamente
	const actividadesRecientes = $derived.by(() => {
		const items: Actividad[] = [];

		// Agregar reservas
		reservas.forEach(r => {
			if (r.fecha_reserva) {
				items.push({
					id: `reserva-${r.id || Math.random()}`,
					tipo: 'reserva',
					titulo: `Nueva reserva: ${r.nombre_cliente}`,
					descripcion: `${r.grupo ? '👥 Grupo' : '👤 Individual'} • $${r.total.toLocaleString()} MXN`,
					fecha: new Date(r.fecha_reserva),
					icono: '🎟️'
				});
			}
		});

		// Agregar experiencias creadas recientemente (usando created_at de la base de datos)
		experiencias.forEach(e => {
			const fechaStr = (e as any).created_at;
			if (fechaStr) {
				items.push({
					id: `exp-${e.id || Math.random()}`,
					tipo: 'experiencia',
					titulo: `Nueva experiencia: ${e.titulo}`,
					descripcion: `Capacidad: ${e.capacidad} personas`,
					fecha: new Date(fechaStr),
					icono: '🎯'
				});
			}
		});

		// Agregar ubicaciones creadas recientemente (usando created_at de la base de datos)
		ubicaciones.forEach(u => {
			const fechaStr = (u as any).created_at;
			if (fechaStr) {
				items.push({
					id: `ubi-${u.id_ubicacion || Math.random()}`,
					tipo: 'ubicacion',
					titulo: `Nueva ubicación: ${u.nombre_ubicacion}`,
					descripcion: `${u.estado_ubicacion}, ${u.pais_ubicacion}`,
					fecha: new Date(fechaStr),
					icono: '📍'
				});
			}
		});

		// Ordenar cronológicamente (más recientes primero) y tomar las 4 primeras
		return items
			.sort((a, b) => b.fecha.getTime() - a.fecha.getTime())
			.slice(0, 4);
	});

	// Helper para formatear tiempo relativo
	function tiempoTranscurrido(fecha: Date): string {
		const ahora = new Date();
		const diferenciaMs = ahora.getTime() - fecha.getTime();
		const diferenciaSegundos = Math.floor(diferenciaMs / 1000);
		const diferenciaMinutos = Math.floor(diferenciaSegundos / 60);
		const diferenciaHoras = Math.floor(diferenciaMinutos / 60);
		const diferenciaDias = Math.floor(diferenciaHoras / 24);

		if (diferenciaSegundos < 60) {
			return 'Hace unos instantes';
		} else if (diferenciaMinutos < 60) {
			return `Hace ${diferenciaMinutos} ${diferenciaMinutos === 1 ? 'minuto' : 'minutos'}`;
		} else if (diferenciaHoras < 24) {
			return `Hace ${diferenciaHoras} ${diferenciaHoras === 1 ? 'hora' : 'horas'}`;
		} else {
			return `Hace ${diferenciaDias} ${diferenciaDias === 1 ? 'día' : 'días'}`;
		}
	}
</script>

<div class="space-y-6">
	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-4 sm:p-6">
		<h1 class="text-2xl sm:text-3xl font-bold text-white mb-2">
			Bienvenido, {user?.name || 'Usuario'}!
		</h1>
		<p class="text-sm sm:text-base text-green-400">Panel de administración de Nativo Tours</p>
	</div>

	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
		<div class="bg-linear-to-br from-blue-500 to-blue-600 rounded-lg shadow-md p-4 sm:p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm opacity-90">Total Experiencias</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2">{experiencias.length}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-80">🎯</div>
			</div>
		</div>

		<div class="bg-linear-to-br from-green-500 to-green-600 rounded-lg shadow-md p-4 sm:p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm opacity-90">Ubicaciones</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2">{ubicaciones.length}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-80">📍</div>
			</div>
		</div>

		<div class="bg-linear-to-br from-purple-500 to-purple-600 rounded-lg shadow-md p-4 sm:p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm opacity-90">Reservas Hoy</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2">{reservasHoy}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-80">📅</div>
			</div>
		</div>

		<div class="bg-linear-to-br from-orange-500 to-orange-600 rounded-lg shadow-md p-4 sm:p-6 text-white">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm opacity-90">Total Reservas</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2">{reservas.length}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-80">📈</div>
			</div>
		</div>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-4 sm:p-6">
			<h2 class="text-lg sm:text-xl font-bold text-white mb-4">Accesos Rápidos</h2>
			<div class="space-y-3">
				<a
					href="/dashboard/experiencias/crear"
					class="block p-3.5 sm:p-4 bg-neutral-800 border border-green-800 hover:bg-neutral-700 rounded-lg transition"
				>
					<p class="font-semibold text-green-400 text-sm sm:text-base">➕ Crear Nueva Experiencia</p>
					<p class="text-xs sm:text-sm text-gray-300 mt-1">Agregar una nueva experiencia al catálogo</p>
				</a>
				<a
					href="/dashboard/catalogos/ubicaciones"
					class="block p-3.5 sm:p-4 bg-neutral-800 border border-green-800 hover:bg-neutral-700 rounded-lg transition"
				>
					<p class="font-semibold text-green-400 text-sm sm:text-base">📚 Gestionar Ubicaciones</p>
					<p class="text-xs sm:text-sm text-gray-300 mt-1">Ver y editar ubicaciones disponibles</p>
				</a>
				<a
					href="/dashboard/reportes/ventas"
					class="block p-3.5 sm:p-4 bg-neutral-800 border border-green-800 hover:bg-neutral-700 rounded-lg transition"
				>
					<p class="font-semibold text-green-400 text-sm sm:text-base">📊 Ver Reportes</p>
					<p class="text-xs sm:text-sm text-gray-300 mt-1">Consultar estadísticas y reportes</p>
				</a>
			</div>
		</div>

		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-4 sm:p-6">
			<h2 class="text-lg sm:text-xl font-bold text-white mb-4">Actividad Reciente</h2>
			<div class="space-y-3">
				{#if actividadesRecientes.length === 0}
					<div class="text-center py-8 text-neutral-500 border border-dashed border-neutral-800 rounded-lg text-sm">
						<p>No hay actividad reciente registrada en la plataforma.</p>
					</div>
				{:else}
					{#each actividadesRecientes as actividad (actividad.id)}
						<div class="flex items-start space-x-3 p-3 bg-neutral-800 border border-green-800 rounded-lg">
							<span class="text-xl sm:text-2xl flex-shrink-0">{actividad.icono}</span>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-white truncate">{actividad.titulo}</p>
								<p class="text-xs text-gray-300 mt-0.5 truncate">{actividad.descripcion}</p>
								<p class="text-[10px] sm:text-xs text-green-400 mt-1">{tiempoTranscurrido(actividad.fecha)}</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>


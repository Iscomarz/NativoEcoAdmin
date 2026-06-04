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
				const nombreCliente = r.nombre_cliente || r.susuario?.nombre || 'Cliente Registrado';
				items.push({
					id: `reserva-${r.id || Math.random()}`,
					tipo: 'reserva',
					titulo: `Nueva reserva: ${nombreCliente}`,
					descripcion: `${r.grupo ? 'Grupo' : 'Individual'} • $${r.total.toLocaleString()} MXN`,
					fecha: new Date(r.fecha_reserva),
					icono: 'ph ph-ticket'
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
					icono: 'ph ph-compass'
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
					icono: 'ph ph-map-pin'
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
	<!-- Welcome Card -->
	<div class="glass-card p-6 sm:p-8 relative overflow-hidden">
		<div class="absolute top-0 right-0 w-48 h-48 bg-brand-500/5 rounded-full blur-3xl -translate-y-1/2 translate-x-1/4"></div>
		<h1 class="text-2xl sm:text-3xl font-bold text-white mb-2 relative">
			Bienvenido, {user?.name || 'Usuario'}!
		</h1>
		<p class="text-sm sm:text-base text-brand-400/80 relative">Panel de administración de Nativo Tours</p>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-5">
		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm text-white/50 font-medium">Total Experiencias</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2 text-white">{experiencias.length}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-60 text-brand-400"><i class="ph ph-compass"></i></div>
			</div>
		</div>

		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm text-white/50 font-medium">Ubicaciones</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2 text-brand-400">{ubicaciones.length}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-60 text-brand-400"><i class="ph ph-map-pin"></i></div>
			</div>
		</div>

		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm text-white/50 font-medium">Reservas Hoy</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2 text-white">{reservasHoy}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-60 text-brand-400"><i class="ph ph-calendar"></i></div>
			</div>
		</div>

		<div class="stat-card">
			<div class="flex items-center justify-between">
				<div>
					<p class="text-xs sm:text-sm text-white/50 font-medium">Total Reservas</p>
					<p class="text-2xl sm:text-3xl font-bold mt-2 text-brand-400">{reservas.length}</p>
				</div>
				<div class="text-3xl sm:text-4xl opacity-60 text-brand-400"><i class="ph ph-presentation-chart"></i></div>
			</div>
		</div>
	</div>

	<!-- Bottom Grid -->
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-5">
		<!-- Quick Access -->
		<div class="glass-card p-5 sm:p-6">
			<h2 class="text-lg sm:text-xl font-bold text-white mb-4">Accesos Rápidos</h2>
			<div class="space-y-2.5">
				<a
					href="/dashboard/experiencias/crear"
					class="block p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-brand-500/20 transition-all duration-200 group"
				>
					<p class="font-semibold text-brand-400 text-sm sm:text-base group-hover:text-brand-300 transition-colors flex items-center gap-1.5">
						<i class="ph ph-plus text-lg"></i> Crear Nueva Experiencia
					</p>
					<p class="text-xs sm:text-sm text-white/40 mt-1">Agregar una nueva experiencia al catálogo</p>
				</a>
				<a
					href="/dashboard/catalogos/ubicaciones"
					class="block p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-brand-500/20 transition-all duration-200 group"
				>
					<p class="font-semibold text-brand-400 text-sm sm:text-base group-hover:text-brand-300 transition-colors flex items-center gap-1.5">
						<i class="ph ph-folder text-lg"></i> Gestionar Ubicaciones
					</p>
					<p class="text-xs sm:text-sm text-white/40 mt-1">Ver y editar ubicaciones disponibles</p>
				</a>
				<a
					href="/dashboard/reportes/ventas"
					class="block p-4 rounded-2xl bg-white/[0.03] border border-white/[0.06] hover:bg-white/[0.06] hover:border-brand-500/20 transition-all duration-200 group"
				>
					<p class="font-semibold text-brand-400 text-sm sm:text-base group-hover:text-brand-300 transition-colors flex items-center gap-1.5">
						<i class="ph ph-chart-bar text-lg"></i> Ver Reportes
					</p>
					<p class="text-xs sm:text-sm text-white/40 mt-1">Consultar estadísticas y reportes</p>
				</a>
			</div>
		</div>

		<!-- Recent Activity -->
		<div class="glass-card p-5 sm:p-6">
			<h2 class="text-lg sm:text-xl font-bold text-white mb-4">Actividad Reciente</h2>
			<div class="space-y-2.5">
				{#if actividadesRecientes.length === 0}
					<div class="empty-state">
						<p>No hay actividad reciente registrada en la plataforma.</p>
					</div>
				{:else}
					{#each actividadesRecientes as actividad (actividad.id)}
						<div class="flex items-start space-x-3 p-3.5 rounded-2xl bg-white/[0.03] border border-white/[0.06]">
							<i class="{actividad.icono} text-xl sm:text-2xl flex-shrink-0 text-brand-400 self-center"></i>
							<div class="flex-1 min-w-0">
								<p class="text-sm font-medium text-white/90 truncate">{actividad.titulo}</p>
								<p class="text-xs text-white/40 mt-0.5 truncate">{actividad.descripcion}</p>
								<p class="text-[10px] sm:text-xs text-brand-400/70 mt-1">{tiempoTranscurrido(actividad.fecha)}</p>
							</div>
						</div>
					{/each}
				{/if}
			</div>
		</div>
	</div>
</div>

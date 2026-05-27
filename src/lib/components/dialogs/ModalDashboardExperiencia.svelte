<script lang="ts">
	import type { Experiencia } from '$lib/services/experienciasService';
	import type { Ubicacion } from '$lib/services/ubicacionesService';
	import type { HabitacionConEstado } from '$lib/services/habitacionesService';
	import type { mreserva, MetricasReservas } from '$lib/services/reservasService';
	import { calcularMetricasReservas } from '$lib/services/reservasService';
	import { obtenerEstadoHabitacionesPorExperiencia } from '$lib/services/habitacionesService';
	import { onMount } from 'svelte';
	import { toast } from 'svelte-sonner';

	let {
		experienciaSeleccionada,
		ubicaciones,
		mostrar,
		cargando = $bindable(),
		onClose,
		reservas: reservasProp
	}: {
		experienciaSeleccionada: Experiencia;
		ubicaciones: Ubicacion[];
		mostrar: boolean;
		cargando: boolean;
		onClose: () => void;
		reservas: mreserva[];
	} = $props();

	// Estado
	let habitacionesConEstado = $state<HabitacionConEstado[]>([]);
	let metricas = $state<MetricasReservas | null>(null);
	let cargandoDatos = $state(false);

	// Calcular métricas generales
	$effect(() => {
		if (reservasProp && reservasProp.length >= 0) {
			metricas = calcularMetricasReservas(reservasProp);
		}
	});

	// Cargar datos de habitaciones cuando se muestra el modal
	$effect(() => {
		if (mostrar && experienciaSeleccionada?.id) {
			cargarDatosHabitaciones();
		}
	});

	async function cargarDatosHabitaciones() {
		if (!experienciaSeleccionada?.id) return;

		try {
			cargandoDatos = true;
			habitacionesConEstado = await obtenerEstadoHabitacionesPorExperiencia(
				experienciaSeleccionada.id
			);
		} catch (error) {
			console.error('Error cargando datos:', error);
			toast.error('Error al cargar datos de habitaciones');
		} finally {
			cargandoDatos = false;
		}
	}

	// Calcular porcentaje de ocupación total
	let ocupacionTotal = $derived(() => {
		if (!habitacionesConEstado.length) return 0;
		const total = habitacionesConEstado.reduce(
			(sum, hab) => sum + hab.estadisticas.capacidadTotal,
			0
		);
		const ocupado = habitacionesConEstado.reduce(
			(sum, hab) => sum + hab.estadisticas.ocupadoTotal,
			0
		);
		return total > 0 ? Math.round((ocupado / total) * 100) : 0;
	});

	let disponiblesTotal = $derived(() => {
		return habitacionesConEstado.reduce(
			(sum, hab) => sum + hab.estadisticas.disponibleTotal,
			0
		);
	});

	// Formatear moneda
	function formatearMoneda(cantidad: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(cantidad);
	}
</script>

{#if mostrar}
	<div class="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-2 sm:p-4 animate-fade-in">
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-xl max-w-7xl w-full max-h-[95vh] sm:max-h-[90vh] overflow-hidden flex flex-col">
			<!-- Header -->
			<div class="flex justify-between items-center p-4 sm:p-6 border-b border-green-700">
				<div>
					<h2 class="text-lg sm:text-2xl font-bold text-white flex items-center gap-2">📊 <span class="truncate">Dashboard</span></h2>
					<p class="text-xs sm:text-sm text-green-400 mt-1 truncate max-w-[200px] sm:max-w-md">{experienciaSeleccionada.titulo}</p>
				</div>
				<button
					onclick={onClose}
					class="text-neutral-400 hover:text-white transition text-2xl p-1"
				>
					✕
				</button>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto p-4 sm:p-6 space-y-4 sm:space-y-6">
				<!-- Métricas Generales -->
				<div class="bg-neutral-800 border border-green-700/50 rounded-lg p-4 sm:p-6">
					<h3 class="text-base sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
						<span class="text-xl sm:text-2xl">📈</span> Métricas Generales
					</h3>

					{#if metricas}
						<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
							<!-- Total Ventas -->
							<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
								<div class="text-neutral-400 text-xs sm:text-sm mb-1">Total Ventas</div>
								<div class="text-2xl sm:text-3xl font-bold text-white">{metricas.totalReservas}</div>
								<div class="text-[10px] sm:text-xs text-green-400 mt-1">
									{metricas.reservasConfirmadas} confirmadas
								</div>
							</div>

							<!-- Revenue -->
							<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
								<div class="text-neutral-400 text-xs sm:text-sm mb-1">Ingresos Totales</div>
								<div class="text-xl sm:text-2xl font-bold text-green-400">
									{formatearMoneda(metricas.totalRevenue)}
								</div>
								<div class="text-[10px] sm:text-xs text-neutral-400 mt-1">
									{metricas.pagosLiquidados} liquidados
								</div>
							</div>

							<!-- Ocupado -->
							<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
								<div class="text-neutral-400 text-xs sm:text-sm mb-1">Ocupación</div>
								<div class="text-2xl sm:text-3xl font-bold text-yellow-400">{ocupacionTotal()}%</div>
								<div class="text-[10px] sm:text-xs text-neutral-400 mt-1">
									{metricas.totalPersonas} personas
								</div>
							</div>

							<!-- Disponible -->
							<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
								<div class="text-neutral-400 text-xs sm:text-sm mb-1">Espacios Disponibles</div>
								<div class="text-2xl sm:text-3xl font-bold text-blue-400">{disponiblesTotal()}</div>
								<div class="text-[10px] sm:text-xs text-neutral-400 mt-1">
									Capacidad: {experienciaSeleccionada.capacidad}
								</div>
							</div>
						</div>

						<!-- Métricas adicionales -->
						<div class="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-4">
							<div class="bg-neutral-900 rounded-lg p-3 border border-green-700/30">
								<div class="text-[10px] sm:text-xs text-neutral-400">Clientes Únicos</div>
								<div class="text-lg sm:text-xl font-bold text-white">{metricas.clientesUnicos}</div>
							</div>
							<div class="bg-neutral-900 rounded-lg p-3 border border-green-700/30">
								<div class="text-[10px] sm:text-xs text-neutral-400">Reservas Grupales</div>
								<div class="text-lg sm:text-xl font-bold text-white">{metricas.reservasGrupo}</div>
							</div>
							<div class="bg-neutral-900 rounded-lg p-3 border border-green-700/30">
								<div class="text-[10px] sm:text-xs text-neutral-400">Pagos Pendientes</div>
								<div class="text-lg sm:text-xl font-bold text-orange-400">{metricas.pagosPendientes}</div>
							</div>
						</div>
					{:else}
						<div class="text-center py-8 text-neutral-500 text-sm">
							<p>No hay reservas para esta experiencia</p>
						</div>
					{/if}
				</div>

				<!-- Estado de Habitaciones -->
				<div class="bg-neutral-800 border border-green-700/50 rounded-lg p-4 sm:p-6">
					<h3 class="text-base sm:text-xl font-bold text-white mb-4 flex items-center gap-2">
						<span class="text-xl sm:text-2xl">🏨</span> Estado de Habitaciones
					</h3>

					{#if cargandoDatos}
						<div class="flex items-center justify-center py-12 text-sm">
							<svg class="animate-spin h-8 w-8 text-green-500" viewBox="0 0 24 24">
								<circle
									class="opacity-25"
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="4"
									fill="none"
								></circle>
								<path
									class="opacity-75"
									fill="currentColor"
									d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
								></path>
							</svg>
							<span class="ml-3 text-neutral-400">Cargando datos...</span>
						</div>
					{:else if habitacionesConEstado.length === 0}
						<div class="text-center py-8 text-neutral-500 border-2 border-dashed border-neutral-700 rounded-lg text-sm">
							<p>No hay habitaciones registradas para esta experiencia</p>
						</div>
					{:else}
						<div class="space-y-4">
							{#each habitacionesConEstado as habitacion}
								<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
									<!-- Header de la habitación -->
									<div class="flex flex-col sm:flex-row justify-between sm:items-start mb-3 gap-2">
										<div class="flex-1">
											<h4 class="text-base sm:text-lg font-semibold text-white">{habitacion.nombre}</h4>
											<p class="text-xs sm:text-sm text-neutral-400">
												{habitacion.cantidad_habitacion} habitación(es) • Capacidad: {habitacion.capacidad} persona(s)
											</p>
										</div>
										<div class="text-left sm:text-right">
											<span class="text-xl sm:text-2xl font-bold text-green-400">
												{habitacion.estadisticas.porcentajeOcupacion}%
											</span>
											<span class="text-xs text-neutral-400 ml-1 sm:block sm:ml-0">Ocupación</span>
										</div>
									</div>

									<!-- Barra de progreso -->
									<div class="mb-3">
										<div class="h-6 bg-neutral-800 rounded-full overflow-hidden border border-neutral-700">
											<div
												class="h-full transition-all duration-500 flex items-center justify-center text-xs font-medium"
												class:bg-red-500={habitacion.estadisticas.porcentajeOcupacion >= 90}
												class:bg-yellow-500={habitacion.estadisticas.porcentajeOcupacion >= 70 && habitacion.estadisticas.porcentajeOcupacion < 90}
												class:bg-green-500={habitacion.estadisticas.porcentajeOcupacion < 70}
												style="width: {habitacion.estadisticas.porcentajeOcupacion}%"
											>
												{#if habitacion.estadisticas.porcentajeOcupacion > 15}
													<span class="text-white drop-shadow">
														{habitacion.estadisticas.ocupadoTotal}/{habitacion.estadisticas.capacidadTotal}
													</span>
												{/if}
											</div>
										</div>
									</div>

									<!-- Estadísticas detalladas -->
									<div class="grid grid-cols-3 gap-2 text-center text-xs sm:text-sm">
										<div class="bg-neutral-800 rounded p-2">
											<div class="text-[10px] sm:text-xs text-neutral-400">Llenas</div>
											<div class="text-base sm:text-lg font-bold text-red-400">
												{habitacion.estadisticas.habitacionesLlenas}
											</div>
										</div>
										<div class="bg-neutral-800 rounded p-2">
											<div class="text-[10px] sm:text-xs text-neutral-400">Parciales</div>
											<div class="text-base sm:text-lg font-bold text-yellow-400">
												{habitacion.estadisticas.habitacionesParciales}
											</div>
										</div>
										<div class="bg-neutral-800 rounded p-2">
											<div class="text-[10px] sm:text-xs text-neutral-400">Vacías</div>
											<div class="text-base sm:text-lg font-bold text-green-400">
												{habitacion.estadisticas.habitacionesVacias}
											</div>
										</div>
									</div>

									<!-- Precio -->
									<div class="mt-3 pt-3 border-t border-neutral-700 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs sm:text-sm">
										<div>
											<span class="text-neutral-400 font-medium">Precio/Persona:</span>
											<span class="text-white ml-2">
												{formatearMoneda(habitacion.precioPersona)}
											</span>
										</div>
										<div>
											<span class="text-neutral-400 font-medium">Precio/Cuarto:</span>
											<span class="text-white ml-2">
												{formatearMoneda(habitacion.precioCuarto)}
											</span>
										</div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>

			<!-- Footer -->
			<div class="p-4 border-t border-green-700 flex justify-end">
				<button
					onclick={onClose}
					class="w-full sm:w-auto px-6 py-2.5 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition text-sm text-center"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}
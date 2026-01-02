<script lang="ts">
	import type { Experiencia } from '$lib/services/experienciasService';
	import type { mreserva } from '$lib/services/reservasService';

	let {
		experienciaSeleccionada,
		mostrar,
		cargando = $bindable(),
		onClose,
		reservas
	}: {
		experienciaSeleccionada: Experiencia;
		mostrar: boolean;
		cargando: boolean;
		onClose: () => void;
		reservas: mreserva[];
	} = $props();

	// Formatear fecha
	function formatearFecha(fecha: string): string {
		return new Date(fecha).toLocaleDateString('es-MX', {
			year: 'numeric',
			month: 'long',
			day: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Formatear moneda
	function formatearMoneda(cantidad: number): string {
		return new Intl.NumberFormat('es-MX', {
			style: 'currency',
			currency: 'MXN'
		}).format(cantidad);
	}

	// Obtener texto de estatus
	function obtenerEstatus(estatusId: number): { texto: string; color: string } {
		const estatusMap: Record<number, { texto: string; color: string }> = {
			1: { texto: 'Confirmada', color: 'bg-green-100 text-green-800 border-green-300' },
			2: { texto: 'Pendiente', color: 'bg-yellow-100 text-yellow-800 border-yellow-300' },
			3: { texto: 'Cancelada', color: 'bg-red-100 text-red-800 border-red-300' }
		};
		return estatusMap[estatusId] || { texto: 'Desconocido', color: 'bg-gray-100 text-gray-800' };
	}

	// Obtener método de pago
	function obtenerMetodoPago(metodoPagoId: number): string {
		const metodosMap: Record<number, string> = {
			1: 'Tarjeta',
			2: 'Efectivo',
			3: 'Transferencia',
			4: 'PayPal'
		};
		return metodosMap[metodoPagoId] || 'Otro';
	}

	// Estado de acordeón y búsqueda
	let reservaExpandida = $state<number | null>(null);
	let busqueda = $state('');

	// Filtrar reservas por búsqueda
	let reservasFiltradas = $derived(() => {
		if (!busqueda.trim()) return reservas;
		const termino = busqueda.toLowerCase();
		return reservas.filter(
			(r) =>
				r.nombre_cliente.toLowerCase().includes(termino) ||
				r.correo_cliente.toLowerCase().includes(termino)
		);
	});

	// Calcular totales
	let totalReservas = $derived(reservas.length);
	let totalIngresos = $derived(reservas.reduce((sum, r) => sum + r.total, 0));
	let totalPersonas = $derived(
		reservas.reduce((sum, r) => sum + (r.cantidad_grupo || r.numero_cliente || 0), 0)
	);

	// Toggle acordeón
	function toggleReserva(id: number | undefined) {
		if (!id) return;
		reservaExpandida = reservaExpandida === id ? null : id;
	}
</script>

{#if mostrar}
	<div
		class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4"
	>
		<div
			class="bg-neutral-900 border border-green-700 rounded-lg shadow-xl max-w-7xl w-full max-h-[90vh] overflow-hidden flex flex-col"
		>
			<!-- Header -->
			<div class="flex justify-between items-center p-6 border-b border-green-700">
				<div>
					<h2 class="text-2xl font-bold text-white">📋 Reservas de Experiencia</h2>
					<p class="text-green-400 mt-1">{experienciaSeleccionada.titulo}</p>
				</div>
				<button
					onclick={onClose}
					class="text-neutral-400 hover:text-white transition text-2xl"
				>
					✕
				</button>
			</div>

			<!-- Resumen -->
			<div class="p-6 bg-neutral-800 border-b border-green-700">
				<div class="grid grid-cols-1 md:grid-cols-3 gap-4">
					<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
						<div class="text-neutral-400 text-sm mb-1">Total Reservas</div>
						<div class="text-3xl font-bold text-white">{totalReservas}</div>
					</div>
					<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
						<div class="text-neutral-400 text-sm mb-1">Total Ingresos</div>
						<div class="text-2xl font-bold text-green-400">
							{formatearMoneda(totalIngresos)}
						</div>
					</div>
					<div class="bg-neutral-900 rounded-lg p-4 border border-green-700/30">
						<div class="text-neutral-400 text-sm mb-1">Total Personas</div>
						<div class="text-3xl font-bold text-blue-400">{totalPersonas}</div>
					</div>
				</div>
			</div>

			<!-- Buscador -->
			<div class="px-6 pt-4 pb-2">
				<div class="relative">
					<input
						type="text"
						bind:value={busqueda}
						placeholder="🔍 Buscar por nombre o correo..."
						class="w-full px-4 py-3 bg-neutral-800 border border-green-700/30 rounded-lg text-white placeholder-neutral-500 focus:outline-none focus:border-green-700"
					/>
					{#if busqueda}
						<button
							onclick={() => (busqueda = '')}
							class="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-400 hover:text-white"
						>
							✕
						</button>
					{/if}
				</div>
				<p class="text-sm text-neutral-400 mt-2">
					Mostrando {reservasFiltradas().length} de {reservas.length} reservas
				</p>
			</div>

			<!-- Content -->
			<div class="flex-1 overflow-y-auto px-6 pb-6">
				{#if reservas.length === 0}
					<div
						class="text-center py-12 text-neutral-500 border-2 border-dashed border-neutral-700 rounded-lg"
					>
						<p class="text-lg">No hay reservas registradas para esta experiencia</p>
					</div>
				{:else if reservasFiltradas().length === 0}
					<div
						class="text-center py-12 text-neutral-500 border-2 border-dashed border-neutral-700 rounded-lg"
					>
						<p class="text-lg">No se encontraron reservas con "{busqueda}"</p>
					</div>
				{:else}
					<div class="space-y-2">
						{#each reservasFiltradas() as reserva}
							{@const expandida = reservaExpandida === reserva.id}
							<div
								class="bg-neutral-800 rounded-lg border border-green-700/30 hover:border-green-700/60 transition overflow-hidden"
							>
								<!-- Header colapsado - siempre visible -->
								<button
									onclick={() => toggleReserva(reserva.id)}
									class="w-full px-4 py-3 flex items-center justify-between gap-3 hover:bg-neutral-750 transition text-left"
								>
									<div class="flex items-center gap-3 flex-1 min-w-0">
										<!-- Icono de expansión -->
										<span
											class="text-green-400 text-lg transform transition-transform duration-200 flex-shrink-0"
											class:rotate-90={expandida}
										>
											▶
										</span>

										<!-- Nombre y tipo -->
										<div class="flex-1 min-w-0">
											<h3 class="text-base font-semibold text-white truncate">
												{reserva.nombre_cliente}
											</h3>
											<div class="flex items-center gap-2 text-sm">
												{#if reserva.grupo}
													<span class="text-purple-400">👥 Grupo</span>
													<span class="text-neutral-500">•</span>
													<span class="text-neutral-400">{reserva.cantidad_grupo || 0} personas</span>
												{:else}
													<span class="text-blue-400">👤 Individual</span>
													<span class="text-neutral-500">•</span>
													<span class="text-neutral-400">{reserva.numero_cliente || 0} personas</span>
												{/if}
											</div>
										</div>

										<!-- Total y estatus -->
										<div class="flex items-center gap-3 flex-shrink-0">
											<div class="text-right">
												<div class="text-green-400 font-bold text-base">
													{formatearMoneda(reserva.total)}
												</div>
											</div>
											<span
												class="px-2 py-1 text-xs font-semibold rounded-full border {obtenerEstatus(
													reserva.estatus_id
												).color}"
											>
												{obtenerEstatus(reserva.estatus_id).texto}
											</span>
										</div>
									</div>
								</button>

								<!-- Contenido expandido -->
								{#if expandida}
									<div class="px-4 pb-4 border-t border-neutral-700 animate-slideDown">
										<!-- Email -->
										<div class="pt-3 pb-2">
											<a
												href="mailto:{reserva.correo_cliente}"
												class="text-green-400 hover:text-green-300 text-sm flex items-center gap-2"
											>
												<span>📧</span>
												{reserva.correo_cliente}
											</a>
										</div>

										<!-- Información en grid -->
										<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 mt-2">
											<!-- Fecha de Reserva -->
											<div class="bg-neutral-900 rounded p-3">
												<div class="text-xs text-neutral-400 mb-1">Fecha de Reserva</div>
												<div class="text-sm text-white font-medium">
													{formatearFecha(reserva.fecha_reserva)}
												</div>
											</div>

											<!-- Método de Pago -->
											<div class="bg-neutral-900 rounded p-3">
												<div class="text-xs text-neutral-400 mb-1">Método de Pago</div>
												<div class="text-sm text-white font-medium">
													{obtenerMetodoPago(reserva.metodo_pago_id)}
												</div>
											</div>

											<!-- Precio Unitario -->
											{#if reserva.precio_unitario}
												<div class="bg-neutral-900 rounded p-3">
													<div class="text-xs text-neutral-400 mb-1">Precio Unitario</div>
													<div class="text-sm text-white font-medium">
														{formatearMoneda(reserva.precio_unitario)}
													</div>
												</div>
											{/if}
										</div>

										<!-- Información de pago a plazos -->
										{#if reserva.pago_a_plazos}
											<div class="mt-3 bg-neutral-900 rounded p-3 border border-orange-700/30">
												<div class="flex items-center gap-2">
													<span class="text-orange-400 text-lg">💳</span>
													<div class="flex-1">
														<div class="text-sm font-medium text-white">Pago a Plazos</div>
														<div class="text-xs text-neutral-400 mt-1">
															{reserva.fecha_liquidacion
																? `✓ Liquidado el ${formatearFecha(reserva.fecha_liquidacion)}`
																: '⏳ Pendiente de liquidación'}
														</div>
													</div>
												</div>
											</div>
										{/if}
									</div>
								{/if}
							</div>
						{/each}
					</div>
				{/if}
			</div>

			<!-- Footer -->
			<div class="p-4 border-t border-green-700 flex justify-end">
				<button
					onclick={onClose}
					class="px-6 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition"
				>
					Cerrar
				</button>
			</div>
		</div>
	</div>
{/if}

<style>
	@keyframes slideDown {
		from {
			opacity: 0;
			max-height: 0;
		}
		to {
			opacity: 1;
			max-height: 500px;
		}
	}

	.animate-slideDown {
		animation: slideDown 0.3s ease-out;
	}
</style>

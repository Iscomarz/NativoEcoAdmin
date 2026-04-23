<script lang="ts">
	import type { Experiencia } from "$lib/services/experienciasService";
	import type { Ubicacion } from "$lib/services/ubicacionesService";
	import type { DetalleExperiencia } from "$lib/services/detalleExperienciaService";
	import type { mreserva } from "$lib/services/reservasService";
	import { toast } from "svelte-sonner";
	import { obtenerExperiencias } from '$lib/services/experienciasService';
	import { obtenerDetalleExperienciaPorIdExperiencia } from '$lib/services/detalleExperienciaService';
	import { obtenerHabitacionesByIdExperiencia } from '$lib/services/habitacionesService';
	import {obtenerReservasByExperiencia} from '$lib/services/reservasService';
	import type { chabitacion } from '$lib/services/habitacionesService';
	import ModalEditarExperiencia from '$lib/components/dialogs/ModalEditarExperiencia.svelte';
	import ModalDashboardExperiencia from "$lib/components/dialogs/ModalDashboardExperiencia.svelte";
	import ModalReservasExperiencia from "$lib/components/dialogs/ModalReservasExperiencia.svelte";

	let { data }: { data: { experiencias: Experiencia[], ubicaciones: Ubicacion[] } } = $props();

	let experiencias = $state<Experiencia[]>([]);
	let ubicaciones = $state<Ubicacion[]>([]);
	let experienciaSeleccionada = $state<Experiencia | null>(null);
	let habitacionesExperienciaSeleccionada = $state<chabitacion[]>([]);
	let reservasExperienciaSeleccionada = $state<any[]>([]);
	let mostrarModal = $state(false);
	let mostrarDashboard = $state(false);
	let mostrarReservas = $state(false);
	let cargando = $state(false);

	// Inicializar con los datos del servidor
	$effect(() => {
		experiencias = data.experiencias;
		ubicaciones = data.ubicaciones;
	});

	async function seleccionarExperiencia(exp: Experiencia, tipo: string) {
		experienciaSeleccionada = { ...exp };
		const detalle = await agregarDetalleExperiencia(experienciaSeleccionada.id!);

		// Cargar habitaciones asociadas
		habitacionesExperienciaSeleccionada = await obtenerHabitacionesByIdExperiencia(experienciaSeleccionada.id!);
		experienciaSeleccionada.detalle_experiencia = detalle ?? undefined;

		if(tipo === "editar"){
			mostrarModal = true;
		}else if(tipo === "dashboard"){
			//cargar reservas 
			reservasExperienciaSeleccionada = await obtenerReservasByExperiencia(experienciaSeleccionada.id!);
			mostrarDashboard = true;
		}else if(tipo === "reservas"){
			//cargar reservas 
			reservasExperienciaSeleccionada = await obtenerReservasByExperiencia(experienciaSeleccionada.id!);
			mostrarReservas = true;
		}
		
	}

	function cerrarModal() {
		mostrarModal = false;
		experienciaSeleccionada = null;
	}

	async function agregarDetalleExperiencia(id:number): Promise<DetalleExperiencia | null> {
		try {
			const detalle: DetalleExperiencia = await obtenerDetalleExperienciaPorIdExperiencia(id);
			return detalle;
		} catch (error) {
			console.error('Error al obtener el detalle de la experiencia:', error);
			return null;
		}
	}

	async function recargarExperiencias() {
		try {
			const nuevasExperiencias = await obtenerExperiencias();
			experiencias = nuevasExperiencias;
		} catch (error) {
			console.error('Error recargando experiencias:', error);
			toast.error('Error al recargar experiencias');
		}
	}

	async function manejarGuardado() {
		await recargarExperiencias();
	}

	async function eliminarExperiencia(id: number, titulo: string) {
		if (
			!confirm(
				`¿Estás seguro de eliminar la experiencia "${titulo}"? \n\n¡ADVERTENCIA! Se eliminarán de forma PERMANENTE sus detalles, habitaciones, reservas e IMÁGENES asociadas.`
			)
		)
			return;

		try {
			cargando = true;
			const formData = new FormData();
			formData.append('id', id.toString());

			const response = await fetch('?/eliminar', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			
			if (result.type === 'success' || result.success) {
				toast.success('Experiencia y recursos asociados eliminados');
				await recargarExperiencias();
			} else if (result.type === 'failure' || result.type === 'error') {
				// SvelteKit serializa el error en result.data si es un failure
				let message = 'Error al eliminar la experiencia';
				
				if (result.data) {
					try {
						// Si data es un string JSON (común en SvelteKit fail)
						const parsedData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
						
						// SvelteKit usa devalue. Buscamos el primer string en el array, que suele ser el mensaje
						if (Array.isArray(parsedData)) {
							const stringMsg = parsedData.find(i => typeof i === 'string');
							if (stringMsg) message = stringMsg;
						} else if (parsedData.message) {
							message = String(parsedData.message);
						}
					} catch (e) {
						console.error('Error al parsear el mensaje de error:', e);
					}
				} else if (result.message) {
					message = result.message;
				}
				
				toast.error(String(message), { duration: 6000 });
			} else {
				toast.error('Error al procesar la eliminación');
			}
		} catch (error) {
			console.error('Error:', error);
			toast.error('Error al procesar la eliminación');
		} finally {
			cargando = false;
		}
	}

</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-white">Modificar Experiencia</h1>
		<p class="text-green-400 mt-1">Selecciona una experiencia para editarla</p>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md overflow-hidden">
		<table class="w-full">
			<thead class="bg-neutral-800 border-b border-green-700">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Nombre</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Ubicación</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Capacidad</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Status</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Acción</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-green-900">
				{#each experiencias as exp}
					<tr class="hover:bg-neutral-800">
						<td class="px-6 py-4 text-sm font-medium text-white">{exp.titulo}</td>
						<td class="px-6 py-4 text-sm text-gray-300">{exp.cubicacion?.nombre_ubicacion || 'Sin ubicación'}</td>
						<td class="px-6 py-4 text-sm text-white">{exp.capacidad}</td>
						<td class="px-6 py-4">
							<div class="flex flex-col gap-1">
								<span class="px-3 py-1 text-xs font-semibold rounded-full w-fit {exp.activo ? 'bg-green-800/30 text-green-400 border border-green-700' : 'bg-red-800/30 text-red-400 border border-red-700'}">
									{exp.activo ? 'Activa' : 'Inactiva'}
								</span>
								{#if exp.oculto}
									<span class="px-3 py-1 text-xs font-semibold rounded-full w-fit bg-yellow-800/30 text-yellow-400 border border-yellow-700">
										Oculta
									</span>
								{/if}
							</div>
						</td>
						<td>
							<div class="flex gap-2">
								<button
									onclick={() => seleccionarExperiencia(exp,"editar")}
									class="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50 text-sm"
									disabled={cargando}
								>
									Editar
								</button>
								<button
									onclick={() => seleccionarExperiencia(exp,"dashboard")}
									class="px-4 py-2 bg-blue-700 hover:bg-blue-600 text-white rounded-lg transition disabled:opacity-50 text-sm"
									disabled={cargando}
								>
									Dashboard
								</button>
								<button
									onclick={() => seleccionarExperiencia(exp, 'reservas')}
									class="px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white rounded-lg transition disabled:opacity-50 text-sm"
									disabled={cargando}
								>
									Reservas
								</button>
								<button
									onclick={() => eliminarExperiencia(exp.id!, exp.titulo)}
									class="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition disabled:opacity-50 text-sm"
									disabled={cargando}
								>
									Eliminar
								</button>
							</div>
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

<!-- Modal de Edición usando el componente -->
{#if mostrarModal && experienciaSeleccionada}
	<ModalEditarExperiencia
		experienciaSeleccionada={experienciaSeleccionada}
		ubicaciones={ubicaciones}
		mostrar={mostrarModal}
		bind:cargando
		onClose={cerrarModal}
		onSaved={manejarGuardado}
		habitaciones={habitacionesExperienciaSeleccionada}
	/>
{/if}

<!-- Modal de Reservas usando el componente -->
{#if mostrarReservas && experienciaSeleccionada}
	<ModalReservasExperiencia
		experienciaSeleccionada={experienciaSeleccionada}
		mostrar={mostrarReservas}
		bind:cargando
		onClose={() => {mostrarReservas = false; experienciaSeleccionada = null;}}
		reservas={reservasExperienciaSeleccionada}
	/>
{/if}

<!-- Modal de Dashboard usando el componente -->
{#if mostrarDashboard && experienciaSeleccionada}
<ModalDashboardExperiencia
		experienciaSeleccionada={experienciaSeleccionada}
		ubicaciones={ubicaciones}
		mostrar={mostrarDashboard}
		bind:cargando
		onClose={() => {mostrarDashboard = false; experienciaSeleccionada = null;}}
		
		reservas={reservasExperienciaSeleccionada}
	/>
{/if}

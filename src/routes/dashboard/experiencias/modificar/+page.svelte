<script lang="ts">
	import type { Experiencia } from "$lib/services/experienciasService";
	import type { Ubicacion } from "$lib/services/ubicacionesService";
	import type { DetalleExperiencia } from "$lib/services/detalleExperienciaService";
	import type { mreserva } from "$lib/services/reservasService";
	import { toast } from "svelte-sonner";
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
		try {
			const resHab = await fetch(`/api/experiencias/${experienciaSeleccionada.id}/habitaciones`);
			if (resHab.ok) {
				habitacionesExperienciaSeleccionada = await resHab.json();
			} else {
				habitacionesExperienciaSeleccionada = [];
			}
		} catch (err) {
			console.error('Error cargando habitaciones:', err);
			habitacionesExperienciaSeleccionada = [];
		}
		
		experienciaSeleccionada.detalle_experiencia = detalle ?? undefined;

		if(tipo === "editar"){
			mostrarModal = true;
		}else if(tipo === "dashboard"){
			//cargar reservas 
			try {
				const resRes = await fetch(`/api/experiencias/${experienciaSeleccionada.id}/reservas`);
				if (resRes.ok) {
					reservasExperienciaSeleccionada = await resRes.json();
				} else {
					reservasExperienciaSeleccionada = [];
				}
			} catch (err) {
				console.error('Error cargando reservas:', err);
				reservasExperienciaSeleccionada = [];
			}
			mostrarDashboard = true;
		}else if(tipo === "reservas"){
			//cargar reservas 
			try {
				const resRes = await fetch(`/api/experiencias/${experienciaSeleccionada.id}/reservas`);
				if (resRes.ok) {
					reservasExperienciaSeleccionada = await resRes.json();
				} else {
					reservasExperienciaSeleccionada = [];
				}
			} catch (err) {
				console.error('Error cargando reservas:', err);
				reservasExperienciaSeleccionada = [];
			}
			mostrarReservas = true;
		}
	}

	function cerrarModal() {
		mostrarModal = false;
		experienciaSeleccionada = null;
	}

	async function agregarDetalleExperiencia(id:number): Promise<DetalleExperiencia | null> {
		try {
			const res = await fetch(`/api/experiencias/${id}/detalle`);
			if (!res.ok) throw new Error('Error al obtener detalle');
			const detalle: DetalleExperiencia = await res.json();
			return detalle;
		} catch (error) {
			console.error('Error al obtener el detalle de la experiencia:', error);
			return null;
		}
	}

	async function recargarExperiencias() {
		try {
			const res = await fetch('/api/experiencias');
			if (!res.ok) throw new Error('Error al recargar');
			const nuevasExperiencias = await res.json();
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
		<h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Modificar Experiencia</h1>
		<p class="text-brand-400/70 mt-1 text-sm sm:text-base">Selecciona una experiencia para editarla</p>
	</div>

	<div class="glass-card overflow-hidden">
		<div class="overflow-x-auto">
			<table class="premium-table min-w-[850px] sm:min-w-0">
				<thead>
					<tr>
						<th>Nombre</th>
						<th>Ubicación</th>
						<th>Capacidad</th>
						<th>Status</th>
						<th>Acción</th>
					</tr>
				</thead>
				<tbody>
					{#each experiencias as exp}
						<tr>
							<td class="font-medium text-white">{exp.titulo}</td>
							<td>{exp.cubicacion?.nombre_ubicacion || 'Sin ubicación'}</td>
							<td class="text-white">{exp.capacidad}</td>
							<td>
								<div class="flex flex-col gap-1.5">
									<span class="{exp.activo ? 'badge-active' : 'badge-inactive'} w-fit">
										{exp.activo ? 'Activa' : 'Inactiva'}
									</span>
									{#if exp.oculto}
										<span class="badge-hidden w-fit">
											Oculta
										</span>
									{/if}
								</div>
							</td>
							<td>
								<div class="flex flex-wrap gap-1.5">
									<button
										onclick={() => seleccionarExperiencia(exp,"editar")}
										class="btn-primary px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5"
										disabled={cargando}
									>
										<i class="ph ph-pencil-simple"></i> Editar
									</button>
									<button
										onclick={() => seleccionarExperiencia(exp,"dashboard")}
										class="btn-info px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5"
										disabled={cargando}
									>
										<i class="ph ph-presentation-chart"></i> Dashboard
									</button>
									<button
										onclick={() => seleccionarExperiencia(exp, 'reservas')}
										class="btn-purple px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5"
										disabled={cargando}
									>
										<i class="ph ph-list-bullets"></i> Reservas
									</button>
									<button
										onclick={() => eliminarExperiencia(exp.id!, exp.titulo)}
										class="btn-danger px-2.5 py-1.5 sm:px-4 sm:py-2 text-xs sm:text-sm flex items-center gap-1.5"
										disabled={cargando}
									>
										<i class="ph ph-trash"></i> Eliminar
									</button>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
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

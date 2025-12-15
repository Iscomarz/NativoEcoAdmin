<script lang="ts">
	import type { Experiencia } from "$lib/services/experienciasService";
	import type { Ubicacion } from "$lib/services/ubicacionesService";
	import type { DetalleExperiencia } from "$lib/services/detalleExperienciaService";
	import { toast } from "svelte-sonner";
	import { obtenerExperiencias } from '$lib/services/experienciasService';
	import { obtenerDetalleExperienciaPorIdExperiencia } from '$lib/services/detalleExperienciaService';
	import ModalEditarExperiencia from '$lib/components/dialogs/ModalEditarExperiencia.svelte';

	let { data }: { data: { experiencias: Experiencia[], ubicaciones: Ubicacion[] } } = $props();

	let experiencias = $state<Experiencia[]>([]);
	let ubicaciones = $state<Ubicacion[]>([]);
	let experienciaSeleccionada = $state<Experiencia | null>(null);
	let mostrarModal = $state(false);
	let cargando = $state(false);

	// Inicializar con los datos del servidor
	$effect(() => {
		experiencias = data.experiencias;
		ubicaciones = data.ubicaciones;
	});

	async function seleccionarExperiencia(exp: Experiencia) {
		experienciaSeleccionada = { ...exp };
		const detalle = await agregarDetalleExperiencia(experienciaSeleccionada.id!);
		experienciaSeleccionada.detalle_experiencia = detalle ?? undefined;
		mostrarModal = true;
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
							<span class="px-3 py-1 text-xs font-semibold rounded-full {exp.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{exp.activo ? 'Activo' : 'Inactivo'}
							</span>
						</td>
						<td class="px-6 py-4">
							<button
								onclick={() => seleccionarExperiencia(exp)}
								class="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg transition disabled:opacity-50"
								disabled={cargando}
							>
								Editar
							</button>
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
	/>
{/if}

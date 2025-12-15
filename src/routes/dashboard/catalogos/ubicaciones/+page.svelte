<script lang="ts">
	import type { PageData } from './$types';
	import type { Ubicacion } from '$lib/services/ubicacionesService';
	import { obtenerUbicacionConDetalle } from '$lib/services/ubicacionesService';
	import ModalEditarUbicacion from '$lib/components/dialogs/ModalEditarUbicacion.svelte';
	import { toast } from 'svelte-sonner';

	let { data }: { data: PageData } = $props();

	let ubicaciones = $state<Ubicacion[]>([]);
	let ubicacionSeleccionada = $state<Ubicacion | null>(null);
	let mostrarModal = $state(false);
	let modoCrear = $state(false);
	let cargando = $state(false);

	// Inicializar ubicaciones desde data
	$effect(() => {
		ubicaciones = data.ubicaciones || [];
	});

	async function seleccionarUbicacion(ubicacion: Ubicacion) {
		try {
			cargando = true;
			// Cargar detalle completo
			const ubicacionCompleta = await obtenerUbicacionConDetalle(ubicacion.id_ubicacion);
			if (ubicacionCompleta) {
				ubicacionSeleccionada = ubicacionCompleta;
				modoCrear = false;
				mostrarModal = true;
			}
		} catch (error) {
			console.error('Error cargando ubicación:', error);
			toast.error('Error al cargar la ubicación');
		} finally {
			cargando = false;
		}
	}

	function abrirModalCrear() {
		ubicacionSeleccionada = null;
		modoCrear = true;
		mostrarModal = true;
	}

	function cerrarModal() {
		mostrarModal = false;
		ubicacionSeleccionada = null;
		modoCrear = false;
	}

	async function recargarUbicaciones() {
		try {
			// Recargar datos sin refrescar la página
			const { obtenerUbicacionesConDetalle } = await import('$lib/services/ubicacionesService');
			const ubicacionesActualizadas = await obtenerUbicacionesConDetalle();
			ubicaciones = ubicacionesActualizadas;
		} catch (error) {
			console.error('Error recargando ubicaciones:', error);
			toast.error('Error al recargar ubicaciones');
		}
	}

	async function manejarGuardado() {
		await recargarUbicaciones();
	}

</script>

<div class="space-y-6">
	<div class="flex justify-between items-center">
		<div>
			<h1 class="text-3xl font-bold text-white">Ubicaciones</h1>
			<p class="text-green-400 mt-1">Gestiona las ubicaciones disponibles</p>
		</div>
		<button
			onclick={abrirModalCrear}
			class="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-md"
		>
			➕ Nueva Ubicación
		</button>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md overflow-hidden">
		<table class="w-full">
			<thead class="bg-neutral-800 border-b border-green-700">
				<tr>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">ID</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Nombre</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Estado</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">País</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Status</th>
					<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase">Acciones</th>
				</tr>
			</thead>
			<tbody class="divide-y divide-green-900">
				{#each ubicaciones as ubicacion}
					<tr class="hover:bg-neutral-800">
						<td class="px-6 py-4 text-sm text-white">{ubicacion.id_ubicacion}</td>
						<td class="px-6 py-4 text-sm font-medium text-white">{ubicacion.nombre_ubicacion}</td>
						<td class="px-6 py-4 text-sm text-gray-300">{ubicacion.estado_ubicacion}</td>
						<td class="px-6 py-4 text-sm text-gray-300">{ubicacion.pais_ubicacion}</td>
						<td class="px-6 py-4">
							<span class="px-3 py-1 text-xs font-semibold rounded-full {ubicacion.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
								{ubicacion.activo ? 'Activo' : 'Inactivo'}
							</span>
						</td>
						<td class="px-6 py-4 text-sm">
							<button
								onclick={() => seleccionarUbicacion(ubicacion)}
								disabled={cargando}
								class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition disabled:opacity-50"
							>
								Editar
							</button>
						</td>
					</tr>
				{:else}
					<tr>
						<td colspan="6" class="px-6 py-8 text-center text-neutral-500">
							No hay ubicaciones registradas
						</td>
					</tr>
				{/each}
			</tbody>
		</table>
	</div>
</div>

{#if mostrarModal}
	<ModalEditarUbicacion
		{ubicacionSeleccionada}
		{mostrarModal}
		{modoCrear}
		bind:cargando
		onClose={cerrarModal}
		onSaved={manejarGuardado}
	/>
{/if}

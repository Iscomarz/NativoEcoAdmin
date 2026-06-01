<script lang="ts">
	import type { PageData } from './$types';
	import type { Ubicacion } from '$lib/services/ubicacionesService';
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
			// Cargar detalle completo desde la API del servidor
			const res = await fetch(`/api/ubicaciones/${ubicacion.id_ubicacion}/detalle`);
			if (!res.ok) throw new Error('Error al cargar detalle');
			const ubicacionCompleta = await res.json();
			
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
			// Recargar datos sin refrescar la página llamando a la API del servidor
			const res = await fetch('/api/ubicaciones?conDetalle=true');
			if (!res.ok) throw new Error('Error al recargar');
			const ubicacionesActualizadas = await res.json();
			ubicaciones = ubicacionesActualizadas;
		} catch (error) {
			console.error('Error recargando ubicaciones:', error);
			toast.error('Error al recargar ubicaciones');
		}
	}

	async function manejarGuardado() {
		await recargarUbicaciones();
	}

	async function eliminarUbicacion(id: number, nombre: string) {
		if (
			!confirm(
				`¿Estás seguro de eliminar la ubicación "${nombre}"? \n\n¡ADVERTENCIA! Se eliminarán de forma PERMANENTE todas las experiencias, habitaciones, reservas e IMÁGENES asociadas a esta ubicación.`
			)
		)
			return;

		try {
			cargando = true;
			const formData = new FormData();
			formData.append('id_ubicacion', id.toString());

			const response = await fetch('?/eliminar', {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			
			if (result.type === 'success' || result.success) {
				toast.success('Ubicación y recursos asociados eliminados');
				await recargarUbicaciones();
			} else if (result.type === 'failure' || result.type === 'error') {
				let message = 'Error al eliminar la ubicación';
				
				if (result.data) {
					try {
						const parsedData = typeof result.data === 'string' ? JSON.parse(result.data) : result.data;
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
	<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-white">Ubicaciones</h1>
			<p class="text-green-400 mt-1 text-sm sm:text-base">Gestiona las ubicaciones disponibles</p>
		</div>
		<button
			onclick={abrirModalCrear}
			class="px-4 py-2.5 sm:px-6 sm:py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition shadow-md self-start sm:self-auto text-sm sm:text-base"
		>
			➕ Nueva Ubicación
		</button>
	</div>

	<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md overflow-hidden">
		<div class="overflow-x-auto">
			<table class="w-full min-w-[700px] sm:min-w-0">
				<thead class="bg-neutral-800 border-b border-green-700">
					<tr>
						<th class="px-6 py-3 text-left text-xs font-medium text-green-400 uppercase hidden sm:table-cell">ID</th>
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
							<td class="px-6 py-4 text-sm text-white hidden sm:table-cell">{ubicacion.id_ubicacion}</td>
							<td class="px-6 py-4 text-sm font-medium text-white">{ubicacion.nombre_ubicacion}</td>
							<td class="px-6 py-4 text-sm text-gray-300">{ubicacion.estado_ubicacion}</td>
							<td class="px-6 py-4 text-sm text-gray-300">{ubicacion.pais_ubicacion}</td>
							<td class="px-6 py-4">
								<span class="px-3 py-1 text-xs font-semibold rounded-full {ubicacion.activo ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}">
									{ubicacion.activo ? 'Activo' : 'Inactivo'}
								</span>
								{#if ubicacion.oculto}
									<span class="ml-2 px-3 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
										Oculto
									</span>
								{/if}
							</td>
							<td class="px-6 py-4 text-sm flex gap-2">
								<button
									onclick={() => seleccionarUbicacion(ubicacion)}
									disabled={cargando}
									class="px-3 py-1 bg-yellow-500 hover:bg-yellow-600 text-white rounded transition disabled:opacity-50"
								>
									Editar
								</button>
								<button
									onclick={() => eliminarUbicacion(ubicacion.id_ubicacion, ubicacion.nombre_ubicacion)}
									disabled={cargando}
									class="px-3 py-1 bg-red-600 hover:bg-red-700 text-white rounded transition disabled:opacity-50"
								>
									Eliminar
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

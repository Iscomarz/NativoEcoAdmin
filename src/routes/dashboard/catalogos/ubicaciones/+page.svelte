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
			<h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Ubicaciones</h1>
			<p class="text-brand-400/70 mt-1 text-sm sm:text-base">Gestiona las ubicaciones disponibles</p>
		</div>
		<button
			onclick={abrirModalCrear}
			class="btn-primary px-4 py-2.5 sm:px-6 sm:py-3 self-start sm:self-auto text-sm sm:text-base flex items-center gap-1.5"
		>
			<i class="ph ph-plus"></i> Nueva Ubicación
		</button>
	</div>

	<div class="glass-card overflow-hidden">
		<div class="overflow-x-auto">
			<table class="premium-table min-w-[700px] sm:min-w-0">
				<thead>
					<tr>
						<th class="hidden sm:table-cell">ID</th>
						<th>Nombre</th>
						<th>Estado</th>
						<th>País</th>
						<th>Status</th>
						<th>Acciones</th>
					</tr>
				</thead>
				<tbody>
					{#each ubicaciones as ubicacion}
						<tr>
							<td class="hidden sm:table-cell">{ubicacion.id_ubicacion}</td>
							<td class="font-medium text-white">{ubicacion.nombre_ubicacion}</td>
							<td>{ubicacion.estado_ubicacion}</td>
							<td>{ubicacion.pais_ubicacion}</td>
							<td>
								<span class="{ubicacion.activo ? 'badge-active' : 'badge-inactive'}">
									{ubicacion.activo ? 'Activo' : 'Inactivo'}
								</span>
								{#if ubicacion.oculto}
									<span class="badge-hidden ml-2">
										Oculto
									</span>
								{/if}
							</td>
							<td>
								<div class="flex gap-2">
									<button
										onclick={() => seleccionarUbicacion(ubicacion)}
										disabled={cargando}
										class="btn-warning px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5"
									>
										<i class="ph ph-pencil-simple"></i> Editar
									</button>
									<button
										onclick={() => eliminarUbicacion(ubicacion.id_ubicacion, ubicacion.nombre_ubicacion)}
										disabled={cargando}
										class="btn-danger px-3 py-1.5 text-xs sm:text-sm flex items-center gap-1.5"
									>
										<i class="ph ph-trash"></i> Eliminar
									</button>
								</div>
							</td>
						</tr>
					{:else}
						<tr>
							<td colspan="6" class="px-6 py-8 text-center text-white/30">
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

<script lang="ts">
	import type { Ubicacion } from '$lib/services/ubicacionesService';
	import { toast } from 'svelte-sonner';
	import { supabase } from '$lib/supabaseClient';
	import { optimizarImagenes } from '$lib/helpers/imageOptimizer';

	let {
		ubicacionSeleccionada = null,
		mostrarModal,
		modoCrear = false,
		cargando = $bindable(),
		onClose,
		onSaved
	}: {
		ubicacionSeleccionada?: Ubicacion | null;
		mostrarModal: boolean;
		modoCrear?: boolean;
		cargando: boolean;
		onClose: () => void;
		onSaved: () => Promise<void>;
	} = $props();

	// Portada (solo una imagen)
	let portadaExistente = $state<string>('');
	let portadaNueva = $state<File | null>(null);
	let previewPortada = $state<string>('');

	// Galería (múltiples imágenes)
	let imagenesExistentes = $state<string[]>([]);
	let imagenesNuevas = $state<File[]>([]);
	let previewsNuevas = $state<string[]>([]);

	// Campos de información general
	let nombre_ubicacion = $state('');
	let estado_ubicacion = $state('');
	let pais_ubicacion = $state('');
	let activo = $state(false);
	let oculto = $state(false);

	// Campos de detalle
	let descripcion_larga = $state('');
	let historia = $state('');

	let optimizando = $state(false);

	// Cargar datos cuando cambie ubicacionSeleccionada o modoCrear
	$effect(() => {
		if (modoCrear) {
			// Limpiar todos los campos para crear
			nombre_ubicacion = '';
			estado_ubicacion = '';
			pais_ubicacion = '';
			activo = false;
			oculto = false;
			portadaExistente = '';
			portadaNueva = null;
			previewPortada = '';
			descripcion_larga = '';
			historia = '';
			imagenesExistentes = [];
			imagenesNuevas = [];
			previewsNuevas = [];
		} else if (ubicacionSeleccionada) {
			// Cargar datos para editar
			nombre_ubicacion = ubicacionSeleccionada.nombre_ubicacion || '';
			estado_ubicacion = ubicacionSeleccionada.estado_ubicacion || '';
			pais_ubicacion = ubicacionSeleccionada.pais_ubicacion || '';
			activo = ubicacionSeleccionada.activo || false;
			oculto = ubicacionSeleccionada.oculto || false;

			// Portada (primer elemento del array)
			portadaExistente = ubicacionSeleccionada.portada?.[0] || '';
			portadaNueva = null;
			previewPortada = '';

			// Cargar detalle si existe
			if (ubicacionSeleccionada.detalle_ubicacion) {
				const detalle = Array.isArray(ubicacionSeleccionada.detalle_ubicacion)
					? ubicacionSeleccionada.detalle_ubicacion[0]
					: ubicacionSeleccionada.detalle_ubicacion;

				descripcion_larga = detalle?.descripcion_larga || '';
				historia = detalle?.historia || '';
				imagenesExistentes = detalle?.imagenes || [];
			} else {
				descripcion_larga = '';
				historia = '';
				imagenesExistentes = [];
			}

			imagenesNuevas = [];
			previewsNuevas = [];
		}
	});

	// Manejar selección de portada
	async function manejarPortada(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const file = input.files[0];
		if (!file.type.startsWith('image/')) {
			toast.error('Solo se permiten archivos de imagen');
			return;
		}

		try {
			optimizando = true;
			const [optimizada] = await optimizarImagenes([file]);
			portadaNueva = optimizada;

			// Crear preview
			const reader = new FileReader();
			reader.onload = (e) => {
				previewPortada = e.target?.result as string;
			};
			reader.readAsDataURL(optimizada);

			toast.success('Portada optimizada');
		} catch (error) {
			console.error('Error procesando portada:', error);
			toast.error('Error al procesar la portada');
		} finally {
			optimizando = false;
			input.value = '';
		}
	}

	// Eliminar portada nueva
	function eliminarPortadaNueva() {
		portadaNueva = null;
		previewPortada = '';
		toast.success('Portada eliminada');
	}

	// Manejar selección de imágenes de galería
	async function manejarImagenes(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const archivos = Array.from(input.files);
		const archivosValidos = archivos.filter(file => file.type.startsWith('image/'));

		if (archivosValidos.length !== archivos.length) {
			toast.error('Solo se permiten archivos de imagen');
			return;
		}

		try {
			optimizando = true;
			const imagenesOptimizadas = await optimizarImagenes(archivosValidos);
			imagenesNuevas = [...imagenesNuevas, ...imagenesOptimizadas];

			const nuevosPreviews = await Promise.all(
				imagenesOptimizadas.map(file => {
					return new Promise<string>((resolve) => {
						const reader = new FileReader();
						reader.onload = (e) => resolve(e.target?.result as string);
						reader.readAsDataURL(file);
					});
				})
			);

			previewsNuevas = [...previewsNuevas, ...nuevosPreviews];
			toast.success(`${imagenesOptimizadas.length} imagen(es) agregada(s)`);
		} catch (error) {
			console.error('Error procesando imágenes:', error);
			toast.error('Error al procesar las imágenes');
		} finally {
			optimizando = false;
			input.value = '';
		}
	}

	// Eliminar imagen existente
	function eliminarImagenExistente(index: number) {
		imagenesExistentes = imagenesExistentes.filter((_, i) => i !== index);
		toast.success('Imagen marcada para eliminar');
	}

	// Eliminar imagen nueva
	function eliminarImagenNueva(index: number) {
		imagenesNuevas = imagenesNuevas.filter((_, i) => i !== index);
		previewsNuevas = previewsNuevas.filter((_, i) => i !== index);
		toast.success('Imagen eliminada');
	}

	// Subir imágenes a Storage
	async function subirImagenAStorage(file: File): Promise<string> {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 9);
		const extension = file.name.split('.').pop();
		const nombreArchivo = `${timestamp}_${random}.${extension}`;

		const { error } = await supabase.storage
			.from('imagenesUbicaciones')
			.upload(nombreArchivo, file, {
				cacheControl: '3600',
				upsert: false
			});

		if (error) throw error;

		const { data: urlData } = supabase.storage
			.from('imagenesUbicaciones')
			.getPublicUrl(nombreArchivo);

		return urlData.publicUrl;
	}

	// Manejar envío
	async function manejarSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;

		try {
			cargando = true;

			// Validar campos requeridos sin espacios en blanco
			if (!nombre_ubicacion || nombre_ubicacion.trim() === '' ||
				!estado_ubicacion || estado_ubicacion.trim() === '' ||
				!pais_ubicacion || pais_ubicacion.trim() === '') {
				toast.error('Por favor completa todos los campos obligatorios (no se permiten campos vacíos)');
				cargando = false;
				return;
			}

			// 1. Subir portada si hay nueva
			let urlPortada = portadaExistente;
			if (portadaNueva) {
				toast.info('Subiendo portada...');
				urlPortada = await subirImagenAStorage(portadaNueva);
			}

			// 2. Subir imágenes nuevas de galería
			let urlsImagenes = [...imagenesExistentes];
			if (imagenesNuevas.length > 0) {
				toast.info('Subiendo imágenes...');
				const urlsNuevas = await Promise.all(
					imagenesNuevas.map(file => subirImagenAStorage(file))
				);
				urlsImagenes = [...urlsImagenes, ...urlsNuevas];
			}

			// 3. Crear FormData
			const formData = new FormData();
			
			// Solo agregar id_ubicacion si NO estamos creando
			if (!modoCrear && ubicacionSeleccionada) {
				formData.append('id_ubicacion', ubicacionSeleccionada.id_ubicacion.toString());
			}
			
			formData.append('nombre_ubicacion', nombre_ubicacion);
			formData.append('estado_ubicacion', estado_ubicacion);
			formData.append('pais_ubicacion', pais_ubicacion);
			formData.append('activo', activo.toString());
			formData.append('oculto', oculto.toString());
			formData.append('portada', JSON.stringify(urlPortada ? [urlPortada] : []));
			formData.append('descripcion_larga', descripcion_larga);
			formData.append('historia', historia);
			formData.append('imagenes', JSON.stringify(urlsImagenes));

			// 4. Enviar
			const response = await fetch(form.action, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			console.log('📥 Respuesta del servidor:', result);

			cargando = false;

			// Verificar si es success
			if (result.type === 'success' || result.success) {
				const mensaje = modoCrear ? 'Ubicación creada correctamente' : 'Ubicación actualizada correctamente';
				toast.success(mensaje);
				portadaNueva = null;
				previewPortada = '';
				imagenesNuevas = [];
				previewsNuevas = [];
				await onSaved();
				onClose();
			} 
			// Verificar si es failure (error de validación)
			else if (result.type === 'failure') {
				console.log('❌ Error de validación:', result);
				
				// result.data viene como string JSON serializado por SvelteKit
				let errorData: any = {};
				if (typeof result.data === 'string') {
					try {
						const parsed = JSON.parse(result.data);
						// SvelteKit devalue serializa como: [{message: idx}, ...valores]
						if (Array.isArray(parsed) && parsed.length > 0) {
							const indices = parsed[0];
							errorData = {
								message: typeof indices.message === 'number' ? parsed[indices.message] : indices.message
							};
						} else {
							errorData = parsed;
						}
					} catch (e) {
						console.error('Error parseando data:', e);
						errorData = {};
					}
				} else {
					errorData = result.data || {};
				}
				
				const errorMessage = errorData.message || 'Error al actualizar la ubicación';
				toast.error(errorMessage, { duration: 4000 });
			} 
			// Error genérico
			else if (result.type === 'error') {
				console.log('❌ Error del servidor:', result);
				const mensajeError = modoCrear ? 'Error inesperado al crear' : 'Error inesperado al actualizar';
				toast.error(mensajeError);
			}
			// Cualquier otro formato
			else {
				console.log('❌ Formato de respuesta desconocido:', result);
				const defaultMsg = modoCrear ? 'Error al crear la ubicación' : 'Error al actualizar la ubicación';
				const errorMessage = result.message || result.error || defaultMsg;
				toast.error(errorMessage);
			}
		} catch (error) {
			console.error('Error en submit:', error);
			cargando = false;
			const mensajeError = modoCrear ? 'Error inesperado al crear' : 'Error inesperado al actualizar';
			toast.error(mensajeError);
		}
	}
</script>

{#if mostrarModal}
	<div class="modal-backdrop p-2 sm:p-4">
		<div class="modal-container w-full max-w-6xl max-h-[95vh] sm:max-h-[90vh] overflow-y-auto">
			<form method="POST" action={modoCrear ? '?/crear' : '?/actualizar'} onsubmit={manejarSubmit}>
				<!-- Header -->
				<div class="sticky top-0 bg-[rgba(10,20,14,0.95)] backdrop-blur-xl border-b border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4 flex justify-between items-center z-10">
					<h2 class="text-xl sm:text-2xl font-bold text-white">
						{#if modoCrear}
							<i class="ph ph-plus inline mr-1"></i> Nueva Ubicación
						{:else}
							<i class="ph ph-pencil-simple inline mr-1"></i> Editar Ubicación
						{/if}
					</h2>
					<button
						type="button"
						onclick={onClose}
						disabled={cargando}
						class="text-white/40 hover:text-white text-2xl disabled:opacity-50 p-1 transition"
					>
						<i class="ph ph-x"></i>
					</button>
				</div>

				<!-- Content -->
				<div class="p-4 sm:p-6 space-y-6 sm:space-y-8">
					<!-- INFORMACIÓN GENERAL -->
					<div>
						<h3 class="section-title">
							<i class="ph ph-list inline mr-1"></i> Información General
						</h3>

						<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
							<div class="lg:col-span-2">
								<label class="block text-sm font-medium text-white/80 mb-2">
									Nombre <span class="text-red-400">*</span>
								</label>
								<input
									type="text"
									bind:value={nombre_ubicacion}
									required
									disabled={cargando}
									class="premium-input w-full px-4 py-2 text-sm"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">
									Estado <span class="text-red-400">*</span>
								</label>
								<input
									type="text"
									bind:value={estado_ubicacion}
									required
									disabled={cargando}
									class="premium-input w-full px-4 py-2 text-sm"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">
									País <span class="text-red-400">*</span>
								</label>
								<input
									type="text"
									bind:value={pais_ubicacion}
									required
									disabled={cargando}
									class="premium-input w-full px-4 py-2 text-sm"
								/>
							</div>

							<div class="lg:col-span-2 flex flex-wrap gap-4 sm:gap-6">
								<div class="flex items-center gap-3">
									<input
										type="checkbox"
										id="activo-edit"
										bind:checked={activo}
										disabled={cargando}
										class="premium-checkbox"
									/>
									<label for="activo-edit" class="text-sm font-medium text-white/80">
										Ubicación activa
									</label>
								</div>

								<div class="flex items-center gap-3">
									<input
										type="checkbox"
										id="oculto-edit"
										bind:checked={oculto}
										disabled={cargando}
										class="premium-checkbox"
									/>
									<label for="oculto-edit" class="text-sm font-medium text-white/80">
										Ocultar en la web
									</label>
								</div>
							</div>
						</div>

						<!-- PORTADA -->
						<div class="mt-6">
							<label class="block text-sm font-medium text-white/80 mb-2">
								Portada
							</label>
							
							{#if portadaExistente && !portadaNueva}
								<div class="relative w-full h-48 rounded-2xl overflow-hidden border border-white/10 group">
									<img src={portadaExistente} alt="Portada" class="w-full h-full object-cover" />
									<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
										<label
											class="btn-primary px-4 py-2 cursor-pointer text-sm"
										>
											Cambiar Portada
											<input
												type="file"
												accept="image/*"
												onchange={manejarPortada}
												disabled={cargando || optimizando}
												class="hidden"
											/>
										</label>
									</div>
								</div>
							{:else if previewPortada && portadaNueva}
								<div class="relative w-full h-48 rounded-2xl overflow-hidden border border-amber-500/30 group">
									<img src={previewPortada} alt="Nueva portada" class="w-full h-full object-cover" />
									<span class="absolute top-2 right-2 badge-hidden text-[10px]">
										Nueva
									</span>
									<div class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
										<button
											type="button"
											onclick={eliminarPortadaNueva}
											disabled={cargando}
											class="btn-danger px-4 py-2 text-sm"
										>
											<i class="ph ph-trash inline mr-1"></i> Eliminar
										</button>
									</div>
								</div>
							{:else}
								<label
									class="drop-zone block w-full h-48 flex items-center justify-center"
									class:opacity-50={cargando || optimizando}
								>
									<div class="text-center text-white/35 p-4">
										{#if optimizando}
											<span class="text-sm font-medium"><i class="ph ph-lightning inline mr-1"></i> Optimizando...</span>
										{:else}
											<span class="text-sm font-medium"><i class="ph ph-camera inline mr-1"></i> Seleccionar Portada</span>
											<div class="text-xs mt-1">Se optimizará automáticamente</div>
										{/if}
									</div>
									<input
										type="file"
										accept="image/*"
										onchange={manejarPortada}
										disabled={cargando || optimizando}
										class="hidden"
									/>
								</label>
							{/if}
						</div>
					</div>

					<!-- DETALLE -->
					<div>
						<h3 class="section-title">
							<i class="ph ph-note inline mr-1"></i> Detalle
						</h3>

						<div class="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
							<!-- Descripción Larga -->
							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">
									Descripción Larga
								</label>
								<textarea
									bind:value={descripcion_larga}
									rows="5"
									disabled={cargando}
									class="premium-input w-full px-4 py-2 text-sm"
								></textarea>
							</div>

							<!-- Historia -->
							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">
									Historia
								</label>
								<textarea
									bind:value={historia}
									rows="5"
									disabled={cargando}
									class="premium-input w-full px-4 py-2 text-sm"
								></textarea>
							</div>
						</div>
					</div>

					<!-- GALERÍA -->
					<div>
						<h3 class="section-title">
							<i class="ph ph-image-square inline mr-1"></i> Galería
						</h3>

						<div class="mb-4">
							<label
								class="btn-primary inline-flex items-center px-4 py-2.5 cursor-pointer text-sm"
								class:opacity-50={cargando || optimizando}
							>
								{#if optimizando}
									<i class="ph ph-lightning inline mr-1"></i> Optimizando...
								{:else}
									<i class="ph ph-camera inline mr-1"></i> Agregar Imágenes
								{/if}
								<input
									type="file"
									accept="image/*"
									multiple
									onchange={manejarImagenes}
									disabled={cargando || optimizando}
									class="hidden"
								/>
							</label>
						</div>

						{#if imagenesExistentes.length > 0 || previewsNuevas.length > 0}
							<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
								<!-- Existentes -->
								{#each imagenesExistentes as imagen, index}
									<div class="relative group h-28 sm:h-32">
										<img src={imagen} alt="Imagen {index + 1}" class="w-full h-full object-cover rounded-2xl border border-white/10" />
										<span class="absolute top-2 right-2 badge-active text-[10px]">
											Guardada
										</span>
										<button
											type="button"
											onclick={() => eliminarImagenExistente(index)}
											disabled={cargando}
											class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
												transition-opacity duration-200 flex items-center justify-center text-white rounded-2xl text-xs sm:text-sm font-medium"
										>
											<i class="ph ph-trash inline mr-1"></i> Eliminar
										</button>
									</div>
								{/each}
								
								<!-- Nuevas -->
								{#each previewsNuevas as preview, index}
									<div class="relative group h-28 sm:h-32">
										<img src={preview} alt="Nueva {index + 1}" class="w-full h-full object-cover rounded-2xl border border-amber-500/30" />
										<span class="absolute top-2 right-2 badge-hidden text-[10px]">
											Nueva
										</span>
										<button
											type="button"
											onclick={() => eliminarImagenNueva(index)}
											disabled={cargando}
											class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
												transition-opacity duration-200 flex items-center justify-center text-white rounded-2xl text-xs sm:text-sm font-medium"
										>
											<i class="ph ph-trash inline mr-1"></i> Eliminar
										</button>
									</div>
								{/each}
							</div>
						{:else}
							<div class="empty-state py-6">
								<p>No hay imágenes en la galería</p>
							</div>
						{/if}
					</div>
				</div>

				<!-- Footer -->
				<div class="sticky bottom-0 bg-[rgba(10,20,14,0.95)] backdrop-blur-xl border-t border-white/[0.06] px-4 py-3 sm:px-6 sm:py-4 flex flex-col sm:flex-row gap-3 sm:gap-4 z-10">
					<button
						type="submit"
						disabled={cargando}
						class="btn-primary w-full sm:w-auto px-6 py-2.5 sm:py-3 flex items-center justify-center gap-2 text-sm"
					>
						{#if cargando}
							<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
							{modoCrear ? 'Creando...' : 'Guardando...'}
						{:else}
							{#if modoCrear}<i class="ph ph-plus inline mr-1"></i> Crear Ubicación{:else}<i class="ph ph-floppy-disk inline mr-1"></i> Guardar Cambios{/if}
						{/if}
					</button>
					
					<button
						type="button"
						onclick={onClose}
						disabled={cargando}
						class="btn-secondary w-full sm:w-auto px-6 py-2.5 sm:py-3 text-sm"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

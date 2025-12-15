<script lang="ts">
	import type { Experiencia } from '$lib/services/experienciasService';
	import type { Ubicacion } from '$lib/services/ubicacionesService';
	import { toast } from 'svelte-sonner';
	import { supabase } from '$lib/supabaseClient';
	import { optimizarImagenes } from '$lib/helpers/imageOptimizer';

	let {
		experienciaSeleccionada,
		ubicaciones,
		mostrar,
		cargando = $bindable(),
		onClose,
		onSaved
	}: {
		experienciaSeleccionada: Experiencia;
		ubicaciones: Ubicacion[];
		mostrar: boolean;
		cargando: boolean;
		onClose: () => void;
		onSaved: () => Promise<void>;
	} = $props();

	let tabActual = $state<'general' | 'detalle'>('general');
	// Separar imágenes existentes (URLs) de nuevas (Files)
	let imagenesExistentes = $state<string[]>([]);
	let imagenesNuevas = $state<File[]>([]);
	let previewsNuevas = $state<string[]>([]);

	// Inicializar valores de detalle
	let descripcionLarga = $state('');
	let sede = $state('');
	let actividades = $state('');
	let queIncluye = $state('');

	// Cargar datos cuando cambie experienciaSeleccionada
	$effect(() => {
		if (experienciaSeleccionada?.detalle_experiencia) {
			descripcionLarga = experienciaSeleccionada.detalle_experiencia.descripcionLarga || '';
			sede = experienciaSeleccionada.detalle_experiencia.sede || '';
			actividades = experienciaSeleccionada.detalle_experiencia.actividades || '';
			queIncluye = experienciaSeleccionada.detalle_experiencia.queincluye || '';
			// Cargar imágenes existentes
			imagenesExistentes = experienciaSeleccionada.detalle_experiencia.imagenes || [];
		}
	});

	// Total de imágenes combinadas
	let totalImagenes = $derived(imagenesExistentes.length + imagenesNuevas.length);
	let optimizando = $state(false);

	async function manejarImagenes(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files) return;

		const espacioDisponible = 15 - totalImagenes;
		const nuevosArchivos = Array.from(input.files).slice(0, espacioDisponible);
		
		if (nuevosArchivos.length === 0) return;

		// Mostrar indicador de optimización
		optimizando = true;
		toast.info(`Optimizando ${nuevosArchivos.length} imagen(es)...`);

		try {
			// Optimizar imágenes antes de agregarlas
			const imagenesOptimizadas = await optimizarImagenes(nuevosArchivos, {
				maxWidth: 1920,
				maxHeight: 1080,
				quality: 0.85,
				format: 'image/jpeg' // Puedes usar 'image/webp' para mejor compresión
			});

			// Agregar archivos optimizados
			imagenesNuevas = [...imagenesNuevas, ...imagenesOptimizadas];

			// Crear previews
			imagenesOptimizadas.forEach(file => {
				const reader = new FileReader();
				reader.onload = (e) => {
					if (e.target?.result) {
						previewsNuevas = [...previewsNuevas, e.target.result as string];
					}
				};
				reader.readAsDataURL(file);
			});

			toast.success(`${imagenesOptimizadas.length} imagen(es) optimizada(s) correctamente`);
		} catch (error) {
			console.error('Error optimizando imágenes:', error);
			toast.error('Error al optimizar las imágenes');
		} finally {
			optimizando = false;
			// Limpiar input
			input.value = '';
		}
	}

	function eliminarImagenExistente(index: number) {
		imagenesExistentes = imagenesExistentes.filter((_, i) => i !== index);
	}

	function eliminarImagenNueva(index: number) {
		imagenesNuevas = imagenesNuevas.filter((_, i) => i !== index);
		previewsNuevas = previewsNuevas.filter((_, i) => i !== index);
	}

	async function subirImagenesAStorage(): Promise<string[]> {
		if (imagenesNuevas.length === 0) return [];

		const urlsSubidas: string[] = [];

		for (const archivo of imagenesNuevas) {
			try {
				// Generar nombre único
				const timestamp = Date.now();
				const nombreAleatorio = Math.random().toString(36).substring(7);
				const extension = archivo.name.split('.').pop();
				const nombreArchivo = `${experienciaSeleccionada.id}_${timestamp}_${nombreAleatorio}.${extension}`;

				// Subir a Supabase Storage
				const { data, error } = await supabase.storage
					.from('imagenesExperiencias')
					.upload(nombreArchivo, archivo, {
						cacheControl: '3600',
						upsert: false
					});

				if (error) {
					console.error('Error subiendo imagen:', error);
					toast.error(`Error subiendo ${archivo.name}`);
					continue;
				}

				// Obtener URL pública
				const { data: urlData } = supabase.storage
					.from('imagenesExperiencias')
					.getPublicUrl(nombreArchivo);

				if (urlData?.publicUrl) {
					urlsSubidas.push(urlData.publicUrl);
				}
			} catch (error) {
				console.error('Error en subida:', error);
				toast.error(`Error procesando ${archivo.name}`);
			}
		}

		return urlsSubidas;
	}

	async function manejarSubmit(event: SubmitEvent) {
		event.preventDefault();
		cargando = true;

		try {
			// 1. Subir nuevas imágenes a Storage
			const urlsNuevas = await subirImagenesAStorage();
			
			// 2. Combinar URLs existentes + nuevas
			const todasLasImagenes = [...imagenesExistentes, ...urlsNuevas];
			
			// 3. Crear FormData con todos los datos
			const form = event.target as HTMLFormElement;
			const formData = new FormData(form);
			
			// 4. Agregar datos de detalle con imágenes
			formData.set('imagenes', JSON.stringify(todasLasImagenes));
			formData.set('descripcionLarga', descripcionLarga);
			formData.set('sede', sede);
			formData.set('actividades', actividades);
			formData.set('queIncluye', queIncluye);
			
			// 5. Enviar al servidor
			const response = await fetch(form.action, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();
			
			//console.log('📥 Respuesta del servidor:', result);

			cargando = false;

			// Verificar si es success
			if (result.type === 'success' || result.success) {
				toast.success('Experiencia actualizada correctamente');
				imagenesNuevas = [];
				previewsNuevas = [];
				await onSaved();
				onClose();
			} 
			// Verificar si es failure (error de validación)
			else if (result.type === 'failure') {
				//console.log('❌ Error de validación:', result);
				
				// result.data viene como string JSON serializado por SvelteKit
				let errorData: any = {};
				if (typeof result.data === 'string') {
					try {
						const parsed = JSON.parse(result.data);
						// SvelteKit devalue serializa como: [{message: idx, tituloActiva: idx}, ...valores]
						if (Array.isArray(parsed) && parsed.length > 0) {
							const indices = parsed[0]; // {message: 1, tituloActiva: 2}
							// Los valores reales están en los índices siguientes del array
							errorData = {
								message: typeof indices.message === 'number' ? parsed[indices.message] : indices.message,
								tituloActiva: typeof indices.tituloActiva === 'number' ? parsed[indices.tituloActiva] : indices.tituloActiva
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
				
				const errorMessage = errorData.message || 'Error al actualizar la experiencia';
				
				// Mostrar toast con duración más larga si es error de experiencia activa
				if (errorData.tituloActiva) {
					toast.error(errorMessage, { duration: 6000 });
				} else {
					toast.error(errorMessage, { duration: 4000 });
				}
			} 
			// Error genérico
			else if (result.type === 'error') {
				toast.error('Error inesperado al actualizar');
			}
			// Cualquier otro formato
			else {
				const errorMessage = result.error || result.message || 'Error al actualizar la experiencia';
				toast.error(errorMessage);
			}
		} catch (error) {
			cargando = false;
			toast.error('Error al procesar el formulario');
		}
	}
</script>

{#if mostrar}
	<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
		<div class="bg-neutral-900 border border-green-700 rounded-lg p-8 w-full max-h-[90vh] overflow-y-auto {tabActual === 'general' ? 'max-w-2xl' : 'max-w-6xl'}">
			<form
				method="POST"
				action="?/actualizar"
				onsubmit={manejarSubmit}
			>
				<input type="hidden" name="id" value={experienciaSeleccionada.id} />
				
				<h2 class="text-2xl font-bold mb-4 text-white">
					Editar: {experienciaSeleccionada.titulo}
				</h2>

				<!-- Switch de Tabs -->
				<div class="flex gap-2 mb-6 p-1 bg-neutral-800 rounded-lg border border-green-700">
					<button
						type="button"
						onclick={() => tabActual = 'general'}
						class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition {tabActual === 'general' 
							? 'bg-green-700 text-white' 
							: 'text-gray-400 hover:text-white hover:bg-neutral-700'}"
					>
						General
					</button>
					<button
						type="button"
						onclick={() => tabActual = 'detalle'}
						class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition {tabActual === 'detalle' 
							? 'bg-green-700 text-white' 
							: 'text-gray-400 hover:text-white hover:bg-neutral-700'}"
					>
						Detalle
					</button>
				</div>

				<!-- Tab General -->
				<div class:hidden={tabActual !== 'general'}>
					<div class="space-y-4">
						<div>
							<label class="block text-sm font-medium text-white mb-2">Título *</label>
							<input
								type="text"
								name="titulo"
								bind:value={experienciaSeleccionada.titulo}
								required
								class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-white mb-2">Descripción *</label>
							<textarea
								name="descripcion"
								bind:value={experienciaSeleccionada.descripcion}
								required
								rows="4"
								class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
								placeholder="Describe la experiencia..."
							></textarea>
						</div>

						<div>
							<label class="block text-sm font-medium text-white mb-2">Ubicación *</label>
							<select
								name="id_ubicacion"
								bind:value={experienciaSeleccionada.id_ubicacion}
								required
								class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
							>
								<option value="">Selecciona una ubicación</option>
								{#each ubicaciones as ubicacion}
									<option value={ubicacion.id_ubicacion}>{ubicacion.nombre_ubicacion}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-1 md:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-white mb-2">Fecha Inicio *</label>
								<input
									type="date"
									name="fecha_inicio"
									bind:value={experienciaSeleccionada.fecha_inicio}
									required
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white mb-2">Fecha Fin *</label>
								<input
									type="date"
									name="fecha_fin"
									bind:value={experienciaSeleccionada.fecha_fin}
									required
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-white mb-2">Capacidad *</label>
							<input
								type="number"
								name="capacidad"
								bind:value={experienciaSeleccionada.capacidad}
								required
								min="1"
								class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
							/>
						</div>

						<div class="flex items-center">
							<!-- ✅ Hidden input para asegurar que siempre se envíe un valor -->
							<input
								type="hidden"
								name="activo"
								value={experienciaSeleccionada.activo ? 'true' : 'false'}
							/>
							<input
								type="checkbox"
								id="activo-edit"
								bind:checked={experienciaSeleccionada.activo}
								class="w-4 h-4 text-green-600"
							/>
							<label for="activo-edit" class="ml-2 text-sm text-white">Activo</label>
						</div>
					</div>
				</div>

				<!-- Tab Detalle -->
				<div class:hidden={tabActual !== 'detalle'}>
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Columna Izquierda - Campos de texto -->
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-white mb-2">Descripción Larga</label>
								<textarea
									name="descripcionLarga"
									bind:value={descripcionLarga}
									rows="8"
									maxlength="2000"
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
									placeholder="Descripción detallada de la experiencia..."
								></textarea>
								<p class="text-xs text-gray-400 mt-1">{descripcionLarga.length}/2000 caracteres</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-white mb-2">Sede (Hotel)</label>
								<input
									type="text"
									name="sede"
									bind:value={sede}
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
									placeholder="Ej: Hotel Marriott, Centro de la ciudad"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white mb-2">Actividades</label>
								<textarea
									name="actividades"
									bind:value={actividades}
									rows="5"
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
									placeholder="Lista de actividades incluidas (una por línea)"
								></textarea>
							</div>

							<div>
								<label class="block text-sm font-medium text-white mb-2">Qué Incluye</label>
								<textarea
									name="queIncluye"
									bind:value={queIncluye}
									rows="5"
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none resize-none"
									placeholder="Lista de items incluidos (una por línea)"
								></textarea>
							</div>
						</div>

						<!-- Columna Derecha - Galería de Imágenes -->
						<div>
							<label class="block text-sm font-medium text-white mb-2">
								Galería de Imágenes ({totalImagenes}/15)
								{#if optimizando}
									<span class="ml-2 text-xs text-yellow-400 animate-pulse">⚡ Optimizando...</span>
								{/if}
							</label>
							<div class="space-y-3">
								<!-- Input de archivos -->
								<label class="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-green-700 rounded-lg cursor-pointer bg-neutral-800 hover:bg-neutral-700 transition {totalImagenes >= 15 || optimizando ? 'opacity-50 cursor-not-allowed' : ''}">
									<div class="flex flex-col items-center justify-center pt-5 pb-6">
										{#if optimizando}
											<!-- Spinner de carga -->
											<svg class="w-8 h-8 mb-2 text-green-400 animate-spin" fill="none" viewBox="0 0 24 24">
												<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
												<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
											</svg>
											<p class="text-sm text-yellow-400">Optimizando imágenes...</p>
										{:else}
											<svg class="w-8 h-8 mb-2 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
											</svg>
											<p class="mb-1 text-sm text-gray-400">
												<span class="font-semibold">Click para subir</span> o arrastra imágenes
											</p>
											<p class="text-xs text-gray-500">
												{#if totalImagenes >= 15}
													Límite alcanzado
												{:else}
													Puedes agregar {15 - totalImagenes} más
												{/if}
											</p>
											<p class="text-xs text-green-400 mt-1">✨ Auto-optimización activada</p>
										{/if}
									</div>
									<input
										type="file"
										accept="image/*"
										multiple
										onchange={manejarImagenes}
										disabled={totalImagenes >= 15 || optimizando}
										class="hidden"
									/>
								</label>

								<!-- Preview de imágenes -->
								{#if imagenesExistentes.length > 0 || previewsNuevas.length > 0}
									<div class="grid grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-2">
										<!-- Imágenes Existentes -->
										{#each imagenesExistentes as urlImagen, index}
											<div class="relative group">
												<img 
													src={urlImagen} 
													alt="Imagen {index + 1}" 
													class="w-full h-24 object-cover rounded-lg border border-green-700"
												/>
												<div class="absolute top-1 left-1 bg-blue-600 text-white text-xs px-2 py-0.5 rounded">
													Guardada
												</div>
												<button
													type="button"
													onclick={() => eliminarImagenExistente(index)}
													aria-label="Eliminar imagen existente"
													class="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
										
										<!-- Imágenes Nuevas (Preview) -->
										{#each previewsNuevas as preview, index}
											<div class="relative group">
												<img 
													src={preview} 
													alt="Nueva imagen {index + 1}" 
													class="w-full h-24 object-cover rounded-lg border border-yellow-500"
												/>
												<div class="absolute top-1 left-1 bg-yellow-600 text-white text-xs px-2 py-0.5 rounded">
													Nueva
												</div>
												<button
													type="button"
													onclick={() => eliminarImagenNueva(index)}
													aria-label="Eliminar imagen nueva"
													class="absolute top-1 right-1 bg-red-600 hover:bg-red-700 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition"
												>
													<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
														<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
													</svg>
												</button>
											</div>
										{/each}
									</div>
								{:else}
									<div class="border-2 border-dashed border-green-700 rounded-lg p-8 text-center">
										<svg class="mx-auto h-12 w-12 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
											<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z"></path>
										</svg>
										<p class="mt-2 text-sm text-gray-400">No hay imágenes seleccionadas</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<div class="flex space-x-3 mt-6">
						<button
							type="submit"
							disabled={cargando}
							class="flex-1 px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg font-medium transition disabled:opacity-50 disabled:cursor-not-allowed"
						>
							{cargando ? 'Guardando...' : 'Guardar Cambios'}
						</button>
						<button
							type="button"
							onclick={onClose}
							disabled={cargando}
							class="flex-1 px-4 py-2 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg font-medium transition disabled:opacity-50"
						>
							Cancelar
						</button>
					</div>
				</form>
			</div>
		</div>
	{/if}
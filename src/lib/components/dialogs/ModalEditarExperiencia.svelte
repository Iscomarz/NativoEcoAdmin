<script lang="ts">
	import type { Experiencia } from '$lib/services/experienciasService';
	import type { Ubicacion } from '$lib/services/ubicacionesService';
	import type { chabitacion } from '$lib/services/habitacionesService';
	import { toast } from 'svelte-sonner';
	import { supabase } from '$lib/supabaseClient';
	import { optimizarImagenes } from '$lib/helpers/imageOptimizer';

	// Interfaz para manejar habitaciones en el modal
	interface HabitacionModal {
		id?: number; // Si existe, es una habitación existente
		nombre: string;
		habitacion_descripcion: string;
		precioPersona: number;
		precioCuarto: number;
		cantidad_habitacion: number;
		capacidad: number;
		imagenesExistentes: string[]; // URLs de imágenes ya guardadas
		imagenesNuevas: File[]; // Archivos nuevos a subir
		previewsNuevas: string[]; // Previews de nuevas imágenes
		cantidadOriginal?: number; // Para comparar si cambió la cantidad
	}

	let {
		experienciaSeleccionada,
		ubicaciones,
		mostrar,
		cargando = $bindable(),
		onClose,
		onSaved,
		habitaciones: habitacionesProp,
	}: {
		experienciaSeleccionada: Experiencia;
		ubicaciones: Ubicacion[];
		mostrar: boolean;
		cargando: boolean;
		onClose: () => void;
		onSaved: () => Promise<void>,
			habitaciones: chabitacion[];
	} = $props();

	let tabActual = $state<'general' | 'detalle'| 'habitaciones'>('general');
	
	// Estado para habitaciones (combinando existentes y nuevas)
	let habitaciones = $state<HabitacionModal[]>([]);
	// Separar imágenes existentes (URLs) de nuevas (Files)
	let imagenesExistentes = $state<string[]>([]);
	let imagenesNuevas = $state<File[]>([]);
	let previewsNuevas = $state<string[]>([]);

	// Inicializar valores de detalle
	let descripcionLarga = $state('');
	let sede = $state('');
	let link_whatsapp = $state('');
	let actividades = $state('');
	let queIncluye = $state('');

	// Cargar datos cuando cambie experienciaSeleccionada
	$effect(() => {
		if (experienciaSeleccionada?.detalle_experiencia) {
			descripcionLarga = experienciaSeleccionada.detalle_experiencia.descripcionLarga || '';
			sede = experienciaSeleccionada.detalle_experiencia.sede || '';
			link_whatsapp = experienciaSeleccionada.detalle_experiencia.grupo_whatsapp || '';
			actividades = experienciaSeleccionada.detalle_experiencia.actividades || '';
			queIncluye = experienciaSeleccionada.detalle_experiencia.queincluye || '';
			// Cargar imágenes existentes
			imagenesExistentes = experienciaSeleccionada.detalle_experiencia.imagenes || [];
		}

		// Cargar habitaciones existentes
		if (habitacionesProp && habitacionesProp.length > 0) {
			habitaciones = habitacionesProp.map(hab => ({
				id: hab.id,
				nombre: hab.nombre,
				habitacion_descripcion: hab.habitacion_descripcion,
				precioPersona: hab.precioPersona,
				precioCuarto: hab.precioCuarto,
				cantidad_habitacion: hab.cantidad_habitacion,
				capacidad: hab.capacidad || 1,
				imagenesExistentes: hab.imagenes || [],
				imagenesNuevas: [],
				previewsNuevas: [],
				cantidadOriginal: hab.cantidad_habitacion // Guardar original para comparar
			}));
		} else {
			habitaciones = [];
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
			formData.set('grupo_whatsapp', link_whatsapp);
			formData.set('actividades', actividades);
			formData.set('queIncluye', queIncluye);
			
			// 5. Enviar al servidor
			const response = await fetch(form.action, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			cargando = false;

			// Verificar si es success
			if (result.type === 'success' || result.success) {
				// 6. Procesar habitaciones si hay cambios
				if (habitaciones.length > 0 && experienciaSeleccionada.id) {
					toast.info('Procesando habitaciones...');
					try {
						await procesarHabitaciones(experienciaSeleccionada.id);
						toast.success('Experiencia y habitaciones actualizadas correctamente');
					} catch (error) {
						console.error('Error procesando habitaciones:', error);
						toast.warning('Experiencia actualizada, pero hubo error en habitaciones');
					}
				} else {
					toast.success('Experiencia actualizada correctamente');
				}
				
				imagenesNuevas = [];
				previewsNuevas = [];
				await onSaved();
				onClose();
			} 
			// Verificar si es failure (error de validación)
			else if (result.type === 'failure') {
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

	// FUNCIONES DE HABITACIONES

	// Agregar nueva habitación
	function agregarHabitacion() {
		habitaciones = [...habitaciones, {
			// Sin id = habitación nueva
			nombre: '',
			habitacion_descripcion: '',
			precioPersona: 0,
			precioCuarto: 0,
			cantidad_habitacion: 1,
			capacidad: 1,
			imagenesExistentes: [],
			imagenesNuevas: [],
			previewsNuevas: []
		}];
		toast.success('Habitación agregada');
	}

	// Eliminar habitación
	function eliminarHabitacion(index: number) {
		habitaciones = habitaciones.filter((_, i) => i !== index);
		toast.success('Habitación eliminada');
	}

	// Manejar imágenes de habitación
	async function manejarImagenesHabitacion(event: Event, indexHabitacion: number) {
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
			
			// Actualizar habitación específica
			habitaciones[indexHabitacion].imagenesNuevas = [
				...habitaciones[indexHabitacion].imagenesNuevas, 
				...imagenesOptimizadas
			];

			// Crear previews
			const nuevosPreviews = await Promise.all(
				imagenesOptimizadas.map(file => {
					return new Promise<string>((resolve) => {
						const reader = new FileReader();
						reader.onload = (e) => resolve(e.target?.result as string);
						reader.readAsDataURL(file);
					});
				})
			);

			habitaciones[indexHabitacion].previewsNuevas = [
				...habitaciones[indexHabitacion].previewsNuevas, 
				...nuevosPreviews
			];
			
			toast.success(`${imagenesOptimizadas.length} imagen(es) agregada(s) a la habitación`);
		} catch (error) {
			console.error('Error procesando imágenes:', error);
			toast.error('Error al procesar las imágenes');
		} finally {
			optimizando = false;
			input.value = '';
		}
	}

	// Eliminar imagen de habitación
	function eliminarImagenHabitacion(indexHabitacion: number, indexImagen: number) {
		habitaciones[indexHabitacion].imagenesNuevas = habitaciones[indexHabitacion].imagenesNuevas.filter((_, i) => i !== indexImagen);
		habitaciones[indexHabitacion].previewsNuevas = habitaciones[indexHabitacion].previewsNuevas.filter((_, i) => i !== indexImagen);
		toast.success('Imagen eliminada');
	}

	// Eliminar imagen existente de habitación
	function eliminarImagenExistenteHabitacion(indexHabitacion: number, indexImagen: number) {
		habitaciones[indexHabitacion].imagenesExistentes = habitaciones[indexHabitacion].imagenesExistentes.filter((_, i) => i !== indexImagen);
		toast.success('Imagen eliminada');
	}

	// Procesar todas las habitaciones (crear, actualizar, eliminar)
	async function procesarHabitaciones(idExperiencia: number) {
		const habitacionesOriginales = habitacionesProp || [];
		const idsOriginales = habitacionesOriginales.map(h => h.id).filter(Boolean);
		const idsActuales = habitaciones.map(h => h.id).filter(Boolean);

		// 1. Eliminar habitaciones que ya no están en la lista
		const idsAEliminar = idsOriginales.filter(id => !idsActuales.includes(id));
		for (const id of idsAEliminar) {
			const formData = new FormData();
			formData.append('id_habitacion', id!.toString());
			formData.append('action', 'eliminar');

			await fetch('?/manejarHabitaciones', {
				method: 'POST',
				body: formData
			});
		}

		// 2. Crear o actualizar habitaciones
		for (const hab of habitaciones) {
			// Subir imágenes nuevas de esta habitación
			let urlsImagenesNuevas: string[] = [];
			if (hab.imagenesNuevas.length > 0) {
				urlsImagenesNuevas = await subirImagenesHabitacion(hab.imagenesNuevas);
			}

			// Combinar imágenes existentes + nuevas
			const todasImagenes = [...hab.imagenesExistentes, ...urlsImagenesNuevas];

			const formData = new FormData();
			formData.append('nombre', hab.nombre);
			formData.append('habitacion_descripcion', hab.habitacion_descripcion);
			formData.append('precioPersona', hab.precioPersona.toString());
			formData.append('precioCuarto', hab.precioCuarto.toString());
			formData.append('cantidad_habitacion', hab.cantidad_habitacion.toString());
			formData.append('capacidad', hab.capacidad.toString());
			formData.append('imagenes', JSON.stringify(todasImagenes));
			formData.append('idexperiencia', idExperiencia.toString());

			if (hab.id) {
				// Actualizar habitación existente
				formData.append('id_habitacion', hab.id.toString());
				formData.append('action', 'actualizar');
				formData.append('cantidad_original', (hab.cantidadOriginal || hab.cantidad_habitacion).toString());
			} else {
				// Crear nueva habitación
				formData.append('action', 'crear');
			}

			await fetch('?/manejarHabitaciones', {
				method: 'POST',
				body: formData
			});
		}
	}

	// Subir imágenes de habitación a Storage
	async function subirImagenesHabitacion(imagenesArchivos: File[]): Promise<string[]> {
		if (imagenesArchivos.length === 0) return [];

		const urlsPublicas: string[] = [];

		for (const file of imagenesArchivos) {
			const timestamp = Date.now();
			const random = Math.random().toString(36).substring(2, 9);
			const extension = file.name.split('.').pop();
			const nombreArchivo = `habitacion_${timestamp}_${random}.${extension}`;

			const { data, error } = await supabase.storage
				.from('imagenesExperiencias')
				.upload(nombreArchivo, file, {
					cacheControl: '3600',
					upsert: false
				});

			if (error) {
				console.error('Error subiendo imagen de habitación:', error);
				throw error;
			}

			const { data: urlData } = supabase.storage
				.from('imagenesExperiencias')
				.getPublicUrl(nombreArchivo);

			urlsPublicas.push(urlData.publicUrl);
		}

		return urlsPublicas;
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
					<button 
						type="button" 
						onclick={() => tabActual = 'habitaciones'}
						class="flex-1 px-4 py-2 rounded-md text-sm font-medium transition {tabActual === 'habitaciones' 
							? 'bg-green-700 text-white' 
							: 'text-gray-400 hover:text-white hover:bg-neutral-700'}"
						>
						Habitaciones
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
								<label class="block text-sm font-medium text-white mb-2">Link de Grupo de WhatsApp</label>
								<input
									type="url"
									name="link_whatsapp"
									bind:value={link_whatsapp}
									class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg focus:ring-2 focus:ring-green-500 outline-none"
									placeholder="https://chat.whatsapp.com/..."
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

				<!-- Tab Habitaciones -->
				<div class:hidden={tabActual !== 'habitaciones'}>
					<!-- SECCIÓN: HABITACIONES -->
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<div class="flex justify-between items-center mb-4 pb-2 border-b border-green-700">
				<h2 class="text-xl font-bold text-white">
					🏠 Habitaciones
				</h2>
				<button
					type="button"
					onclick={agregarHabitacion}
					disabled={cargando}
					class="px-4 py-2 bg-green-700 hover:bg-green-600 text-white rounded-lg 
						font-medium transition shadow-sm disabled:opacity-50 flex items-center gap-2"
				>
					➕ Agregar Habitación
				</button>
			</div>

			{#if habitaciones.length === 0}
				<div class="text-center py-8 text-neutral-500 border-2 border-dashed border-neutral-700 rounded-lg">
					<p>No hay habitaciones agregadas</p>
					<p class="text-sm mt-1">Las habitaciones son opcionales</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each habitaciones as habitacion, index}
						<div class="bg-neutral-800 border border-green-700/50 rounded-lg p-4">
							<!-- Header de la habitación -->
							<div class="flex justify-between items-center mb-4">
								<h3 class="text-lg font-semibold text-white">
									Habitación #{index + 1}
								</h3>
								<button
									type="button"
									onclick={() => eliminarHabitacion(index)}
									disabled={cargando}
									class="px-3 py-1 bg-red-700 hover:bg-red-600 text-white rounded 
										text-sm transition disabled:opacity-50"
								>
									🗑️ Eliminar
								</button>
							</div>

							<!-- Campos de la habitación -->
							<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
								<!-- Nombre -->
								<div>
									<label class="block text-sm font-medium text-neutral-300 mb-2">
										Nombre <span class="text-red-500">*</span>
									</label>
									<input
										type="text"
										bind:value={habitacion.nombre}
										disabled={cargando}
										placeholder="Ej: Habitación Doble"
										class="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 
											rounded-lg text-white focus:outline-none focus:ring-2 
											focus:ring-green-600 disabled:opacity-50"
									/>
								</div>

								<!-- Precio por Persona -->
								<div>
									<label class="block text-sm font-medium text-neutral-300 mb-2">
										Precio por Persona <span class="text-red-500">*</span>
									</label>
									<input
										type="number"
										bind:value={habitacion.precioPersona}
										disabled={cargando}
										min="0"
										step="0.01"
										placeholder="0.00"
										class="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 
											rounded-lg text-white focus:outline-none focus:ring-2 
											focus:ring-green-600 disabled:opacity-50"
									/>
								</div>

								<!-- Precio por Cuarto -->
								<div>
									<label class="block text-sm font-medium text-neutral-300 mb-2">
										Precio por Cuarto <span class="text-red-500">*</span>
									</label>
									<input
										type="number"
										bind:value={habitacion.precioCuarto}
										disabled={cargando}
										min="0"
										step="0.01"
										placeholder="0.00"
										class="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 
											rounded-lg text-white focus:outline-none focus:ring-2 
											focus:ring-green-600 disabled:opacity-50"
									/>
								</div>

								<!-- Cantidad de Habitaciones -->
								<div>
									<label class="block text-sm font-medium text-neutral-300 mb-2">
										Cantidad de Habitaciones <span class="text-red-500">*</span>
									</label>
									<input
										type="number"
										bind:value={habitacion.cantidad_habitacion}
										disabled={cargando}
										min="1"
										placeholder="1"
										class="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 
											rounded-lg text-white focus:outline-none focus:ring-2 
											focus:ring-green-600 disabled:opacity-50"
									/>
									<p class="text-xs text-neutral-400 mt-1">
										Se crearán {habitacion.cantidad_habitacion} habitacion(es) de este tipo
									</p>
								</div>

								<!-- Capacidad -->
								<div>
									<label class="block text-sm font-medium text-neutral-300 mb-2">
										Capacidad (personas) <span class="text-red-500">*</span>
									</label>
									<input
										type="number"
										bind:value={habitacion.capacidad}
										disabled={cargando}
										min="1"
										placeholder="1"
										class="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 
											rounded-lg text-white focus:outline-none focus:ring-2 
											focus:ring-green-600 disabled:opacity-50"
									/>
								</div>
							</div>

							<!-- Descripción -->
							<div class="mb-4">
								<label class="block text-sm font-medium text-neutral-300 mb-2">
									Descripción
								</label>
								<textarea
									bind:value={habitacion.habitacion_descripcion}
									disabled={cargando}
									rows="3"
									placeholder="Describe las características de la habitación..."
									class="w-full px-3 py-2 bg-neutral-700 border border-neutral-600 
										rounded-lg text-white focus:outline-none focus:ring-2 
										focus:ring-green-600 disabled:opacity-50 resize-none"
								></textarea>
							</div>

							<!-- Imágenes de la habitación -->
							<div>
								<label class="block text-sm font-medium text-neutral-300 mb-2">
									Imágenes de la Habitación
								</label>
								
								<label
									class="inline-flex items-center px-4 py-2 bg-green-700/80 hover:bg-green-600 
										text-white rounded-lg cursor-pointer transition font-medium text-sm"
									class:opacity-50={cargando || optimizando}
								>
									{#if optimizando}
										⚡ Optimizando...
									{:else}
										📸 Agregar Imágenes
									{/if}
									<input
										type="file"
										accept="image/*"
										multiple
										onchange={(e) => manejarImagenesHabitacion(e, index)}
										disabled={cargando || optimizando}
										class="hidden"
									/>
								</label>

								<!-- Galería de imágenes existentes -->
								{#if habitacion.imagenesExistentes.length > 0}
									<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
										{#each habitacion.imagenesExistentes as img, imgIndex}
											<div class="relative group">
												<img
													src={img}
													alt="Habitación {index + 1} - Imagen {imgIndex + 1}"
													class="w-full h-24 object-cover rounded border border-green-700/50"
												/>
												<span class="absolute top-2 right-2 bg-blue-600 text-white text-xs px-2 py-1 rounded">
													Guardada
												</span>
												<button
													type="button"
													onclick={() => eliminarImagenExistenteHabitacion(index, imgIndex)}
													disabled={cargando}
													class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
														transition flex items-center justify-center text-white text-sm"
												>
													🗑️
												</button>
											</div>
										{/each}
									</div>
								{/if}

								<!-- Galería de imágenes nuevas -->
								{#if habitacion.previewsNuevas.length > 0}
									<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
										{#each habitacion.previewsNuevas as preview, imgIndex}
											<div class="relative group">
												<img
													src={preview}
													alt="Habitación {index + 1} - Nueva {imgIndex + 1}"
													class="w-full h-24 object-cover rounded border border-green-700/50"
												/>
												<span class="absolute top-2 right-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
													Nueva
												</span>
												<button
													type="button"
													onclick={() => eliminarImagenHabitacion(index, imgIndex)}
													disabled={cargando}
													class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
														transition flex items-center justify-center text-white text-sm"
												>
													🗑️
												</button>
											</div>
										{/each}
									</div>
								{/if}

								{#if habitacion.imagenesExistentes.length === 0 && habitacion.previewsNuevas.length === 0}
									<p class="text-xs text-neutral-400 mt-2">
										No hay imágenes para esta habitación
									</p>
								{/if}
							</div>
						</div>
					{/each}
				</div>
			{/if}
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
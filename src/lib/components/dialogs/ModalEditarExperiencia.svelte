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

	// Portada
	let portadaExistente = $state<string>('');
	let portadaNueva = $state<File | null>(null);
	let previewPortada = $state<string>('');

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

		// Cargar portada existente
		portadaExistente = experienciaSeleccionada?.portada_experiencia || '';
		portadaNueva = null;
		previewPortada = '';

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

	// Subir portada a Supabase Storage
	async function subirPortadaAStorage(): Promise<string | null> {
		if (!portadaNueva) return null;

		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 9);
		const extension = portadaNueva.name.split('.').pop();
		const nombreArchivo = `portada_${experienciaSeleccionada.id}_${timestamp}_${random}.${extension}`;

		const { data, error } = await supabase.storage
			.from('imagenesExperiencias')
			.upload(nombreArchivo, portadaNueva, {
				cacheControl: '3600',
				upsert: false
			});

		if (error) {
			console.error('Error subiendo portada:', error);
			throw error;
		}

		const { data: urlData } = supabase.storage
			.from('imagenesExperiencias')
			.getPublicUrl(nombreArchivo);

		return urlData.publicUrl;
	}

	async function manejarSubmit(event: SubmitEvent) {
		event.preventDefault();
		cargando = true;

		try {
			// Validar campos de la experiencia
			if (!experienciaSeleccionada.titulo || experienciaSeleccionada.titulo.trim() === '') {
				toast.error('El título de la experiencia es obligatorio');
				cargando = false;
				return;
			}
			if (!experienciaSeleccionada.descripcion || experienciaSeleccionada.descripcion.trim() === '') {
				toast.error('La descripción corta de la experiencia es obligatoria');
				cargando = false;
				return;
			}
			if (experienciaSeleccionada.capacidad === undefined || experienciaSeleccionada.capacidad === null || experienciaSeleccionada.capacidad <= 0) {
				toast.error('La capacidad de la experiencia debe ser mayor a 0');
				cargando = false;
				return;
			}
			if (!experienciaSeleccionada.fecha_inicio || !experienciaSeleccionada.fecha_fin) {
				toast.error('Las fechas de inicio y fin son obligatorias');
				cargando = false;
				return;
			}
			if (new Date(experienciaSeleccionada.fecha_inicio) > new Date(experienciaSeleccionada.fecha_fin)) {
				toast.error('La fecha de fin no puede ser anterior a la fecha de inicio');
				cargando = false;
				return;
			}

			// Validar habitaciones
			if (habitaciones.length > 0) {
				for (let i = 0; i < habitaciones.length; i++) {
					const hab = habitaciones[i];
					if (!hab.nombre || hab.nombre.trim() === '') {
						toast.error(`La habitación #${i + 1} debe tener un nombre`);
						cargando = false;
						return;
					}
					if (hab.precioPersona === undefined || hab.precioPersona === null || hab.precioPersona <= 0) {
						toast.error(`El precio por persona de la habitación #${i + 1} (${hab.nombre || 'sin nombre'}) debe ser mayor a 0`);
						cargando = false;
						return;
					}
					if (!hab.capacidad || hab.capacidad <= 0) {
						toast.error(`La capacidad de la habitación #${i + 1} (${hab.nombre || 'sin nombre'}) debe ser mayor a 0`);
						cargando = false;
						return;
					}
					if (hab.cantidad_habitacion === undefined || hab.cantidad_habitacion === null || hab.cantidad_habitacion <= 0 || hab.cantidad_habitacion > 50) {
						toast.error(`La cantidad de habitaciones para #${i + 1} (${hab.nombre || 'sin nombre'}) debe estar entre 1 y 50`);
						cargando = false;
						return;
					}
					// Calcular precioCuarto si no se pone (es 0, vacío, undefined, null, etc.)
					if (!hab.precioCuarto || hab.precioCuarto <= 0) {
						hab.precioCuarto = hab.capacidad * hab.precioPersona;
					}
				}
			}

			// 1. Subir nuevas imágenes a Storage
			const urlsNuevas = await subirImagenesAStorage();
			
			// 2. Combinar URLs existentes + nuevas
			const todasLasImagenes = [...imagenesExistentes, ...urlsNuevas];
			
			// 3. Subir portada si hay una nueva
			let urlPortadaFinal: string | undefined = portadaExistente || undefined;
			if (portadaNueva) {
				toast.info('Subiendo portada...');
				const urlNuevaPortada = await subirPortadaAStorage();
				if (urlNuevaPortada) urlPortadaFinal = urlNuevaPortada;
			}

			// 4. Crear FormData con todos los datos
			const form = event.target as HTMLFormElement;
			const formData = new FormData(form);
			
			// 5. Agregar datos de detalle con imágenes
			formData.set('imagenes', JSON.stringify(todasLasImagenes));
			formData.set('descripcionLarga', descripcionLarga);
			formData.set('sede', sede);
			formData.set('grupo_whatsapp', link_whatsapp);
			formData.set('actividades', actividades);
			formData.set('queIncluye', queIncluye);
			if (urlPortadaFinal) {
				formData.set('portada_experiencia', urlPortadaFinal);
			}
			
			// 6. Enviar al servidor
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
		} catch (error: any) {
			cargando = false;
			toast.error(error.message || 'Error al procesar el formulario');
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

			const habResponse = await fetch('?/manejarHabitaciones', {
				method: 'POST',
				body: formData
			});

			const habResult = await habResponse.json();
			if (habResult.type === 'failure' || habResult.type === 'error') {
				let msg = 'Error en el servidor al guardar la habitación';
				if (habResult.data) {
					try {
						const parsed = JSON.parse(habResult.data);
						if (Array.isArray(parsed) && parsed.length > 0) {
							const indices = parsed[0];
							msg = typeof indices.message === 'number' ? parsed[indices.message] : (indices.message || msg);
						} else if (parsed.message) {
							msg = parsed.message;
						}
					} catch (e) {}
				} else if (habResult.message) {
					msg = habResult.message;
				}
				throw new Error(`Error en habitación "${hab.nombre}": ${msg}`);
			}
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
	<div class="modal-backdrop p-2 sm:p-4">
		<div class="modal-container p-4 sm:p-6 w-full max-h-[95vh] sm:max-h-[90vh] overflow-y-auto {tabActual === 'general' ? 'max-w-2xl' : 'max-w-6xl'}">
			<form
				method="POST"
				action="?/actualizar"
				onsubmit={manejarSubmit}
			>
				<input type="hidden" name="id" value={experienciaSeleccionada.id} />
				
				<h2 class="text-xl sm:text-2xl font-bold mb-4 text-white">
					Editar: {experienciaSeleccionada.titulo}
				</h2>

				<!-- Switch de Tabs -->
				<div class="tab-group mb-6">
					<button
						type="button"
						onclick={() => tabActual = 'general'}
						class="tab-btn {tabActual === 'general' ? 'tab-btn-active' : ''}"
					>
						General
					</button>
					<button
						type="button"
						onclick={() => tabActual = 'detalle'}
						class="tab-btn {tabActual === 'detalle' ? 'tab-btn-active' : ''}"
					>
						Detalle
					</button>
					<button 
						type="button" 
						onclick={() => tabActual = 'habitaciones'}
						class="tab-btn {tabActual === 'habitaciones' ? 'tab-btn-active' : ''}"
						>
						Habitaciones
					</button>
				</div>

				<!-- Tab General -->
				<div class:hidden={tabActual !== 'general'}>
					<div class="space-y-4">

						<!-- PORTADA -->
						<div>
							<label class="block text-sm font-medium text-white/80 mb-2">Portada</label>

							{#if previewPortada || portadaExistente}
								<div class="mb-3 relative">
									<img
										src={previewPortada || portadaExistente}
										alt="Portada de la experiencia"
										class="w-full h-48 object-cover rounded-2xl border border-white/10"
									/>
									{#if previewPortada}
										<span class="absolute top-2 left-2 badge-hidden text-[10px]">Nueva</span>
									{:else}
										<span class="absolute top-2 left-2 badge-active text-[10px]">Guardada</span>
									{/if}
									<div class="absolute top-2 right-2 flex gap-2">
										<!-- Cambiar portada -->
										<label
											title="Cambiar portada"
											class="bg-white/10 hover:bg-white/15 text-white rounded-full p-2 cursor-pointer transition"
											class:opacity-50={cargando || optimizando}
										>
											<i class="ph ph-pencil-simple w-4 h-4"></i>
											<input
												type="file"
												accept="image/*"
												onchange={manejarPortada}
												disabled={cargando || optimizando}
												class="hidden"
											/>
										</label>
										<!-- Quitar portada -->
										<button
											type="button"
											onclick={() => {
												portadaNueva = null;
												previewPortada = '';
												portadaExistente = '';
												toast.success('Portada eliminada');
											}}
											disabled={cargando}
											title="Quitar portada"
											class="btn-danger rounded-full p-2"
										>
											<i class="ph ph-trash w-4 h-4"></i>
										</button>
									</div>
								</div>
							{:else}
								<label
									class="drop-zone block w-full h-40 flex items-center justify-center"
									class:opacity-50={cargando || optimizando}
								>
									<div class="text-center text-white/35">
										{#if optimizando}
											<div class="text-brand-400"><i class="ph ph-lightning inline mr-1"></i> Optimizando...</div>
										{:else}
											<div class="text-sm font-medium"><i class="ph ph-camera inline mr-1"></i> Seleccionar Portada</div>
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

						<div>
							<label class="block text-sm font-medium text-white/80 mb-2">Título *</label>
							<input
								type="text"
								name="titulo"
								bind:value={experienciaSeleccionada.titulo}
								required
								class="premium-input w-full px-4 py-2 text-sm"
							/>
						</div>

						<div>
							<label class="block text-sm font-medium text-white/80 mb-2">Descripción *</label>
							<textarea
								name="descripcion"
								bind:value={experienciaSeleccionada.descripcion}
								required
								rows="4"
								class="premium-input w-full px-4 py-2 text-sm"
								placeholder="Describe la experiencia..."
							></textarea>
						</div>

						<div>
							<label class="block text-sm font-medium text-white/80 mb-2">Ubicación *</label>
							<select
								name="id_ubicacion"
								bind:value={experienciaSeleccionada.id_ubicacion}
								required
								class="premium-select w-full px-4 py-2 text-sm"
							>
								<option value="">Selecciona una ubicación</option>
								{#each ubicaciones as ubicacion}
									<option value={ubicacion.id_ubicacion}>{ubicacion.nombre_ubicacion}</option>
								{/each}
							</select>
						</div>

						<div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Fecha Inicio *</label>
								<input
									type="date"
									name="fecha_inicio"
									bind:value={experienciaSeleccionada.fecha_inicio}
									required
									class="premium-input w-full px-4 py-2 text-sm"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Fecha Fin *</label>
								<input
									type="date"
									name="fecha_fin"
									bind:value={experienciaSeleccionada.fecha_fin}
									required
									class="premium-input w-full px-4 py-2 text-sm"
								/>
							</div>
						</div>

						<div>
							<label class="block text-sm font-medium text-white/80 mb-2">Capacidad *</label>
							<input
								type="number"
								name="capacidad"
								bind:value={experienciaSeleccionada.capacidad}
								required
								min="1"
								class="premium-input w-full px-4 py-2 text-sm"
							/>
						</div>

						<div class="flex flex-col gap-3">
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
									class="premium-checkbox"
								/>
								<label for="activo-edit" class="ml-2 text-sm text-white/80 font-medium">Activa (Venta pública)</label>
							</div>

							<div class="flex items-center">
								<input
									type="hidden"
									name="oculto"
									value={experienciaSeleccionada.oculto ? 'true' : 'false'}
								/>
								<input
									type="checkbox"
									id="oculto-edit"
									bind:checked={experienciaSeleccionada.oculto}
									class="premium-checkbox"
								/>
								<label for="oculto-edit" class="ml-2 text-sm text-white/80 font-medium">Ocultar de la Web (Invisible para clientes)</label>
							</div>
						</div>
					</div>
				</div>

				<!-- Tab Detalle -->
				<div class:hidden={tabActual !== 'detalle'}>
					<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
						<!-- Columna Izquierda - Campos de texto -->
						<div class="space-y-4">
							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Descripción Larga</label>
								<textarea
									name="descripcionLarga"
									bind:value={descripcionLarga}
									rows="8"
									maxlength="2000"
									class="premium-input w-full px-4 py-2 resize-none text-sm"
									placeholder="Descripción detallada de la experiencia..."
								></textarea>
								<p class="text-xs text-white/30 mt-1">{descripcionLarga.length}/2000 caracteres</p>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Sede (Hotel)</label>
								<input
									type="text"
									name="sede"
									bind:value={sede}
									class="premium-input w-full px-4 py-2 text-sm"
									placeholder="Ej: Hotel Marriott, Centro de la ciudad"
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Link de Grupo de WhatsApp</label>
								<input
									type="url"
									name="link_whatsapp"
									bind:value={link_whatsapp}
									class="premium-input w-full px-4 py-2 text-sm"
									placeholder="https://chat.whatsapp.com/..."
								/>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Actividades</label>
								<textarea
									name="actividades"
									bind:value={actividades}
									rows="5"
									class="premium-input w-full px-4 py-2 resize-none text-sm"
									placeholder="Lista de actividades incluidas (una por línea)"
								></textarea>
							</div>

							<div>
								<label class="block text-sm font-medium text-white/80 mb-2">Qué Incluye</label>
								<textarea
									name="queIncluye"
									bind:value={queIncluye}
									rows="5"
									class="premium-input w-full px-4 py-2 resize-none text-sm"
									placeholder="Lista de items incluidos (una por línea)"
								></textarea>
							</div>
						</div>

						<!-- Columna Derecha - Galería de Imágenes -->
						<div>
							<label class="block text-sm font-medium text-white/80 mb-2">
								Galería de Imágenes ({totalImagenes}/15)
								{#if optimizando}
									<span class="ml-2 text-xs text-yellow-400 animate-pulse"><i class="ph ph-lightning inline mr-1"></i> Optimizando...</span>
								{/if}
							</label>
							<div class="space-y-3">
								<!-- Input de archivos -->
								<label class="drop-zone flex flex-col items-center justify-center w-full h-32 cursor-pointer {totalImagenes >= 15 || optimizando ? 'opacity-50 cursor-not-allowed' : ''}">
									<div class="flex flex-col items-center justify-center pt-5 pb-6">
										{#if optimizando}
											<!-- Spinner de carga -->
											<i class="ph ph-circle-notch w-8 h-8 mb-2 text-brand-400 animate-spin"></i>
											<p class="text-sm text-yellow-400">Optimizando imágenes...</p>
										{:else}
											<i class="ph ph-upload-simple w-8 h-8 mb-2 text-brand-400"></i>
											<p class="mb-1 text-sm text-white/40 text-center px-4">
												<span class="font-semibold">Click para subir</span> o arrastra imágenes
											</p>
											<p class="text-xs text-white/30">
												{#if totalImagenes >= 15}
													Límite alcanzado
												{:else}
													Puedes agregar {15 - totalImagenes} más
												{/if}
											</p>
											<p class="text-xs text-brand-400 mt-1">✨ Auto-optimización activada</p>
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
									<div class="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-[450px] overflow-y-auto pr-2">
										<!-- Imágenes Existentes -->
										{#each imagenesExistentes as urlImagen, index}
											<div class="relative group h-24">
												<img 
													src={urlImagen} 
													alt="Imagen {index + 1}" 
													class="w-full h-full object-cover rounded-2xl border border-white/10"
												/>
												<div class="absolute top-1 left-1 badge-active text-[10px]">
													Guardada
												</div>
												<button
													type="button"
													onclick={() => eliminarImagenExistente(index)}
													aria-label="Eliminar imagen existente"
													class="absolute top-1 right-1 btn-danger rounded-full p-1 opacity-0 group-hover:opacity-100"
												>
													<i class="ph ph-trash w-4 h-4"></i>
												</button>
											</div>
										{/each}
										
										<!-- Imágenes Nuevas (Preview) -->
										{#each previewsNuevas as preview, index}
											<div class="relative group h-24">
												<img 
													src={preview} 
													alt="Nueva imagen {index + 1}" 
													class="w-full h-full object-cover rounded-2xl border border-amber-500/30"
												/>
												<div class="absolute top-1 left-1 badge-hidden text-[10px]">
													Nueva
												</div>
												<button
													type="button"
													onclick={() => eliminarImagenNueva(index)}
													aria-label="Eliminar imagen nueva"
													class="absolute top-1 right-1 btn-danger rounded-full p-1 opacity-0 group-hover:opacity-100"
												>
													<i class="ph ph-trash w-4 h-4"></i>
												</button>
											</div>
										{/each}
									</div>
								{:else}
									<div class="empty-state p-8">
										<i class="mx-auto ph ph-image h-12 w-12 text-white/20 text-4xl"></i>
										<p class="mt-2 text-white/35">No hay imágenes seleccionadas</p>
									</div>
								{/if}
							</div>
						</div>
					</div>
				</div>

				<!-- Tab Habitaciones -->
				<div class:hidden={tabActual !== 'habitaciones'}>
					<!-- SECCIÓN: HABITACIONES -->
					<div class="glass-card p-6">
						<div class="flex justify-between items-center mb-5 pb-3 border-b border-white/[0.06]">
							<h2 class="text-xl font-bold text-white">
								<i class="ph ph-bed inline mr-2"></i> Habitaciones
							</h2>
							<button
								type="button"
								onclick={agregarHabitacion}
								disabled={cargando}
								class="btn-primary px-4 py-2 flex items-center gap-2 text-sm"
							>
								<i class="ph ph-plus"></i> Agregar Habitación
							</button>
						</div>

						{#if habitaciones.length === 0}
							<div class="empty-state">
								<p>No hay habitaciones agregadas</p>
								<p class="text-xs mt-1">Las habitaciones son opcionales</p>
							</div>
						{:else}
							<div class="space-y-6">
								{#each habitaciones as habitacion, index}
									<div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
										<!-- Header de la habitación -->
										<div class="flex justify-between items-center mb-4">
											<h3 class="text-base sm:text-lg font-semibold text-white">
												Habitación #{index + 1}
											</h3>
											<button
												type="button"
												onclick={() => eliminarHabitacion(index)}
												disabled={cargando}
												class="btn-danger px-3 py-1.5 text-sm flex items-center gap-1.5"
											>
												<i class="ph ph-trash"></i> Eliminar
											</button>
										</div>

										<!-- Campos de la habitación -->
										<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-4">
											<!-- Nombre -->
											<div>
												<label class="block text-sm font-medium text-white/60 mb-2">
													Nombre <span class="text-red-400">*</span>
												</label>
												<input
													type="text"
													bind:value={habitacion.nombre}
													disabled={cargando}
													required
													placeholder="Ej: Habitación Doble"
													class="premium-input w-full px-3 py-2 text-sm"
												/>
											</div>

											<!-- Precio por Persona -->
											<div>
												<label class="block text-sm font-medium text-white/60 mb-2">
													Precio por Persona <span class="text-red-400">*</span>
												</label>
												<input
													type="number"
													bind:value={habitacion.precioPersona}
													disabled={cargando}
													required
													min="0.01"
													step="0.01"
													placeholder="0.00"
													class="premium-input w-full px-3 py-2 text-sm"
												/>
											</div>

											<!-- Precio por Cuarto -->
											<div>
												<label class="block text-sm font-medium text-white/60 mb-2">
													Precio por Cuarto <span class="text-white/30 text-xs">(Opcional)</span>
												</label>
												<input
													type="number"
													bind:value={habitacion.precioCuarto}
													disabled={cargando}
													min="0"
													step="0.01"
													placeholder="Dejar vacío para auto-calcular"
													class="premium-input w-full px-3 py-2 text-sm"
												/>
											</div>

											<!-- Cantidad de Habitaciones -->
											<div>
												<label class="block text-sm font-medium text-white/60 mb-2">
													Cantidad de Habitaciones <span class="text-red-400">*</span>
												</label>
												<input
													type="number"
													bind:value={habitacion.cantidad_habitacion}
													disabled={cargando}
													min="1"
													max="50"
													required
													placeholder="1"
													class="premium-input w-full px-3 py-2 text-sm"
												/>
												<p class="text-xs text-white/30 mt-1">
													Se crearán {habitacion.cantidad_habitacion} habitacion(es) de este tipo (máximo 50)
												</p>
											</div>

											<!-- Capacidad -->
											<div>
												<label class="block text-sm font-medium text-white/60 mb-2">
													Capacidad (personas) <span class="text-red-400">*</span>
												</label>
												<input
													type="number"
													bind:value={habitacion.capacidad}
													disabled={cargando}
													min="1"
													required
													placeholder="1"
													class="premium-input w-full px-3 py-2 text-sm"
												/>
											</div>
										</div>

										<!-- Descripción -->
										<div class="mb-4">
											<label class="block text-sm font-medium text-white/60 mb-2">
												Descripción
											</label>
											<textarea
												bind:value={habitacion.habitacion_descripcion}
												disabled={cargando}
												rows="3"
												placeholder="Describe las características de la habitación..."
												class="premium-input w-full px-3 py-2 resize-none text-sm"
											></textarea>
										</div>

										<!-- Imágenes de la habitación -->
										<div>
											<label class="block text-sm font-medium text-white/60 mb-2">
												Imágenes de la Habitación
											</label>
											
											<label
												class="btn-primary inline-flex items-center px-4 py-2 cursor-pointer text-sm"
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
													onchange={(e) => manejarImagenesHabitacion(e, index)}
													disabled={cargando || optimizando}
													class="hidden"
												/>
											</label>

											<!-- Galería de imágenes existentes -->
											{#if habitacion.imagenesExistentes.length > 0}
												<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
													{#each habitacion.imagenesExistentes as img, imgIndex}
														<div class="relative group h-24">
															<img
																src={img}
																alt="Habitación {index + 1} - Imagen {imgIndex + 1}"
																class="w-full h-full object-cover rounded-2xl border border-white/10"
															/>
															<span class="absolute top-2 right-2 badge-active text-[10px]">
																Guardada
															</span>
															<button
																type="button"
																onclick={() => eliminarImagenExistenteHabitacion(index, imgIndex)}
																disabled={cargando}
																class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
																	transition-opacity duration-200 flex items-center justify-center text-white text-sm rounded-2xl"
															>
																<i class="ph ph-trash text-lg"></i>
															</button>
														</div>
													{/each}
												</div>
											{/if}

											<!-- Galería de imágenes nuevas -->
											{#if habitacion.previewsNuevas.length > 0}
												<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
													{#each habitacion.previewsNuevas as preview, imgIndex}
														<div class="relative group h-24">
															<img
																src={preview}
																alt="Habitación {index + 1} - Nueva {imgIndex + 1}"
																class="w-full h-full object-cover rounded-2xl border border-amber-500/30"
															/>
															<span class="absolute top-2 right-2 badge-hidden text-[10px]">
																Nueva
															</span>
															<button
																type="button"
																onclick={() => eliminarImagenNueva(index, imgIndex)}
																disabled={cargando}
																class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
																	transition-opacity duration-200 flex items-center justify-center text-white text-sm rounded-2xl"
															>
																<i class="ph ph-trash text-lg"></i>
															</button>
														</div>
													{/each}
												</div>
											{/if}

											{#if habitacion.imagenesExistentes.length === 0 && habitacion.previewsNuevas.length === 0}
												<p class="text-xs text-white/30 mt-2">
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

				<div class="flex flex-col sm:flex-row gap-3 sm:gap-4 mt-6">
					<button
						type="submit"
						disabled={cargando}
						class="btn-primary w-full sm:flex-1 px-4 py-2.5 text-sm text-center"
					>
						{cargando ? 'Guardando...' : 'Guardar Cambios'}
					</button>
					<button
						type="button"
						onclick={onClose}
						disabled={cargando}
						class="btn-secondary w-full sm:flex-1 px-4 py-2.5 text-sm text-center"
					>
						Cancelar
					</button>
				</div>
			</form>
		</div>
	</div>
{/if}

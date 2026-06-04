<script lang="ts">
	import type { PageData } from './$types';
	import { toast } from 'svelte-sonner';
	import { supabase } from '$lib/supabaseClient';
	import { optimizarImagenes } from '$lib/helpers/imageOptimizer';
	import type { chabitacion, dhabitacion } from '$lib/services/habitacionesService';

	interface Habitacion {
		nombre: string;
		habitacion_descripcion: string;
		precioPersona: number;
		precioCuarto: number;
		cantidad_habitacion: number;
		capacidad: number;
		imagenesNuevas: File[];
		previewsNuevas: string[];
	}

	let { data }: { data: PageData } = $props();
	let { ubicaciones } = data;

	// Estado del formulario
	let cargando = $state(false);
	
	// Campos de información general
	let titulo = $state('');
	let descripcion = $state('');
	let id_ubicacion = $state<number | null>(null);
	let fecha_inicio = $state('');
	let fecha_fin = $state('');
	let capacidad = $state<number>(0);
	let activo = $state(false);
	let oculto = $state(false);

	// Campos de detalle
	let descripcionLarga = $state('');
	let sede = $state('');
	let link_whatsapp = $state('');
	let actividades = $state('');
	let queIncluye = $state('');

	// Manejo de imágenes
	let imagenesNuevas = $state<File[]>([]);
	let previewsNuevas = $state<string[]>([]);
	let optimizando = $state(false);

	// Habitaciones
	let habitaciones = $state<Habitacion[]>([]);

	// Portada
	let portadaNueva = $state<File | null>(null);
	let previewPortada = $state<string>('');

	// Caracteres restantes para descripción larga
	let caracteresRestantes = $derived(2000 - descripcionLarga.length);

	// Manejar selección de imágenes con optimización
	async function manejarImagenes(event: Event) {
		const input = event.target as HTMLInputElement;
		if (!input.files || input.files.length === 0) return;

		const archivos = Array.from(input.files);
		
		// Validar tipo de archivo
		const archivosValidos = archivos.filter(file => file.type.startsWith('image/'));
		if (archivosValidos.length !== archivos.length) {
			toast.error('Solo se permiten archivos de imagen');
			return;
		}

		try {
			optimizando = true;
			
			// Optimizar imágenes antes de agregarlas
			const imagenesOptimizadas = await optimizarImagenes(archivosValidos);
			
			// Agregar a la lista
			imagenesNuevas = [...imagenesNuevas, ...imagenesOptimizadas];

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

			previewsNuevas = [...previewsNuevas, ...nuevosPreviews];
			
			toast.success(`${imagenesOptimizadas.length} imagen(es) optimizada(s) y agregada(s)`);
		} catch (error) {
			console.error('Error procesando imágenes:', error);
			toast.error('Error al procesar las imágenes');
		} finally {
			optimizando = false;
			// Limpiar input
			input.value = '';
		}
	}

	// Eliminar imagen nueva
	function eliminarImagenNueva(index: number) {
		imagenesNuevas = imagenesNuevas.filter((_, i) => i !== index);
		previewsNuevas = previewsNuevas.filter((_, i) => i !== index);
		toast.success('Imagen eliminada');
	}

	// FUNCIONES DE HABITACIONES

	// Agregar nueva habitación
	function agregarHabitacion() {
		habitaciones = [...habitaciones, {
			nombre: '',
			habitacion_descripcion: '',
			precioPersona: 0,
			precioCuarto: 0,
			cantidad_habitacion: 1,
			capacidad: 1,
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

	// Subir imágenes a Supabase Storage
	async function subirImagenesAStorage(): Promise<string[]> {
		if (imagenesNuevas.length === 0) return [];

		const urlsPublicas: string[] = [];

		for (const file of imagenesNuevas) {
			const timestamp = Date.now();
			const random = Math.random().toString(36).substring(2, 9);
			const extension = file.name.split('.').pop();
			const nombreArchivo = `temp_${timestamp}_${random}.${extension}`;

			const { data, error } = await supabase.storage
				.from('imagenesExperiencias')
				.upload(nombreArchivo, file, {
					cacheControl: '3600',
					upsert: false
				});

			if (error) {
				console.error('Error subiendo imagen:', error);
				throw error;
			}

			// Obtener URL pública
			const { data: urlData } = supabase.storage
				.from('imagenesExperiencias')
				.getPublicUrl(nombreArchivo);

			urlsPublicas.push(urlData.publicUrl);
		}

		return urlsPublicas;
	}

	// Subir portada a Supabase Storage
	async function subirPortadaAStorage(): Promise<string | null> {
		if (!portadaNueva) return null;

		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 9);
		const extension = portadaNueva.name.split('.').pop();
		const nombreArchivo = `portada_${timestamp}_${random}.${extension}`;

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

		// Obtener URL pública
		const { data: urlData } = supabase.storage
			.from('imagenesExperiencias')
			.getPublicUrl(nombreArchivo);

		return urlData.publicUrl;
	}

	// Manejar envío del formulario
	async function manejarSubmit(event: Event) {
		event.preventDefault();
		const form = event.target as HTMLFormElement;

		try {
			cargando = true;

			// 1. Validar campos requeridos
			if (!titulo || !descripcion || !id_ubicacion || !fecha_inicio || !fecha_fin || !capacidad) {
				toast.error('Por favor completa todos los campos obligatorios');
				cargando = false;
				return;
			}

			if (capacidad <= 0) {
				toast.error('La capacidad de la experiencia debe ser mayor a 0');
				cargando = false;
				return;
			}

			if (new Date(fecha_inicio) > new Date(fecha_fin)) {
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
					if (hab.capacidad === undefined || hab.capacidad === null || hab.capacidad <= 0) {
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

			// 2. Subir portada primero
			let urlPortada: string | null = null;
			if (portadaNueva) {
				toast.info('Subiendo portada...');
				urlPortada = await subirPortadaAStorage();
			}

			// 3. Subir imágenes de galería
			let urlsImagenes: string[] = [];
			if (imagenesNuevas.length > 0) {
				toast.info('Subiendo imágenes...');
				urlsImagenes = await subirImagenesAStorage();
			}

			// 4. Crear FormData con todos los datos
			const formData = new FormData();
			formData.append('titulo', titulo);
			formData.append('descripcion', descripcion);
			formData.append('id_ubicacion', id_ubicacion.toString());
			formData.append('fecha_inicio', fecha_inicio);
			formData.append('fecha_fin', fecha_fin);
			formData.append('capacidad', capacidad.toString());
			formData.append('activo', activo.toString());
			formData.append('oculto', oculto.toString());
			formData.append('descripcionLarga', descripcionLarga);
			formData.append('sede', sede);
			formData.append('link_whatsapp', link_whatsapp);
			formData.append('actividades', actividades);
			formData.append('queIncluye', queIncluye);
			formData.append('imagenes', JSON.stringify(urlsImagenes));
			if (urlPortada) {
				formData.append('portada_experiencia', urlPortada);
			}


			// 4. Enviar al servidor para crear experiencia
			const response = await fetch(form.action, {
				method: 'POST',
				body: formData
			});

			const result = await response.json();

			console.log('📥 Respuesta del servidor:', result);

			cargando = false;

			// Verificar respuesta
			if (result.type === 'success') {
				let parseData = JSON.parse(result.data);

				const idExperienciaCreada = parseData[4]; //El ID viene en data[4]
				
				// 5. Si hay habitaciones, crearlas
				console.log('🏨 Habitaciones a crear:', habitaciones, 'id experiencia', idExperienciaCreada);
				if (habitaciones.length > 0 && idExperienciaCreada) {
					toast.info('Creando habitaciones...');
					try {
						// Enviar habitaciones al servidor
						const habitacionesData = await Promise.all(
							habitaciones.map(async (hab) => {
								// Subir imágenes de la habitación
								let urlsImagenesHab: string[] = [];
								if (hab.imagenesNuevas.length > 0) {
									urlsImagenesHab = await subirImagenesHabitacion(hab.imagenesNuevas);
								}
								
								return {
									nombre: hab.nombre,
									habitacion_descripcion: hab.habitacion_descripcion,
									precioPersona: hab.precioPersona,
									precioCuarto: hab.precioCuarto,
									cantidad_habitacion: hab.cantidad_habitacion,
									capacidad: hab.capacidad,
									imagenes: urlsImagenesHab,
									idexperiencia: idExperienciaCreada
								};
							})
						);

						// Enviar habitaciones al servidor
						const habitacionesFormData = new FormData();
						habitacionesFormData.append('habitaciones', JSON.stringify(habitacionesData));

						const habitacionesResponse = await fetch('?/crearHabitaciones', {
							method: 'POST',
							body: habitacionesFormData
						});

						const habitacionesResult = await habitacionesResponse.json();
						
						if (habitacionesResult.type === 'success') {
							toast.success(`Experiencia y ${habitaciones.length} habitación(es) creadas correctamente`);
						} else {
							let msg = 'Hubo un error al crear las habitaciones';
							if (habitacionesResult.data) {
								try {
									const parsed = JSON.parse(habitacionesResult.data);
									if (Array.isArray(parsed) && parsed.length > 0) {
										const indices = parsed[0];
										msg = typeof indices.message === 'number' ? parsed[indices.message] : (indices.message || msg);
									} else if (parsed.message) {
										msg = parsed.message;
									}
								} catch (e) {}
							}
							toast.warning(`Experiencia creada pero: ${msg}`);
						}
					} catch (error) {
						console.error('Error creando habitaciones:', error);
						toast.warning('Experiencia creada pero hubo error creando habitaciones');
					}
				} else {
					toast.success('Experiencia creada correctamente');
				}
				
				// Limpiar formulario
				titulo = '';
				descripcion = '';
				id_ubicacion = null;
				fecha_inicio = '';
				fecha_fin = '';
				capacidad = 0;
				activo = false;
				oculto = false;
				descripcionLarga = '';
				sede = '';
				link_whatsapp = '';
				actividades = '';
				queIncluye = '';
				imagenesNuevas = [];
				previewsNuevas = [];
				habitaciones = [];
				portadaNueva = null;
				previewPortada = '';
				
				// Opcional: Redirigir a lista
				// window.location.href = '/dashboard/experiencias/modificar';
			} else if (result.type === 'failure') {
				// Parsear error de validación
				let errorData: any = {};
				if (typeof result.data === 'string') {
					try {
						const parsed = JSON.parse(result.data);
						if (Array.isArray(parsed) && parsed.length > 0) {
							const indices = parsed[0];
							errorData = {
								message: typeof indices.message === 'number' ? parsed[indices.message] : indices.message,
								tituloActiva: typeof indices.tituloActiva === 'number' ? parsed[indices.tituloActiva] : indices.tituloActiva
							};
						} else {
							errorData = parsed;
						}
					} catch (e) {
						errorData = {};
					}
				} else {
					errorData = result.data || {};
				}

				const errorMessage = errorData.message || 'Error al crear la experiencia';
				toast.error(errorMessage, { duration: 6000 });
			} else {
				const errorMessage = result.message || result.error || 'Error al crear la experiencia';
				toast.error(errorMessage);
			}
		} catch (error) {
			console.error('Error en submit:', error);
			cargando = false;
			toast.error('Error inesperado al crear la experiencia');
		}
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

</script>

<div class="space-y-6">
	<div>
		<h1 class="text-2xl sm:text-3xl font-bold text-white tracking-tight">Crear Experiencia</h1>
		<p class="text-brand-400/70 mt-1 text-sm sm:text-base">Agrega una nueva experiencia al catálogo</p>
	</div>

	<form 
		method="POST" 
		action="?/crear" 
		onsubmit={manejarSubmit}
		class="space-y-8"
	>
		<!-- SECCIÓN: INFORMACIÓN GENERAL -->
		<div class="glass-card p-6">
			<h2 class="section-title">
				<i class="ph ph-clipboard-text inline mr-2"></i> Información General
			</h2>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Título -->
				<div class="lg:col-span-2">
					<label class="block text-sm font-medium text-white/80 mb-2">
						Título <span class="text-red-400">*</span>
					</label>
					<input
						type="text"
						bind:value={titulo}
						required
						disabled={cargando}
						class="premium-input w-full px-4 py-2.5"
						placeholder="Ej: Tour en Cenotes Mayas"
					/>
				</div>

				<!-- PORTADA -->
				<div class="lg:col-span-2">
					<label class="block text-sm font-medium text-white/80 mb-2">
						Portada
					</label>
					
					{#if previewPortada}
						<div class="mb-4 relative">
							<img
								src={previewPortada}
								alt="Preview Portada"
								class="w-full h-48 object-cover rounded-2xl border border-white/10"
							/>
							<button
								type="button"
								onclick={() => {
									portadaNueva = null;
									previewPortada = '';
									toast.success('Portada eliminada');
								}}
								disabled={cargando}
								class="absolute top-2 right-2 btn-danger rounded-full p-2"
							>
								<i class="ph ph-trash w-5 h-5"></i>
							</button>
						</div>
					{:else}
					<label
						class="drop-zone block w-full h-48 flex items-center justify-center"
						class:opacity-50={cargando || optimizando}
					>
						<div class="text-center text-white/35">
							{#if optimizando}
								<div class="text-brand-400"><i class="ph ph-lightning inline mr-1"></i> Optimizando...</div>
							{:else}
								<div><i class="ph ph-camera inline mr-1"></i> Seleccionar Portada</div>
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

				<!-- Ubicación -->
				<div>
					<label class="block text-sm font-medium text-white/80 mb-2">
						Ubicación <span class="text-red-400">*</span>
					</label>
					<select
						bind:value={id_ubicacion}
						required
						disabled={cargando}
						class="premium-select w-full px-4 py-2.5"
					>
						<option value={null}>Selecciona una ubicación...</option>
						{#each ubicaciones as ubicacion}
							<option value={ubicacion.id_ubicacion}>{ubicacion.nombre_ubicacion}</option>
						{/each}
					</select>
				</div>

				<!-- Capacidad -->
				<div>
					<label class="block text-sm font-medium text-white/80 mb-2">
						Capacidad <span class="text-red-400">*</span>
					</label>
					<input
						type="number"
						bind:value={capacidad}
						required
						min="1"
						disabled={cargando}
						class="premium-input w-full px-4 py-2.5"
						placeholder="Número de personas"
					/>
				</div>

				<!-- Fecha Inicio -->
				<div>
					<label class="block text-sm font-medium text-white/80 mb-2">
						Fecha de Inicio <span class="text-red-400">*</span>
					</label>
					<input
						type="date"
						bind:value={fecha_inicio}
						required
						disabled={cargando}
						class="premium-input w-full px-4 py-2.5"
					/>
				</div>

				<!-- Fecha Fin -->
				<div>
					<label class="block text-sm font-medium text-white/80 mb-2">
						Fecha de Fin <span class="text-red-400">*</span>
					</label>
					<input
						type="date"
						bind:value={fecha_fin}
						required
						disabled={cargando}
						class="premium-input w-full px-4 py-2.5"
					/>
				</div>

				<!-- Descripción Corta -->
				<div class="lg:col-span-2">
					<label class="block text-sm font-medium text-white/80 mb-2">
						Descripción Corta <span class="text-red-400">*</span>
					</label>
					<textarea
						bind:value={descripcion}
						required
						rows="3"
						disabled={cargando}
						class="premium-input w-full px-4 py-2.5"
						placeholder="Descripción breve para mostrar en listados..."
					></textarea>
				</div>

				<!-- Activo -->
				<div class="lg:col-span-2 flex flex-col gap-3">
					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="activo"
							bind:checked={activo}
							disabled={cargando}
							class="premium-checkbox"
						/>
						<label for="activo" class="text-sm font-medium text-white/80">
							Experiencia activa (Venta pública)
						</label>
					</div>

					<div class="flex items-center gap-3">
						<input
							type="checkbox"
							id="oculto"
							bind:checked={oculto}
							disabled={cargando}
							class="premium-checkbox"
						/>
						<label for="oculto" class="text-sm font-medium text-white/80">
							Ocultar de la Web (Invisible para clientes)
						</label>
					</div>
				</div>
			</div>
		</div>

		<!-- SECCIÓN: DETALLE DE LA EXPERIENCIA -->
		<div class="glass-card p-6">
			<h2 class="section-title">
				<i class="ph ph-note-pencil inline mr-2"></i> Detalle de la Experiencia
			</h2>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Columna Izquierda: Campos de texto -->
				<div class="space-y-6">
					<!-- Descripción Larga -->
					<div>
						<label class="block text-sm font-medium text-white mb-2">
							Descripción Larga
						</label>
						<textarea
							bind:value={descripcionLarga}
							rows="6"
							maxlength="2000"
							disabled={cargando}
							class="premium-input w-full px-4 py-2.5"
							placeholder="Descripción detallada de la experiencia..."
						></textarea>
						<p class="text-xs text-white/30 mt-1">
							{caracteresRestantes} caracteres restantes
						</p>
					</div>

					<!-- Sede -->
					<div>
						<label class="block text-sm font-medium text-white mb-2">
							Sede
						</label>
						<input
							type="text"
							bind:value={sede}
							disabled={cargando}
							class="premium-input w-full px-4 py-2.5"
							placeholder="Ej: Hotel Xcaret"
						/>
					</div>

					<!-- Link WhatsApp -->
					<div>
						<label class="block text-sm font-medium text-white/80 mb-2">
							Link Grupo WhatsApp
						</label>
						<input
							type="url"
							bind:value={link_whatsapp}
							disabled={cargando}
							class="premium-input w-full px-4 py-2.5"
							placeholder="https://chat.whatsapp.com/..."
						/>
					</div>
				</div>

				<!-- Columna Derecha: Campos de texto -->
				<div class="space-y-6">
					<!-- Actividades -->
					<div>
						<label class="block text-sm font-medium text-white/80 mb-2">
							Actividades
						</label>
						<textarea
							bind:value={actividades}
							rows="6"
							disabled={cargando}
							class="premium-input w-full px-4 py-2.5"
							placeholder="Lista de actividades incluidas..."
						></textarea>
					</div>

					<!-- Qué Incluye -->
					<div>
						<label class="block text-sm font-medium text-white/80 mb-2">
							¿Qué Incluye?
						</label>
						<textarea
							bind:value={queIncluye}
							rows="6"
							disabled={cargando}
							class="premium-input w-full px-4 py-2.5"
							placeholder="Servicios y beneficios incluidos..."
						></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- SECCIÓN: GALERÍA DE IMÁGENES -->
		<div class="glass-card p-6">
			<h2 class="section-title">
				<i class="ph ph-image-square inline mr-2"></i> Galería de Imágenes
			</h2>

			<!-- Botón para agregar imágenes -->
			<div class="mb-4">
				<label
					class="btn-primary inline-flex items-center px-4 py-2.5 cursor-pointer"
					class:opacity-50={cargando || optimizando}
				>
					{#if optimizando}
						<i class="ph ph-circle-notch animate-spin h-5 w-5 mr-2"></i>
						⚡ Optimizando...
					{:else}
						<i class="ph ph-camera inline mr-2"></i> Agregar Imágenes
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
				<p class="text-xs text-white/30 mt-2">
					Las imágenes se optimizarán automáticamente antes de subir
				</p>
			</div>

			<!-- Galería de previews -->
			{#if previewsNuevas.length > 0}
				<div class="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
					{#each previewsNuevas as preview, index}
						<div class="relative group">
							<img
								src={preview}
								alt="Preview {index + 1}"
								class="w-full h-32 object-cover rounded-2xl border border-white/10"
							/>
							<span class="absolute top-2 right-2 badge-hidden text-[10px]">
								Nueva
							</span>
							<button
								type="button"
								onclick={() => eliminarImagenNueva(index)}
								disabled={cargando}
								class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
									transition-opacity duration-200 flex items-center justify-center text-white rounded-2xl"
							>
								<i class="ph ph-trash inline mr-1"></i> Eliminar
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="empty-state">
					<p>No hay imágenes agregadas</p>
					<p class="text-sm mt-1">Agrega imágenes para la galería de la experiencia</p>
				</div>
			{/if}
		</div>

		<!-- SECCIÓN: HABITACIONES -->
		<div class="glass-card p-6">
			<div class="flex flex-col sm:flex-row justify-between sm:items-center gap-3 mb-5 pb-3 border-b border-white/[0.06]">
				<h2 class="text-lg sm:text-xl font-bold text-white">
					<i class="ph ph-bed inline mr-2"></i> Habitaciones
				</h2>
				<button
					type="button"
					onclick={agregarHabitacion}
					disabled={cargando}
					class="btn-primary w-full sm:w-auto px-4 py-2 flex items-center justify-center gap-2 text-sm"
				>
					<i class="ph ph-plus"></i> Agregar Habitación
				</button>
			</div>

			{#if habitaciones.length === 0}
				<div class="empty-state">
					<p>No hay habitaciones agregadas</p>
					<p class="text-sm mt-1">Las habitaciones son opcionales</p>
				</div>
			{:else}
				<div class="space-y-6">
					{#each habitaciones as habitacion, index}
						<div class="bg-white/[0.03] border border-white/[0.06] rounded-2xl p-5">
							<!-- Header de la habitación -->
							<div class="flex justify-between items-center mb-4">
								<h3 class="text-lg font-semibold text-white">
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
										required
										min="1"
										max="50"
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
										required
										min="1"
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
									class="premium-input w-full px-3 py-2 resize-none"
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

								<!-- Galería de imágenes de la habitación -->
								{#if habitacion.previewsNuevas.length > 0}
									<div class="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
										{#each habitacion.previewsNuevas as preview, imgIndex}
											<div class="relative group">
												<img
													src={preview}
													alt="Habitación {index + 1} - Imagen {imgIndex + 1}"
													class="w-full h-24 object-cover rounded border border-green-700/50"
												/>
												<button
													type="button"
													onclick={() => eliminarImagenHabitacion(index, imgIndex)}
													disabled={cargando}
													class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
														transition flex items-center justify-center text-white text-sm"
												>
													<i class="ph ph-trash text-lg"></i>
												</button>
											</div>
										{/each}
									</div>
								{:else}
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

		<!-- BOTONES DE ACCIÓN -->
		<div class="flex flex-col sm:flex-row gap-3 sm:gap-4">
			<button
				type="submit"
				disabled={cargando}
				class="btn-primary w-full sm:w-auto px-6 py-2.5 sm:py-3
					flex items-center justify-center gap-2 text-sm sm:text-base"
			>
				{#if cargando}
					<i class="ph ph-circle-notch animate-spin h-5 w-5"></i>
					Creando...
				{:else}
					<i class="ph ph-floppy-disk"></i> Crear Experiencia
				{/if}
			</button>
			
			<a
				href="/dashboard/experiencias/modificar"
				class="btn-secondary w-full sm:w-auto px-6 py-2.5 sm:py-3
					text-center text-sm sm:text-base"
			>
				Cancelar
			</a>
		</div>
	</form>
</div>

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

			// 2. Subir imágenes primero
			let urlsImagenes: string[] = [];
			if (imagenesNuevas.length > 0) {
				toast.info('Subiendo imágenes...');
				urlsImagenes = await subirImagenesAStorage();
			}

			// 3. Crear FormData con todos los datos
			const formData = new FormData();
			formData.append('titulo', titulo);
			formData.append('descripcion', descripcion);
			formData.append('id_ubicacion', id_ubicacion.toString());
			formData.append('fecha_inicio', fecha_inicio);
			formData.append('fecha_fin', fecha_fin);
			formData.append('capacidad', capacidad.toString());
			formData.append('activo', activo.toString());
			formData.append('descripcionLarga', descripcionLarga);
			formData.append('sede', sede);
			formData.append('link_whatsapp', link_whatsapp);
			formData.append('actividades', actividades);
			formData.append('queIncluye', queIncluye);
			formData.append('imagenes', JSON.stringify(urlsImagenes));

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
							toast.warning('Experiencia creada pero hubo error creando habitaciones');
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
				descripcionLarga = '';
				sede = '';
				link_whatsapp = '';
				actividades = '';
				queIncluye = '';
				imagenesNuevas = [];
				previewsNuevas = [];
				habitaciones = [];
				
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

</script>

<div class="space-y-6">
	<div>
		<h1 class="text-3xl font-bold text-white">Crear Experiencia</h1>
		<p class="text-green-400 mt-1">Agrega una nueva experiencia al catálogo</p>
	</div>

	<form 
		method="POST" 
		action="?/crear" 
		onsubmit={manejarSubmit}
		class="space-y-8"
	>
		<!-- SECCIÓN: INFORMACIÓN GENERAL -->
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold text-white mb-4 pb-2 border-b border-green-700">
				📋 Información General
			</h2>

			<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
				<!-- Título -->
				<div class="lg:col-span-2">
					<label class="block text-sm font-medium text-white mb-2">
						Título <span class="text-red-500">*</span>
					</label>
					<input
						type="text"
						bind:value={titulo}
						required
						disabled={cargando}
						class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
							focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
						placeholder="Ej: Tour en Cenotes Mayas"
					/>
				</div>

				<!-- Ubicación -->
				<div>
					<label class="block text-sm font-medium text-white mb-2">
						Ubicación <span class="text-red-500">*</span>
					</label>
					<select
						bind:value={id_ubicacion}
						required
						disabled={cargando}
						class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
							focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
					>
						<option value={null}>Selecciona una ubicación...</option>
						{#each ubicaciones as ubicacion}
							<option value={ubicacion.id_ubicacion}>{ubicacion.nombre_ubicacion}</option>
						{/each}
					</select>
				</div>

				<!-- Capacidad -->
				<div>
					<label class="block text-sm font-medium text-white mb-2">
						Capacidad <span class="text-red-500">*</span>
					</label>
					<input
						type="number"
						bind:value={capacidad}
						required
						min="1"
						disabled={cargando}
						class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
							focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
						placeholder="Número de personas"
					/>
				</div>

				<!-- Fecha Inicio -->
				<div>
					<label class="block text-sm font-medium text-white mb-2">
						Fecha de Inicio <span class="text-red-500">*</span>
					</label>
					<input
						type="date"
						bind:value={fecha_inicio}
						required
						disabled={cargando}
						class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
							focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
					/>
				</div>

				<!-- Fecha Fin -->
				<div>
					<label class="block text-sm font-medium text-white mb-2">
						Fecha de Fin <span class="text-red-500">*</span>
					</label>
					<input
						type="date"
						bind:value={fecha_fin}
						required
						disabled={cargando}
						class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
							focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
					/>
				</div>

				<!-- Descripción Corta -->
				<div class="lg:col-span-2">
					<label class="block text-sm font-medium text-white mb-2">
						Descripción Corta <span class="text-red-500">*</span>
					</label>
					<textarea
						bind:value={descripcion}
						required
						rows="3"
						disabled={cargando}
						class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
							focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
						placeholder="Descripción breve para mostrar en listados..."
					></textarea>
				</div>

				<!-- Activo -->
				<div class="lg:col-span-2 flex items-center gap-3">
					<input
						type="checkbox"
						id="activo"
						bind:checked={activo}
						disabled={cargando}
						class="w-5 h-5 text-green-600 bg-neutral-800 border-green-700 rounded 
							focus:ring-green-500 focus:ring-2"
					/>
					<label for="activo" class="text-sm font-medium text-white">
						Experiencia activa
					</label>
				</div>
			</div>
		</div>

		<!-- SECCIÓN: DETALLE DE LA EXPERIENCIA -->
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold text-white mb-4 pb-2 border-b border-green-700">
				📝 Detalle de la Experiencia
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
							class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
								focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
							placeholder="Descripción detallada de la experiencia..."
						></textarea>
						<p class="text-xs text-neutral-400 mt-1">
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
							class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
								focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
							placeholder="Ej: Hotel Xcaret"
						/>
					</div>

					<!-- Link WhatsApp -->
					<div>
						<label class="block text-sm font-medium text-white mb-2">
							Link Grupo WhatsApp
						</label>
						<input
							type="url"
							bind:value={link_whatsapp}
							disabled={cargando}
							class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
								focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
							placeholder="https://chat.whatsapp.com/..."
						/>
					</div>
				</div>

				<!-- Columna Derecha: Campos de texto -->
				<div class="space-y-6">
					<!-- Actividades -->
					<div>
						<label class="block text-sm font-medium text-white mb-2">
							Actividades
						</label>
						<textarea
							bind:value={actividades}
							rows="6"
							disabled={cargando}
							class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
								focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
							placeholder="Lista de actividades incluidas..."
						></textarea>
					</div>

					<!-- Qué Incluye -->
					<div>
						<label class="block text-sm font-medium text-white mb-2">
							¿Qué Incluye?
						</label>
						<textarea
							bind:value={queIncluye}
							rows="6"
							disabled={cargando}
							class="w-full px-4 py-2 bg-neutral-800 border border-green-700 text-white rounded-lg 
								focus:ring-2 focus:ring-green-500 outline-none disabled:opacity-50"
							placeholder="Servicios y beneficios incluidos..."
						></textarea>
					</div>
				</div>
			</div>
		</div>

		<!-- SECCIÓN: GALERÍA DE IMÁGENES -->
		<div class="bg-neutral-900 border border-green-700 rounded-lg shadow-md p-6">
			<h2 class="text-xl font-bold text-white mb-4 pb-2 border-b border-green-700">
				🖼️ Galería de Imágenes
			</h2>

			<!-- Botón para agregar imágenes -->
			<div class="mb-4">
				<label
					class="inline-flex items-center px-4 py-2 bg-green-700 hover:bg-green-600 
						text-white rounded-lg cursor-pointer transition font-medium disabled:opacity-50"
					class:opacity-50={cargando || optimizando}
				>
					{#if optimizando}
						<svg class="animate-spin h-5 w-5 mr-2" viewBox="0 0 24 24">
							<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
							<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
						</svg>
						⚡ Optimizando...
					{:else}
						📸 Agregar Imágenes
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
				<p class="text-xs text-neutral-400 mt-2">
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
								class="w-full h-32 object-cover rounded-lg border border-green-700"
							/>
							<span class="absolute top-2 right-2 bg-yellow-600 text-white text-xs px-2 py-1 rounded">
								Nueva
							</span>
							<button
								type="button"
								onclick={() => eliminarImagenNueva(index)}
								disabled={cargando}
								class="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 
									transition flex items-center justify-center text-white hover:bg-black/80"
							>
								🗑️ Eliminar
							</button>
						</div>
					{/each}
				</div>
			{:else}
				<div class="text-center py-8 text-neutral-500 border-2 border-dashed border-neutral-700 rounded-lg">
					<p>No hay imágenes agregadas</p>
					<p class="text-sm mt-1">Agrega imágenes para la galería de la experiencia</p>
				</div>
			{/if}
		</div>

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
													🗑️
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
		<div class="flex gap-4">
			<button
				type="submit"
				disabled={cargando}
				class="px-6 py-3 bg-green-700 hover:bg-green-600 text-white rounded-lg 
					font-medium transition shadow-md disabled:opacity-50 disabled:cursor-not-allowed
					flex items-center gap-2"
			>
				{#if cargando}
					<svg class="animate-spin h-5 w-5" viewBox="0 0 24 24">
						<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4" fill="none"></circle>
						<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
					</svg>
					Creando...
				{:else}
					💾 Crear Experiencia
				{/if}
			</button>
			
			<a
				href="/dashboard/experiencias/modificar"
				class="px-6 py-3 bg-neutral-700 hover:bg-neutral-600 text-white rounded-lg 
					font-medium transition"
			>
				Cancelar
			</a>
		</div>
	</form>
</div>

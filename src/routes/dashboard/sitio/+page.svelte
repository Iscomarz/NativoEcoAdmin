<script lang="ts">
	import { toast } from 'svelte-sonner';
	import {
		subirHeroVideo,
		eliminarHeroVideo,
		obtenerHeroVideo,
		guardarNavbarSiempreBlanco,
		MAX_HERO_VIDEO_BYTES
	} from '$lib/services/configuracionSitioService';

	let { data } = $props();

	// Estado reactivo
	let videoActualUrl = $state<string | null>(null);
	let ultimaActualizacion = $state<string | null>(null);
	let navbarSiempreBlanco = $state<boolean>(false);
	let guardandoNavbar = $state(false);

	$effect(() => {
		videoActualUrl = data.heroVideo?.url || null;
		ultimaActualizacion = data.heroVideo?.updatedAt || null;
		navbarSiempreBlanco = data.navbarSiempreBlanco ?? false;
	});

	let archivoSeleccionado = $state<File | null>(null);
	let previewLocalUrl = $state<string | null>(null);
	let dimensionesSeleccionadas = $state<{ width: number; height: number; duration: number } | null>(null);
	let guardando = $state(false);
	let eliminando = $state(false);
	let validando = $state(false);
	let esDragOver = $state(false);

	const pesoMaximoMB = MAX_HERO_VIDEO_BYTES / (1024 * 1024);

	function formatearFecha(fechaIso: string | null): string {
		if (!fechaIso) return 'Nunca';
		return new Date(fechaIso).toLocaleString('es-MX', {
			dateStyle: 'medium',
			timeStyle: 'short'
		});
	}

	function formatearBytes(bytes: number): string {
		if (bytes === 0) return '0 B';
		const k = 1024;
		const sizes = ['B', 'KB', 'MB', 'GB'];
		const i = Math.floor(Math.log(bytes) / Math.log(k));
		return `${(bytes / Math.pow(k, i)).toFixed(2)} ${sizes[i]}`;
	}

	function limpiarSeleccion() {
		if (previewLocalUrl) {
			URL.revokeObjectURL(previewLocalUrl);
		}
		archivoSeleccionado = null;
		previewLocalUrl = null;
		dimensionesSeleccionadas = null;
	}

	function obtenerDimensionesVideo(file: File): Promise<{ width: number; height: number; duration: number }> {
		return new Promise((resolve, reject) => {
			const video = document.createElement('video');
			video.preload = 'metadata';
			const tempUrl = URL.createObjectURL(file);
			video.src = tempUrl;

			video.onloadedmetadata = () => {
				URL.revokeObjectURL(tempUrl);
				resolve({
					width: video.videoWidth,
					height: video.videoHeight,
					duration: video.duration
				});
			};

			video.onerror = () => {
				URL.revokeObjectURL(tempUrl);
				reject(
					new Error('No se pudieron leer los metadatos del video. Verifica que el archivo no esté corrupto.')
				);
			};
		});
	}

	async function procesarArchivo(file: File) {
		const extension = file.name.split('.').pop()?.toLowerCase();
		if (extension !== 'mp4' && extension !== 'webm') {
			toast.error('Formato inválido. Solo se admiten archivos MP4 o WebM.');
			return;
		}

		if (file.size > MAX_HERO_VIDEO_BYTES) {
			toast.error(
				`El video pesa ${formatearBytes(file.size)}. El límite máximo permitido es de ${pesoMaximoMB} MB.`
			);
			return;
		}

		try {
			validando = true;
			const { width, height, duration } = await obtenerDimensionesVideo(file);

			// REGLA ARQUITECTÓNICA ESTRICTA: Formato horizontal únicamente
			if (width <= height) {
				toast.error(
					`Video vertical o cuadrado (${width}x${height}) rechazado. El video del hero DEBE ser horizontal (panorámico 16:9, ej. 1920x1080) para no deformarse ni recortarse en desktop.`
				);
				return;
			}

			if (width < 1280 || height < 720) {
				toast.warning(
					`Resolución baja detectada (${width}x${height}). Se sugiere al menos 1280x720 (HD) o 1920x1080 (Full HD) para nitidez en pantallas grandes.`
				);
			}

			if (previewLocalUrl) {
				URL.revokeObjectURL(previewLocalUrl);
			}

			dimensionesSeleccionadas = { width, height, duration };
			archivoSeleccionado = file;
			previewLocalUrl = URL.createObjectURL(file);
			toast.success(
				`Video válido: ${width}x${height} (${(width / height).toFixed(2)}:1) • ${formatearBytes(file.size)}.`
			);
		} catch (err: any) {
			console.error('Error validando video:', err);
			toast.error(err?.message || 'Error al validar el archivo de video.');
		} finally {
			validando = false;
		}
	}

	function handleFileChange(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files[0]) {
			procesarArchivo(input.files[0]);
		}
	}

	function handleDrop(event: DragEvent) {
		event.preventDefault();
		esDragOver = false;
		if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
			procesarArchivo(event.dataTransfer.files[0]);
		}
	}

	function handleDragOver(event: DragEvent) {
		event.preventDefault();
		esDragOver = true;
	}

	function handleDragLeave() {
		esDragOver = false;
	}

	async function handleGuardar() {
		if (!archivoSeleccionado) {
			toast.error('Por favor selecciona un archivo de video primero.');
			return;
		}

		try {
			guardando = true;
			const toastId = toast.loading('Subiendo video y optimizando almacenamiento...');

			await subirHeroVideo(archivoSeleccionado);

			// Refrescar estado
			const config = await obtenerHeroVideo();
			videoActualUrl = config.url;
			ultimaActualizacion = config.updatedAt;

			limpiarSeleccion();
			toast.dismiss(toastId);
			toast.success('¡Video principal actualizado con éxito!');
		} catch (error: any) {
			console.error('Error al guardar video:', error);
			toast.error(error?.message || 'Error al actualizar el video.');
		} finally {
			guardando = false;
		}
	}

	async function handleRestablecer() {
		if (
			!confirm(
				'¿Estás seguro de que deseas restablecer al video por defecto del proyecto? Esto eliminará el video personalizado del almacenamiento.'
			)
		) {
			return;
		}

		try {
			eliminando = true;
			const toastId = toast.loading('Restableciendo video por defecto...');

			await eliminarHeroVideo();

			videoActualUrl = null;
			ultimaActualizacion = new Date().toISOString();
			limpiarSeleccion();

			toast.dismiss(toastId);
			toast.success('Se ha restablecido el video por defecto del sitio.');
		} catch (error: any) {
			console.error('Error al restablecer video:', error);
			toast.error(error?.message || 'Error al restablecer video.');
		} finally {
			eliminando = false;
		}
	}

	async function handleToggleNavbar() {
		try {
			guardandoNavbar = true;
			const nuevoEstado = !navbarSiempreBlanco;
			navbarSiempreBlanco = nuevoEstado;
			await guardarNavbarSiempreBlanco(nuevoEstado);
			toast.success(
				nuevoEstado
					? 'Navbar configurado en Blanco Fijo (ideal para videos oscuros).'
					: 'Navbar configurado en modo Dinámico (Negro a Blanco con scroll).'
			);
		} catch (error: any) {
			console.error('Error al cambiar modo del navbar:', error);
			navbarSiempreBlanco = !navbarSiempreBlanco;
			toast.error('Error al guardar la configuración del navbar.');
		} finally {
			guardandoNavbar = false;
		}
	}
</script>

<svelte:head>
	<title>Configuración del Sitio Web | Nativo Admin</title>
</svelte:head>

<div class="space-y-6 max-w-6xl mx-auto pb-12">
	<!-- Encabezado -->
	<div class="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
		<div>
			<h1 class="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2.5">
				<i class="ph ph-globe text-brand-400"></i>
				Configuración del Sitio Web
			</h1>
			<p class="text-white/50 text-sm mt-1">
				Administra los elementos multimedia principales y configuración pública de Nativo Eco Tours
			</p>
		</div>
	</div>

	<!-- Tarjeta Principal: Video del Hero -->
	<div class="glass-card p-6 sm:p-8 space-y-6">
		<div class="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-5 border-b border-white/5">
			<div>
				<h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
					<i class="ph ph-video-camera text-brand-400"></i>
					Video de Inicio (Hero Background)
				</h2>
				<p class="text-white/40 text-xs sm:text-sm mt-0.5">
					Video en bucle de alta resolución que se reproduce de fondo en la página principal
				</p>
			</div>

			<div class="flex items-center gap-3">
				{#if videoActualUrl}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-brand-500/10 text-brand-300 border border-brand-500/20">
						<span class="w-2 h-2 rounded-full bg-brand-400 animate-pulse"></span>
						Video Personalizado Activo
					</span>
					<button
						type="button"
						onclick={handleRestablecer}
						disabled={guardando || eliminando}
						class="btn-danger px-3 py-1.5 text-xs flex items-center gap-1.5 transition-all"
					>
						<i class="ph ph-arrow-counter-clockwise"></i>
						Restablecer por Defecto
					</button>
				{:else}
					<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-white/5 text-white/60 border border-white/10">
						<i class="ph ph-hard-drive"></i>
						Video por Defecto del Sitio
					</span>
				{/if}
			</div>
		</div>

		<!-- Recomendaciones de Performance y Dimensiones -->
		<div class="p-4 rounded-xl bg-brand-500/[0.04] border border-brand-500/15 flex items-start gap-3">
			<i class="ph ph-shield-check text-brand-400 text-xl shrink-0 mt-0.5"></i>
			<div class="text-xs text-white/70 space-y-1.5">
				<p class="font-semibold text-brand-300 text-sm">Reglas de optimización y dimensiones:</p>
				<ul class="list-disc list-inside space-y-1 text-white/60">
					<li>
						<strong>Orientación Horizontal Obligatoria (16:9):</strong> Se bloquean videos verticales de celular (9:16 o reels). El contenedor es panorámico y un video vertical se recortaría excesivamente.
					</li>
					<li>
						<strong>Resolución recomendada:</strong> 1920×1080 (Full HD) o 1280×720 (HD).
					</li>
					<li>
						<strong>Límite estricto de peso:</strong> Máximo {pesoMaximoMB} MB (el sistema valida el peso antes de iniciar la transferencia).
					</li>
					<li>
						<strong>Duración y audio:</strong> Bucles de 8 a 15 segundos sin audio innecesario para garantizar máxima velocidad en conexiones móviles.
					</li>
				</ul>
			</div>
		</div>

		<!-- Grid de Video Actual y Subida -->
		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
			<!-- Columna 1: Vista Previa Actual o Local -->
			<div class="space-y-3">
				<h3 class="text-sm font-semibold text-white/80 flex items-center justify-between">
					<span>
						{archivoSeleccionado ? 'Vista Previa del Nuevo Video' : 'Video Activo Actualmente'}
					</span>
					{#if archivoSeleccionado}
						<span class="text-xs font-normal text-brand-400">Nuevo seleccionado</span>
					{:else if ultimaActualizacion}
						<span class="text-xs font-normal text-white/40">
							Actualizado: {formatearFecha(ultimaActualizacion)}
						</span>
					{/if}
				</h3>

				<div class="relative w-full aspect-video rounded-2xl overflow-hidden bg-black/40 border border-white/10 shadow-inner flex items-center justify-center">
					{#if previewLocalUrl}
						<video
							src={previewLocalUrl}
							controls
							autoplay
							muted
							loop
							playsinline
							class="w-full h-full object-cover"
						></video>
					{:else if videoActualUrl}
						<video
							src={videoActualUrl}
							controls
							autoplay
							muted
							loop
							playsinline
							class="w-full h-full object-cover"
						></video>
					{:else}
						<div class="text-center p-6 space-y-2">
							<i class="ph ph-film-strip text-4xl text-white/20"></i>
							<p class="text-sm text-white/60 font-medium">Usando video por defecto del bundle</p>
							<p class="text-xs text-white/30 max-w-xs mx-auto">
								La web pública está sirviendo el video estándar empaquetado en el proyecto (22.mp4).
							</p>
						</div>
					{/if}
				</div>

				{#if archivoSeleccionado && dimensionesSeleccionadas}
					<div class="flex flex-wrap items-center justify-between gap-2 p-3 rounded-xl bg-white/[0.03] border border-white/5 text-xs text-white/60">
						<div class="flex items-center gap-2 truncate max-w-[240px]">
							<i class="ph ph-check-circle text-brand-400"></i>
							<span class="truncate font-medium text-white/80">{archivoSeleccionado.name}</span>
						</div>
						<div class="flex items-center gap-3">
							<span class="px-2 py-0.5 rounded-md bg-white/5 font-mono text-white/70">
								{dimensionesSeleccionadas.width}×{dimensionesSeleccionadas.height}
							</span>
							<span class="font-mono text-white/70">{formatearBytes(archivoSeleccionado.size)}</span>
							<button
								type="button"
								onclick={limpiarSeleccion}
								class="text-red-400 hover:text-red-300 font-medium underline"
							>
								Cancelar
							</button>
						</div>
					</div>
				{/if}
			</div>

			<!-- Columna 2: Zona de Carga / Drag & Drop -->
			<div class="space-y-3 flex flex-col justify-between">
				<h3 class="text-sm font-semibold text-white/80">
					Subir Nuevo Video
				</h3>

				<!-- Dropzone -->
				<div
					role="region"
					aria-label="Zona para arrastrar y soltar video"
					ondrop={handleDrop}
					ondragover={handleDragOver}
					ondragleave={handleDragLeave}
					class="relative flex-1 min-h-[220px] border-2 border-dashed rounded-2xl p-6 flex flex-col items-center justify-center text-center transition-all duration-200 {esDragOver ? 'border-brand-400 bg-brand-500/10' : 'border-white/10 hover:border-white/20 bg-white/[0.02]'}"
				>
					<input
						type="file"
						id="hero-video-input"
						accept="video/mp4,video/webm"
						onchange={handleFileChange}
						disabled={guardando || eliminando || validando}
						class="absolute inset-0 w-full h-full opacity-0 cursor-pointer disabled:cursor-not-allowed"
					/>

					<div class="p-3.5 rounded-2xl bg-brand-500/10 text-brand-400 mb-3">
						{#if validando}
							<svg class="animate-spin h-7 w-7 text-brand-400" viewBox="0 0 24 24" fill="none">
								<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
								<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
							</svg>
						{:else}
							<i class="ph ph-cloud-arrow-up text-3xl"></i>
						{/if}
					</div>

					<p class="text-sm font-medium text-white mb-1">
						Arrastra aquí tu video o <span class="text-brand-400 underline">haz clic para explorar</span>
					</p>
					<p class="text-xs text-white/40 max-w-xs">
						Solo formato horizontal (16:9). MP4 o WebM. Máximo {pesoMaximoMB} MB.
					</p>
				</div>

				<!-- Botones de Acción -->
				<div class="pt-2 flex items-center justify-end gap-3">
					{#if archivoSeleccionado}
						<button
							type="button"
							onclick={limpiarSeleccion}
							disabled={guardando || validando}
							class="btn-secondary px-4 py-2.5 text-sm"
						>
							Cancelar
						</button>
						<button
							type="button"
							onclick={handleGuardar}
							disabled={guardando || validando}
							class="btn-primary px-6 py-2.5 text-sm font-medium flex items-center gap-2"
						>
							{#if guardando}
								<svg class="animate-spin h-4 w-4 text-white" viewBox="0 0 24 24" fill="none">
									<circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"></circle>
									<path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
								</svg>
								<span>Guardando en Storage...</span>
							{:else}
								<i class="ph ph-check text-base"></i>
								<span>Guardar y Publicar Video</span>
							{/if}
						</button>
					{/if}
				</div>
			</div>
		</div>
	</div>

	<!-- Tarjeta: Estilo del Navbar -->
	<div class="glass-card p-6 sm:p-8 space-y-5">
		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-5 border-b border-white/5">
			<div>
				<h2 class="text-lg sm:text-xl font-bold text-white flex items-center gap-2">
					<i class="ph ph-paint-brush text-brand-400"></i>
					Color del Menú Superior (Navbar)
				</h2>
				<p class="text-white/40 text-xs sm:text-sm mt-0.5">
					Ajusta el contraste de los textos y logotipo del menú según la luminosidad del video de inicio
				</p>
			</div>

			<span class="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium {navbarSiempreBlanco ? 'bg-brand-500/10 text-brand-300 border border-brand-500/20' : 'bg-white/5 text-white/60 border border-white/10'}">
				<span class="w-2 h-2 rounded-full {navbarSiempreBlanco ? 'bg-brand-400' : 'bg-white/40'}"></span>
				{navbarSiempreBlanco ? 'Fijo en Blanco' : 'Dinámico (Negro a Blanco)'}
			</span>
		</div>

		<div class="flex flex-col sm:flex-row sm:items-center justify-between gap-6 p-4 rounded-2xl bg-white/[0.02] border border-white/[0.06]">
			<div class="space-y-1 max-w-xl">
				<p class="text-sm font-semibold text-white flex items-center gap-2">
					Forzar letras y logo siempre en blanco
					{#if navbarSiempreBlanco}
						<span class="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-500/20 text-brand-300">Activo</span>
					{/if}
				</p>
				<p class="text-xs text-white/50 leading-relaxed">
					Activa esta opción si el video del hero es oscuro o nocturno para que los textos sean legibles de inmediato sin requerir scroll. Si está desactivado, empezará con letras negras y pasarán a blanco con el scroll (comportamiento original).
				</p>
			</div>

			<button
				type="button"
				role="switch"
				aria-checked={navbarSiempreBlanco}
				disabled={guardandoNavbar}
				onclick={handleToggleNavbar}
				class="relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-brand-500 focus:ring-offset-2 focus:ring-offset-black disabled:opacity-50 disabled:cursor-not-allowed {navbarSiempreBlanco ? 'bg-brand-500' : 'bg-white/20'}"
			>
				<span class="sr-only">Cambiar modo de color del navbar</span>
				<span
					aria-hidden="true"
					class="pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-lg ring-0 transition duration-200 ease-in-out {navbarSiempreBlanco ? 'translate-x-6' : 'translate-x-0'}"
				></span>
			</button>
		</div>
	</div>
</div>

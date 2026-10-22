import { supabase } from '$lib/supabaseClient';
import { extraerNombreArchivo } from '$lib/helpers/supabaseHelpers';

export const MAX_HERO_VIDEO_BYTES = 8 * 1024 * 1024; // 8 MB
export const BUCKET_NAME = 'sitio-media';
export const CLAVE_HERO_VIDEO = 'hero_video_url';
export const CLAVE_NAVBAR_SIEMPRE_BLANCO = 'navbar_siempre_blanco';

export interface HeroVideoConfig {
	url: string | null;
	updatedAt: string | null;
}

/**
 * Obtiene si el Navbar debe mostrarse siempre en blanco
 */
export async function obtenerNavbarSiempreBlanco(): Promise<boolean> {
	try {
		const valor = await obtenerConfiguracion(CLAVE_NAVBAR_SIEMPRE_BLANCO);
		return valor === 'true';
	} catch (error) {
		console.error('Error al obtener configuración de navbar_siempre_blanco:', error);
		return false;
	}
}

/**
 * Guarda la preferencia del color del Navbar
 */
export async function guardarNavbarSiempreBlanco(siempreBlanco: boolean): Promise<void> {
	await guardarConfiguracion(
		CLAVE_NAVBAR_SIEMPRE_BLANCO,
		siempreBlanco ? 'true' : 'false',
		'Si es true, el navbar muestra textos y logos en blanco desde el inicio (sin scroll)'
	);
}

/**
 * Obtiene el valor de una clave de configuración
 */
export async function obtenerConfiguracion(clave: string): Promise<string | null> {
	try {
		const { data, error } = await supabase
			.from('configuracion_sitio')
			.select('valor')
			.eq('clave', clave)
			.maybeSingle();

		if (error) throw error;
		return data?.valor || null;
	} catch (error) {
		console.error(`Error obteniendo configuración para "${clave}":`, error);
		throw error;
	}
}

/**
 * Obtiene los datos del video principal del hero
 */
export async function obtenerHeroVideo(): Promise<HeroVideoConfig> {
	try {
		const { data, error } = await supabase
			.from('configuracion_sitio')
			.select('valor, updated_at')
			.eq('clave', CLAVE_HERO_VIDEO)
			.maybeSingle();

		if (error) throw error;

		return {
			url: data?.valor ? data.valor : null,
			updatedAt: data?.updated_at || null
		};
	} catch (error) {
		console.error('Error al obtener hero video:', error);
		return { url: null, updatedAt: null };
	}
}

/**
 * Guarda o actualiza una clave en configuracion_sitio
 */
export async function guardarConfiguracion(
	clave: string,
	valor: string,
	descripcion?: string
): Promise<void> {
	try {
		const payload: { clave: string; valor: string; updated_at: string; descripcion?: string } = {
			clave,
			valor,
			updated_at: new Date().toISOString()
		};
		if (descripcion) payload.descripcion = descripcion;

		const { error } = await supabase
			.from('configuracion_sitio')
			.upsert(payload, { onConflict: 'clave' });

		if (error) throw error;
	} catch (error) {
		console.error(`Error guardando configuración para "${clave}":`, error);
		throw error;
	}
}

/**
 * Sube un nuevo video para el hero:
 * 1. Valida tamaño (< 8MB) y formato (mp4/webm).
 * 2. Borra el video anterior en Storage para no dejar huérfanos.
 * 3. Sube el nuevo archivo a sitio-media.
 * 4. Actualiza configuracion_sitio con la nueva URL pública.
 */
export async function subirHeroVideo(file: File): Promise<string> {
	// 1. Validaciones de tamaño y formato
	if (file.size > MAX_HERO_VIDEO_BYTES) {
		const pesoMB = (file.size / (1024 * 1024)).toFixed(2);
		throw new Error(
			`El archivo pesa ${pesoMB} MB. El límite máximo permitido es de 8 MB para garantizar la velocidad de carga del sitio.`
		);
	}

	const extension = file.name.split('.').pop()?.toLowerCase();
	if (extension !== 'mp4' && extension !== 'webm') {
		throw new Error('Formato no compatible. Por favor sube un archivo en formato MP4 o WebM.');
	}

	// 2. Obtener la URL actual para limpiar el archivo anterior
	const configActual = await obtenerHeroVideo();
	if (configActual.url) {
		const nombreAnterior = extraerNombreArchivo(configActual.url);
		if (nombreAnterior) {
			const rutaAnterior = nombreAnterior.startsWith('hero/')
				? nombreAnterior
				: `hero/${nombreAnterior}`;

			const { error: removeErr } = await supabase.storage
				.from(BUCKET_NAME)
				.remove([rutaAnterior, nombreAnterior]);

			if (removeErr) {
				console.warn('Advertencia al remover video anterior:', removeErr);
			}
		}
	}

	// 3. Subir nuevo archivo con timestamp para cache-busting instantáneo
	const timestamp = Date.now();
	const rutaDestino = `hero/hero-video-${timestamp}.${extension}`;

	const { error: uploadError } = await supabase.storage
		.from(BUCKET_NAME)
		.upload(rutaDestino, file, {
			cacheControl: '3600',
			upsert: false,
			contentType: file.type || (extension === 'mp4' ? 'video/mp4' : 'video/webm')
		});

	if (uploadError) {
		console.error('Error subiendo video a storage:', uploadError);
		throw uploadError;
	}

	// 4. Obtener URL pública
	const { data: urlData } = supabase.storage.from(BUCKET_NAME).getPublicUrl(rutaDestino);
	if (!urlData?.publicUrl) {
		throw new Error('No se pudo generar la URL pública del video subido.');
	}

	const nuevaUrl = urlData.publicUrl;

	// 5. Persistir en configuracion_sitio
	await guardarConfiguracion(
		CLAVE_HERO_VIDEO,
		nuevaUrl,
		'URL del video principal del hero en la página de inicio'
	);

	return nuevaUrl;
}

/**
 * Elimina el video del hero actual y restablece la configuración al default
 */
export async function eliminarHeroVideo(): Promise<void> {
	const configActual = await obtenerHeroVideo();
	if (configActual.url) {
		const nombreAnterior = extraerNombreArchivo(configActual.url);
		if (nombreAnterior) {
			const rutaAnterior = nombreAnterior.startsWith('hero/')
				? nombreAnterior
				: `hero/${nombreAnterior}`;

			await supabase.storage.from(BUCKET_NAME).remove([rutaAnterior, nombreAnterior]);
		}
	}

	await guardarConfiguracion(
		CLAVE_HERO_VIDEO,
		'',
		'URL del video principal del hero en la página de inicio'
	);
}

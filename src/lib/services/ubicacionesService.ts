import { supabase } from '$lib/supabaseClient';

// Tipos
export interface Ubicacion {
    id_ubicacion: number;
    nombre_ubicacion: string;
    estado_ubicacion: string;
    pais_ubicacion: string;
    activo: boolean;
    oculto: boolean;
    portada?: string[];
    detalle_ubicacion?: DUbicacion;
}

export interface DUbicacion {
    id_dubicacion: number;
    id_ubicacion: number;
    descripcion_larga: string;
    historia: string;
    imagenes?: string[];
}

// Nombre de la tabla - MODIFICAR ESTE VALOR según tu base de datos
const TABLA_UBICACIONES = 'cubicacion';

/**
 * Obtener todas las ubicaciones con detalle
 */
export async function obtenerUbicacionesConDetalle(): Promise<Ubicacion[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_UBICACIONES)
            .select('*, detalle_ubicacion:dubicacion(*)')
            .order('nombre_ubicacion', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo ubicaciones con detalle:', error);
        throw error;
    }
}

/**
 * Obtener una ubicación por ID con su detalle
 */
export async function obtenerUbicacionConDetalle(id: number): Promise<Ubicacion | null> {
    try {
        const { data, error } = await supabase
            .from(TABLA_UBICACIONES)
            .select('*, detalle_ubicacion:dubicacion(*)')
            .eq('id_ubicacion', id)
            .single();

        if (error) throw error;

        // Procesar detalle_ubicacion que viene como array
        if (data && Array.isArray(data.detalle_ubicacion) && data.detalle_ubicacion.length > 0) {
            data.detalle_ubicacion = data.detalle_ubicacion[0];
        }

        return data;
    } catch (error) {
        console.error('Error obteniendo ubicación con detalle:', error);
        throw error;
    }
}

/**
 * Actualizar una ubicación con su detalle
 */
export async function actualizarUbicacionConDetalle(
    id: number,
    ubicacion: Partial<Ubicacion>,
    detalle: Partial<DUbicacion>,
    supabaseClient: any
): Promise<Ubicacion> {
    try {
        // 1. Actualizar cubicacion
        const cubicacionData = {
            nombre_ubicacion: ubicacion.nombre_ubicacion,
            estado_ubicacion: ubicacion.estado_ubicacion,
            pais_ubicacion: ubicacion.pais_ubicacion,
            activo: ubicacion.activo,
            oculto: ubicacion.oculto,
            portada: ubicacion.portada
        };

        const { data, error } = await supabaseClient
            .from(TABLA_UBICACIONES)
            .update(cubicacionData)
            .eq('id_ubicacion', id)
            .select()
            .single();

        if (error) throw error;

        // 2. Actualizar dubicacion
        if (data && detalle) {
            const { error: detalleError } = await supabaseClient
                .from('dubicacion')
                .update(detalle)
                .eq('id_ubicacion', id);

            if (detalleError) {
                console.error('Error actualizando detalle:', detalleError);
                throw detalleError;
            }
        }

        return data;
    } catch (error) {
        console.error('Error actualizando ubicación:', error);
        throw error;
    }
}

/**
 * Obtener todas las ubicaciones
 */
export async function obtenerUbicaciones(): Promise<Ubicacion[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_UBICACIONES)
            .select('*')
            .order('nombre_ubicacion', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo ubicaciones:', error);
        throw error;
    }
}

/**
 * Obtener una ubicación por ID
 */
export async function obtenerUbicacionPorId(id: number): Promise<Ubicacion | null> {
    try {
        const { data, error } = await supabase
            .from(TABLA_UBICACIONES)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo ubicación:', error);
        throw error;
    }
}

/**
 * Crear una nueva ubicación
 */
export async function crearUbicacion(ubicacion: Omit<Ubicacion, 'id_ubicacion' | 'created_at' | 'updated_at'>, detalle: Omit<DUbicacion, 'id_dubicacion' | 'id_ubicacion' | 'updated_at'>, supabaseClient: any): Promise<Ubicacion> {
    try {

        const cubicacion = {
            nombre_ubicacion: ubicacion.nombre_ubicacion,
            estado_ubicacion: ubicacion.estado_ubicacion,
            pais_ubicacion: ubicacion.pais_ubicacion,
            activo: ubicacion.activo,
            oculto: ubicacion.oculto,
            portada: ubicacion.portada
        }

        const { data, error } = await supabaseClient
            .from(TABLA_UBICACIONES)
            .insert(cubicacion)
            .select()
            .single();

        if (error) throw error;

        if (data) {
            const detalleUbicacion = {
                id_ubicacion: data.id_ubicacion,
                descripcion_larga: detalle.descripcion_larga,
                historia: detalle.historia,
                imagenes: detalle.imagenes
            };
            const { error: detalleError } = await supabaseClient
                .from('dubicacion')
                .insert(detalleUbicacion);
            if (detalleError) {
                console.error('Error creando detalle de ubicación:', detalleError);
                throw detalleError;
            }

        }

        return data;
    } catch (error) {
        console.error('Error creando ubicación:', error);
        throw error;
    }
}

/**
 * Actualizar una ubicación existente
 */
export async function actualizarUbicacion(id: number, ubicacion: Partial<Ubicacion>): Promise<Ubicacion> {
    try {
        const { data, error } = await supabase
            .from(TABLA_UBICACIONES)
            .update(ubicacion)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error actualizando ubicación:', error);
        throw error;
    }
}

/**
 * Eliminar una ubicación completa (incluyendo sus experiencias asociadas, detalles e imágenes)
 */
export async function eliminarUbicacion(id: number, supabaseClient: any): Promise<void> {
    try {
        // 1. Obtener todas las experiencias asociadas
        const { data: experiencias } = await supabaseClient
            .from('cexperiencia')
            .select('id')
            .eq('id_ubicacion', id);

        // 2. Eliminar cada experiencia
        if (experiencias && experiencias.length > 0) {
            const { eliminarExperiencia } = await import('./experienciasService');
            for (const exp of experiencias) {
                await eliminarExperiencia(exp.id, supabaseClient);
            }
        }

        // 3. Obtener imágenes de la ubicación para limpiar Storage
        const { data: ubi } = await supabaseClient
            .from(TABLA_UBICACIONES)
            .select('portada')
            .eq('id_ubicacion', id)
            .single();

        const { data: ubiDet } = await supabaseClient
            .from('dubicacion')
            .select('imagenes')
            .eq('id_ubicacion', id)
            .single();

        const allImages: string[] = [];
        if (ubi?.portada) allImages.push(...ubi.portada);
        if (ubiDet?.imagenes) allImages.push(...ubiDet.imagenes);

        // 4. Borrar registros de ubicación
        await supabaseClient.from('dubicacion').delete().eq('id_ubicacion', id);
        
        const { error: ubiError } = await supabaseClient
            .from(TABLA_UBICACIONES)
            .delete()
            .eq('id_ubicacion', id);

        if (ubiError) throw ubiError;

        // 5. Limpiar archivos del bucket
        if (allImages.length > 0) {
            const { eliminarArchivosStorage } = await import('$lib/helpers/supabaseHelpers');
            await eliminarArchivosStorage('imagenesUbicaciones', allImages);
        }
    } catch (error) {
        console.error('Error eliminando ubicación completa:', error);
        throw error;
    }
}

/**
 * Obtener ubicaciones activas
 */
export async function obtenerUbicacionesActivas(): Promise<Ubicacion[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_UBICACIONES)
            .select('*')
            .eq('activo', true)
            .order('nombre', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo ubicaciones activas:', error);
        throw error;
    }
}

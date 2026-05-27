import { supabase } from '$lib/supabaseClient';
import type { DetalleExperiencia } from './detalleExperienciaService';
import type { Ubicacion } from './ubicacionesService';
import { obtenerDetalleExperienciaPorIdExperiencia } from './detalleExperienciaService';

// Tipos
export interface Experiencia {
    id?: number;
    titulo: string;
    descripcion: string;
    fecha_inicio: string;
    fecha_fin: string;
    capacidad: number;
    activo: boolean;
    oculto: boolean;
    id_ubicacion?: number;
    portada_experiencia?: string;
    cubicacion?: Ubicacion;
    detalle_experiencia?: DetalleExperiencia;
}

const TABLA_EXPERIENCIAS = 'cexperiencia';

/**
 * Obtener todas las experiencias
 */
export async function obtenerExperiencias(): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('*,cubicacion (*)')
            .order('titulo', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo experiencias:', error);
        throw error;
    }
}

/**
 * Obtener una experiencia por ID
 */
export async function obtenerExperienciaPorId(id: number): Promise<Experiencia | null> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo experiencia:', error);
        throw error;
    }
}

/**
 * Crear una nueva experiencia
 */
export async function crearExperiencia(
    experiencia: Omit<Experiencia, 'id' | 'created_at' | 'updated_at' | 'cubicacion' | 'detalle_experiencia'>,
    detalle: Partial<DetalleExperiencia>,
    supabaseClient: any
): Promise<Experiencia> {
    try {
        // 1. Crear la experiencia principal (solo campos de la tabla)
        const experienciaData = {
            titulo: experiencia.titulo,
            descripcion: experiencia.descripcion,
            fecha_inicio: experiencia.fecha_inicio,
            fecha_fin: experiencia.fecha_fin,
            capacidad: experiencia.capacidad,
            activo: experiencia.activo,
            oculto: experiencia.oculto,
            id_ubicacion: experiencia.id_ubicacion,
            portada_experiencia: experiencia.portada_experiencia
        };

        //console.log('🔍 Insertando en cexperiencia:', experienciaData);

        const { data, error } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .insert(experienciaData)
            .select()
            .single();

        if (error) {
            console.error('❌ Error en insert:', error);
            throw error;
        }

        console.log('✅ Experiencia creada:', data);

        // 2. Crear el detalle asociado
        if (data) {
            const detalleData = {
                idexperiencia: data.id,
                descripcionLarga: detalle.descripcionLarga,
                sede: detalle.sede,
                actividades: detalle.actividades,
                queincluye: detalle.queincluye,
                imagenes: detalle.imagenes
            };

            const { error: detalleError } = await supabaseClient
                .from('dexperiencia')
                .insert(detalleData);

            if (detalleError) {
                console.error('Error creando detalle de experiencia:', detalleError);
                throw detalleError;
            }

            console.log('Detalle experiencia creado para id:', data.id);
        }

        return data;
    } catch (error) {
        console.error('Error creando experiencia:', error);
        throw error;
    }
}

/**
 * Actualizar una experiencia existente
 */
export async function actualizarExperiencia(id: number, experiencia: Partial<Experiencia>, detalle: Partial<DetalleExperiencia>, supabaseClient: any): Promise<Experiencia> {
    try {
        const { data, error } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .update({
                titulo: experiencia.titulo,
                descripcion: experiencia.descripcion,
                fecha_inicio: experiencia.fecha_inicio,
                fecha_fin: experiencia.fecha_fin,
                capacidad: experiencia.capacidad,
                activo: experiencia.activo,
                oculto: experiencia.oculto,
                id_ubicacion: experiencia.id_ubicacion,
                portada_experiencia: experiencia.portada_experiencia
            })
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;
        if (data) {
            const { data: detalleData, error: detalleError } = await supabaseClient
                .from('dexperiencia')
                .update(detalle)
                .eq('idexperiencia', data.id);
            if (detalleError) throw detalleError;
            console.log('Detalle experiencia actualizado:', detalleData);
        }

        return data;
    } catch (error) {
        console.error('Error actualizando experiencia:', error);
        throw error;
    }
}

/**
 * Eliminar una experiencia completa (solo si no tiene reservas)
 */
export async function eliminarExperiencia(id: number, supabaseClient: any): Promise<void> {
    try {
        // 1. Verificar si existen reservas activas
        const { count, error: countError } = await supabaseClient
            .from('mreserva')
            .select('*', { count: 'exact', head: true })
            .eq('experiencia_id', id);

        if (countError) throw countError;

        if (count && count > 0) {
            throw new Error(`No se puede eliminar la experiencia porque tiene ${count} reserva(s) asociada(s). Si deseas retirarla de la web, utiliza la opción "Ocultar".`);
        }

        console.log(`🗑️ Iniciando eliminación de experiencia ID: ${id}`);

        // 2. Obtener imágenes para limpieza
        const { data: exp } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .select('portada_experiencia')
            .eq('id', id)
            .single();

        const { data: det } = await supabaseClient
            .from('dexperiencia')
            .select('imagenes')
            .eq('idexperiencia', id)
            .single();

        const { data: habs } = await supabaseClient
            .from('chabitacion')
            .select('imagenes')
            .eq('idexperiencia', id);

        const allImages: string[] = [];
        if (exp?.portada_experiencia) allImages.push(exp.portada_experiencia);
        if (det?.imagenes) allImages.push(...det.imagenes);
        if (habs) {
            habs.forEach((h: any) => {
                if (h.imagenes) allImages.push(...h.imagenes);
            });
        }

        // 3. Eliminar registros en orden
        
        // a. Detalle de habitaciones (dhabitacion)
        const { data: habitaciones } = await supabaseClient
            .from('chabitacion')
            .select('id')
            .eq('idexperiencia', id);
        
        if (habitaciones && habitaciones.length > 0) {
            const ids = habitaciones.map((h: any) => h.id);
            await supabaseClient
                .from('dhabitacion')
                .delete()
                .in('id_chabitacion', ids);
        }

        // b. Habitaciones (chabitacion)
        await supabaseClient
            .from('chabitacion')
            .delete()
            .eq('idexperiencia', id);

        // c. Detalle experiencia (dexperiencia)
        await supabaseClient
            .from('dexperiencia')
            .delete()
            .eq('idexperiencia', id);

        // d. Experiencia principal (cexperiencia)
        const { error: deleteExpError } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .delete()
            .eq('id', id);

        if (deleteExpError) throw deleteExpError;

        // 4. Limpiar storage
        if (allImages.length > 0) {
            const { eliminarArchivosStorage } = await import('$lib/helpers/supabaseHelpers');
            await eliminarArchivosStorage('imagenesExperiencias', allImages);
        }

        console.log(`✅ Experiencia ${id} eliminada correctamente`);
    } catch (error) {
        console.error('Error eliminando experiencia:', error);
        throw error;
    }
}

/**
 * Obtener experiencias activas
 */
export async function obtenerExperienciasActivas(): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('*')
            .eq('activo', true)
            .order('titulo', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo experiencias activas:', error);
        throw error;
    }
}

/**
 * Obtener la experiencia activa actual (solo debería haber una)
 */
export async function obtenerExperienciaActiva(): Promise<Pick<Experiencia, 'id' | 'titulo' | 'activo'> | null> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('id, titulo, activo')
            .eq('activo', true)
            .limit(1)
            .single();

        if (error) {
            // Si no hay ninguna activa, retornar null sin error
            if (error.code === 'PGRST116') return null;
            throw error;
        }

        return data;
    } catch (error) {
        console.error('Error obteniendo experiencia activa:', error);
        return null;
    }
}/**
 * Buscar experiencias por ubicación
 */
export async function obtenerExperienciasPorUbicacion(ubicacion: string): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('*')
            .eq('ubicacion', ubicacion)
            .order('nombre', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo experiencias por ubicación:', error);
        throw error;
    }
}

/**
 * Buscar experiencias por rango de precio
 */
export async function obtenerExperienciasPorPrecio(precioMin: number, precioMax: number): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('*')
            .gte('precio', precioMin)
            .lte('precio', precioMax)
            .order('precio', { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error('Error obteniendo experiencias por precio:', error);
        throw error;
    }
}

export async function obtenerExperienciaConDetalleById(id: number): Promise<Experiencia | null> {
    try {
        const { data, error } = await supabase
            .from(TABLA_EXPERIENCIAS)
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        if (data) {
            const detalle: DetalleExperiencia = await obtenerDetalleExperienciaPorIdExperiencia(data.id);
            data.detalle_experiencia = detalle;
        }
        return data;
    } catch (error) {
        console.error('Error obteniendo experiencia con detalle:', error);
        throw error;
    }
}

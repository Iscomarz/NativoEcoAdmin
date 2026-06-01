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
export async function obtenerExperiencias(supabaseClient = supabase): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabaseClient
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
export async function obtenerExperienciaPorId(id: number, supabaseClient = supabase): Promise<Experiencia | null> {
    try {
        const { data, error } = await supabaseClient
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
export async function obtenerExperienciasActivas(supabaseClient = supabase): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabaseClient
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
export async function obtenerExperienciaActiva(supabaseClient = supabase): Promise<Pick<Experiencia, 'id' | 'titulo' | 'activo' | 'fecha_fin'> | null> {
    try {
        const { data, error } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .select('id, titulo, activo, fecha_fin')
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
}

/**
 * Verifica si existe una experiencia activa.
 * Si ya caducó (su fecha_fin es anterior a hoy), la desactiva actualizando 'activo' a false
 * y retorna true (permitiendo activar la nueva).
 * Si no ha caducado, retorna false (impidiendo la activación).
 * Si no hay ninguna activa, retorna true.
 */
export async function verificarYDesactivarExperienciaActivaCaducada(
    supabaseClient: any,
    idExcluir?: number
): Promise<boolean> {
    try {
        const { data: activa, error } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .select('id, titulo, activo, fecha_fin')
            .eq('activo', true);

        if (error) throw error;

        // Si no hay ninguna experiencia activa, todo bien
        if (!activa || activa.length === 0) return true;

        // Si hay una activa, verificamos.
        // Pero si estamos editando y la activa es la que estamos editando (idExcluir), la ignoramos
        const experienciaActiva = activa[0];
        if (idExcluir && experienciaActiva.id === idExcluir) {
            return true;
        }

        const hoy = new Date();
        const fechaFin = new Date(experienciaActiva.fecha_fin);

        if (fechaFin < hoy) {
            // Ya caducó, por lo tanto desactivamos la vieja
            console.log(`⚠️ Desactivando experiencia activa caducada: "${experienciaActiva.titulo}" (ID: ${experienciaActiva.id})`);
            const { error: updateError } = await supabaseClient
                .from(TABLA_EXPERIENCIAS)
                .update({ activo: false })
                .eq('id', experienciaActiva.id);

            if (updateError) throw updateError;
            return true;
        }

        // Si sigue vigente, no podemos desactivarla automáticamente
        return false;
    } catch (error) {
        console.error('Error en verificarYDesactivarExperienciaActivaCaducada:', error);
        throw error;
    }
}

/**
 * Notifica a los clientes interesados en una ubicación cuando se activa una nueva experiencia.
 */
/**
 * Notifica a los clientes interesados en una ubicación cuando se activa una nueva experiencia.
 */
export async function notificarClientesInteresados(
    idExperiencia: number,
    supabaseClient: any
): Promise<void> {
    try {
        console.log(`🔍 Iniciando proceso de notificación para experiencia ID: ${idExperiencia}`);
        
        // Determinar si usamos el cliente normal o uno con service_role para saltar RLS en consultas administrativas
        let client = supabaseClient;
        try {
            const { PUBLIC_SUPABASE_URL } = await import('$env/static/public');
            const { SUPABASE_SERVICE_ROLE_KEY } = await import('$env/static/private');
            
            if (SUPABASE_SERVICE_ROLE_KEY) {
                const { createClient } = await import('@supabase/supabase-js');
                client = createClient(PUBLIC_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
                    auth: {
                        persistSession: false,
                        autoRefreshToken: false
                    }
                });
                console.log('🔑 Usando cliente Supabase con service_role (Admin) para evadir RLS.');
            } else {
                console.log('⚠️ No se detectó SUPABASE_SERVICE_ROLE_KEY. Usando cliente del contexto (sujeto a RLS).');
            }
        } catch (envError) {
            console.warn('⚠️ No se pudieron cargar las variables privadas del servidor para service_role. Usando cliente por defecto.', envError);
        }

        // 1. Obtener la experiencia principal
        const { data: exp, error: errorExp } = await client
            .from(TABLA_EXPERIENCIAS)
            .select('titulo, fecha_inicio, id_ubicacion')
            .eq('id', idExperiencia)
            .single();

        if (errorExp) throw errorExp;
        if (!exp) {
            console.warn(`⚠️ No se encontró la experiencia con ID: ${idExperiencia}`);
            return;
        }

        const idUbicacion = exp.id_ubicacion;
        const tituloExperiencia = exp.titulo;
        const fechaInicio = exp.fecha_inicio;

        if (!idUbicacion) {
            console.log('📝 La experiencia no tiene una ubicación asignada.');
            return;
        }

        // 2. Obtener las imágenes del detalle de la experiencia (dexperiencia)
        const { data: detalle, error: errorDetalle } = await client
            .from('dexperiencia')
            .select('imagenes')
            .eq('idexperiencia', idExperiencia)
            .maybeSingle();

        const imagenes = detalle?.imagenes || [];
        console.log(`🖼️ Imágenes encontradas en el detalle para el correo:`, imagenes);

        // 3. Obtener los usuarios interesados de rfavoritoubicacion
        const { data: interesados, error: errorInteresados } = await client
            .from('rfavoritoubicacion')
            .select('usuario_id')
            .eq('ubicacion_id', idUbicacion)
            .eq('notificar', true);

        if (errorInteresados) throw errorInteresados;
        if (!interesados || interesados.length === 0) {
            console.log('📝 No hay clientes interesados en recibir notificaciones para esta ubicación.');
            return;
        }

        const idsUsuarios = interesados.map((item: any) => item.usuario_id).filter(Boolean);
        if (idsUsuarios.length === 0) {
            console.log('📝 No hay UUIDs válidos para buscar.');
            return;
        }

        // 4. Obtener correos de la tabla susuario (donde idAuth está en la lista de idsUsuarios)
        const { data: usuarios, error: errorUsuarios } = await client
            .from('susuario')
            .select('correo')
            .in('idAuth', idsUsuarios);

        if (errorUsuarios) throw errorUsuarios;
        if (!usuarios || usuarios.length === 0) {
            console.log('📝 No se encontraron correos en la tabla susuario para los usuarios interesados.');
            return;
        }

        // Limpiar y obtener correos únicos
        const correos = Array.from(new Set(
            usuarios
                .map((u: any) => u.correo?.trim())
                .filter(Boolean)
        )) as string[];

        if (correos.length === 0) {
            console.log('📝 No hay correos válidos para notificar.');
            return;
        }

        // 5. Obtener el nombre de la ubicación para personalizar el correo
        const { data: ubicacion, error: errorUbi } = await client
            .from('cubicacion')
            .select('nombre_ubicacion')
            .eq('id_ubicacion', idUbicacion)
            .maybeSingle();

        const nombreUbicacion = ubicacion ? ubicacion.nombre_ubicacion : 'tu ubicación favorita';

        // 6. Importar y llamar al servicio de Resend
        const { enviarCorreoAvisoExperiencia } = await import('./resendService');
        await enviarCorreoAvisoExperiencia(correos, nombreUbicacion, tituloExperiencia, fechaInicio, imagenes);

    } catch (error) {
        console.error('❌ Error en notificarClientesInteresados:', error);
    }
}/**
 * Buscar experiencias por ubicación
 */
export async function obtenerExperienciasPorUbicacion(ubicacion: string, supabaseClient = supabase): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabaseClient
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
export async function obtenerExperienciasPorPrecio(precioMin: number, precioMax: number, supabaseClient = supabase): Promise<Experiencia[]> {
    try {
        const { data, error } = await supabaseClient
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

export async function obtenerExperienciaConDetalleById(id: number, supabaseClient = supabase): Promise<Experiencia | null> {
    try {
        const { data, error } = await supabaseClient
            .from(TABLA_EXPERIENCIAS)
            .select('*')
            .eq('id', id)
            .single();
        if (error) throw error;

        if (data) {
            const detalle: DetalleExperiencia = await obtenerDetalleExperienciaPorIdExperiencia(data.id, supabaseClient);
            data.detalle_experiencia = detalle;
        }
        return data;
    } catch (error) {
        console.error('Error obtaining experience with detail:', error);
        throw error;
    }
}

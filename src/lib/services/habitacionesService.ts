import { supabase } from '$lib/supabaseClient';

//Tipos
export interface chabitacion {
    id?: number;
    nombre: string;
    habitacion_descripcion: string;
    precioPersona: number;
    precioCuarto: number;
    imagenes?: string[];
    idexperiencia?: number;
    cantidad_habitacion: number;
    capacidad?: number;
}

export interface dhabitacion {
    id?: number;
    capacidad: number;
    id_chabitacion: number;
    conteo_capacidad: number;
    id_estatus?: number;
}

const TABLA_HABITACIONES = 'chabitacion';
const TABLA_DETALLE_HABITACIONES = 'dhabitacion';

/**
 * Crear una nueva habitación junto con su detalle
 */
export async function crearHabitacion(nuevaHabitacion: chabitacion, detalleHabitacion: dhabitacion, supabaseInstance: any): Promise<chabitacion> {
    try {
        const { data, error } = await supabaseInstance
            .from(TABLA_HABITACIONES)
            .insert(nuevaHabitacion)
            .select()
            .single();
        if (error) throw error;

        if (data) {

            let habitacionesDetalle: dhabitacion[] = [];
            for (let numero: number = 0; numero < nuevaHabitacion.cantidad_habitacion; numero++) {
                const habitacion: dhabitacion = {
                    capacidad: detalleHabitacion.capacidad,
                    id_chabitacion: data.id,
                    conteo_capacidad: 0,
                    id_estatus: 1 // Estado inicial (disponible)
                }
                habitacionesDetalle.push(habitacion);
            }
            const { data: detalleData, error: detalleError } = await supabaseInstance
                .from(TABLA_DETALLE_HABITACIONES)
                .insert(habitacionesDetalle);
            if (detalleError) {
                console.error('Error creando detalle de habitación:', detalleError);
                throw detalleError;
            }
        }

        return data;
    } catch (error) {
        console.error('Error creando habitación:', error);
        throw error;
    }
}

/**
 * Obtener habitaciones por ID experiencia
 */
export async function obtenerHabitacionesByIdExperiencia(idExp: number): Promise<chabitacion[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_HABITACIONES)
            .select('*')
            .eq('idexperiencia', idExp);

        if (error) throw error;

        return data;

    } catch (error) {
        console.error('Error obteniendo habitaciones:', error);
        throw error;
    }
}

/**
 * Interface para estadísticas de habitación
 */
export interface EstadisticasHabitacion {
    capacidadTotal: number;
    ocupadoTotal: number;
    disponibleTotal: number;
    porcentajeOcupacion: number;
    habitacionesLlenas: number;
    habitacionesParciales: number;
    habitacionesVacias: number;
}

export interface HabitacionConEstado extends chabitacion {
    detalles: dhabitacion[];
    estadisticas: EstadisticasHabitacion;
}

/**
 * Obtener habitaciones con detalles y estadísticas de ocupación
 */
export async function obtenerEstadoHabitacionesPorExperiencia(
    idExp: number
): Promise<HabitacionConEstado[]> {
    try {
        // 1. Obtener habitaciones
        const { data: habitaciones, error: errorHab } = await supabase
            .from(TABLA_HABITACIONES)
            .select('*')
            .eq('idexperiencia', idExp);

        if (errorHab) throw errorHab;
        if (!habitaciones) return [];

        // 2. Obtener detalles de cada habitación y calcular estadísticas
        const habitacionesConEstado = await Promise.all(
            habitaciones.map(async (hab) => {
                const { data: detalles, error: errorDet } = await supabase
                    .from(TABLA_DETALLE_HABITACIONES)
                    .select('*')
                    .eq('id_chabitacion', hab.id);

                if (errorDet) {
                    console.error('Error obteniendo detalles:', errorDet);
                    return {
                        ...hab,
                        detalles: [],
                        estadisticas: calcularEstadisticas([], hab.cantidad_habitacion, hab.capacidad || 0)
                    };
                }

                return {
                    ...hab,
                    detalles: detalles || [],
                    estadisticas: calcularEstadisticas(
                        detalles || [],
                        hab.cantidad_habitacion,
                        hab.capacidad || 0
                    )
                };
            })
        );

        return habitacionesConEstado;
    } catch (error) {
        console.error('Error obteniendo estado de habitaciones:', error);
        throw error;
    }
}

/**
 * Calcular estadísticas de ocupación para una habitación
 */
function calcularEstadisticas(
    detalles: dhabitacion[],
    cantidadHabitaciones: number,
    capacidadPorHabitacion: number
): EstadisticasHabitacion {
    const capacidadTotal = cantidadHabitaciones * capacidadPorHabitacion;
    const ocupadoTotal = detalles.reduce((sum, d) => sum + d.conteo_capacidad, 0);
    const disponibleTotal = capacidadTotal - ocupadoTotal;
    const porcentajeOcupacion = capacidadTotal > 0 ? (ocupadoTotal / capacidadTotal) * 100 : 0;

    // Contar habitaciones por estado
    let habitacionesLlenas = 0;
    let habitacionesParciales = 0;
    let habitacionesVacias = 0;

    detalles.forEach((detalle) => {
        if (detalle.conteo_capacidad === 0) {
            habitacionesVacias++;
        } else if (detalle.conteo_capacidad === detalle.capacidad) {
            habitacionesLlenas++;
        } else {
            habitacionesParciales++;
        }
    });

    return {
        capacidadTotal,
        ocupadoTotal,
        disponibleTotal,
        porcentajeOcupacion: Math.round(porcentajeOcupacion * 100) / 100,
        habitacionesLlenas,
        habitacionesParciales,
        habitacionesVacias
    };
}

/**
 * Actualizar habitación y ajustar detalles según cantidad_habitacion
 */
export async function actualizarHabitacion(
    id: number,
    habitacionActualizada: Partial<chabitacion>,
    capacidad: number,
    supabaseInstance: any
): Promise<chabitacion> {
    try {
        // 1. Actualizar la habitación principal
        const { data, error } = await supabaseInstance
            .from(TABLA_HABITACIONES)
            .update(habitacionActualizada)
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // 2. Si cambió la cantidad_habitacion, ajustar dhabitacion
        if (habitacionActualizada.cantidad_habitacion !== undefined) {
            await ajustarCantidadDetalles(
                id,
                habitacionActualizada.cantidad_habitacion,
                capacidad,
                supabaseInstance
            );
        }

        return data;
    } catch (error) {
        console.error('Error actualizando habitación:', error);
        throw error;
    }
}

/**
 * Ajustar la cantidad de registros en dhabitacion según cantidad_habitacion
 */
async function ajustarCantidadDetalles(
    id_chabitacion: number,
    nuevaCantidad: number,
    capacidad: number,
    supabaseInstance: any
): Promise<void> {
    try {
        // Obtener detalles actuales
        const { data: detallesActuales, error: errorGet } = await supabaseInstance
            .from(TABLA_DETALLE_HABITACIONES)
            .select('*')
            .eq('id_chabitacion', id_chabitacion);

        if (errorGet) throw errorGet;

        const cantidadActual = detallesActuales?.length || 0;

        if (nuevaCantidad > cantidadActual) {
            // Crear registros adicionales
            const registrosNuevos: dhabitacion[] = [];
            for (let i = 0; i < nuevaCantidad - cantidadActual; i++) {
                registrosNuevos.push({
                    capacidad,
                    id_chabitacion,
                    conteo_capacidad: 0,
                    id_estatus: 1
                });
            }

            const { error: errorInsert } = await supabaseInstance
                .from(TABLA_DETALLE_HABITACIONES)
                .insert(registrosNuevos);

            if (errorInsert) throw errorInsert;
            console.log(`✅ Se crearon ${registrosNuevos.length} registros de detalle`);
        } else if (nuevaCantidad < cantidadActual) {
            // Eliminar registros sobrantes (los últimos creados)
            const registrosAEliminar = detallesActuales
                .sort((a: dhabitacion, b: dhabitacion) => (b.id || 0) - (a.id || 0))
                .slice(0, cantidadActual - nuevaCantidad)
                .map((d: dhabitacion) => d.id);

            const { error: errorDelete } = await supabaseInstance
                .from(TABLA_DETALLE_HABITACIONES)
                .delete()
                .in('id', registrosAEliminar);

            if (errorDelete) throw errorDelete;
            console.log(`✅ Se eliminaron ${registrosAEliminar.length} registros de detalle`);
        }

        // Actualizar la capacidad en todos los registros existentes
        const { error: errorUpdate } = await supabaseInstance
            .from(TABLA_DETALLE_HABITACIONES)
            .update({ capacidad })
            .eq('id_chabitacion', id_chabitacion);

        if (errorUpdate) throw errorUpdate;
    } catch (error) {
        console.error('Error ajustando cantidad de detalles:', error);
        throw error;
    }
}

/**
 * Eliminar habitación y todos sus detalles
 */
export async function eliminarHabitacion(id: number, supabaseInstance: any): Promise<void> {
    try {
        // 1. Primero eliminar detalles (por FK constraint)
        const { error: errorDetalles } = await supabaseInstance
            .from(TABLA_DETALLE_HABITACIONES)
            .delete()
            .eq('id_chabitacion', id);

        if (errorDetalles) throw errorDetalles;

        // 2. Luego eliminar la habitación principal
        const { error: errorHabitacion } = await supabaseInstance
            .from(TABLA_HABITACIONES)
            .delete()
            .eq('id', id);

        if (errorHabitacion) throw errorHabitacion;

        console.log(`✅ Habitación ${id} eliminada correctamente`);
    } catch (error) {
        console.error('Error eliminando habitación:', error);
        throw error;
    }
}
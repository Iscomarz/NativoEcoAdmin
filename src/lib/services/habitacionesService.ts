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
 * Obtener todas las habitaciones
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
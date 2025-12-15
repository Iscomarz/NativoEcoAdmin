import { supabase } from '$lib/supabaseClient';
export interface DetalleExperiencia {
    id: number;
    idexperiencia: number;
    descripcionLarga: string;
    sede: string;
    actividades: string;
    queincluye: string;
    imagenes?: string[];
}

const TABLA_DETALLE = 'dexperiencia';

/**
 * Obtener el detalle de una experiencia por ID de experiencia
 */
export async function obtenerDetalleExperienciaPorIdExperiencia(idexperiencia: number): Promise<DetalleExperiencia> {
    try {
        const { data, error } = await supabase
            .from(TABLA_DETALLE)
            .select('*')
            .eq('idexperiencia', idexperiencia)
            .single();
        if (error) throw error;
        return data;
    } catch (error) {
        console.error('Error obteniendo detalle de experiencia:', error);
        throw error;
    }
}
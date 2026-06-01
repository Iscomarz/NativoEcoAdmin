import { json } from '@sveltejs/kit';
import { obtenerHabitacionesByIdExperiencia } from '$lib/services/habitacionesService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const id = Number(params.id);
        if (isNaN(id)) {
            return json({ error: 'ID inválido' }, { status: 400 });
        }
        const habitaciones = await obtenerHabitacionesByIdExperiencia(id, locals.supabase);
        return json(habitaciones);
    } catch (error: any) {
        return json({ error: error.message || 'Error al obtener habitaciones' }, { status: 500 });
    }
};

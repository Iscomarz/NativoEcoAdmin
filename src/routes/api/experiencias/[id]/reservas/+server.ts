import { json } from '@sveltejs/kit';
import { obtenerReservasByExperiencia } from '$lib/services/reservasService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const id = Number(params.id);
        if (isNaN(id)) {
            return json({ error: 'ID inválido' }, { status: 400 });
        }
        const reservas = await obtenerReservasByExperiencia(id, locals.supabase);
        return json(reservas);
    } catch (error: any) {
        return json({ error: error.message || 'Error al obtener reservas' }, { status: 500 });
    }
};

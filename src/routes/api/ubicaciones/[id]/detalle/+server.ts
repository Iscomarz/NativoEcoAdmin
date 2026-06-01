import { json } from '@sveltejs/kit';
import { obtenerUbicacionConDetalle } from '$lib/services/ubicacionesService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const id = Number(params.id);
        if (isNaN(id)) {
            return json({ error: 'ID de ubicación inválido' }, { status: 400 });
        }
        const detalle = await obtenerUbicacionConDetalle(id, locals.supabase);
        return json(detalle);
    } catch (error: any) {
        return json({ error: error.message || 'Error al obtener detalle de ubicación' }, { status: 500 });
    }
};

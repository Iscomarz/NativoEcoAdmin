import { json } from '@sveltejs/kit';
import { obtenerUbicacionesConDetalle, obtenerUbicaciones } from '$lib/services/ubicacionesService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ url, locals }) => {
    try {
        const conDetalle = url.searchParams.get('conDetalle') === 'true';
        if (conDetalle) {
            const ubicaciones = await obtenerUbicacionesConDetalle(locals.supabase);
            return json(ubicaciones);
        } else {
            const ubicaciones = await obtenerUbicaciones(locals.supabase);
            return json(ubicaciones);
        }
    } catch (error: any) {
        return json({ error: error.message || 'Error al obtener ubicaciones' }, { status: 500 });
    }
};

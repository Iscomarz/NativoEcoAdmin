import { json } from '@sveltejs/kit';
import { obtenerExperiencias } from '$lib/services/experienciasService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ locals }) => {
    try {
        const experiencias = await obtenerExperiencias(locals.supabase);
        return json(experiencias);
    } catch (error: any) {
        return json({ error: error.message || 'Error al obtener experiencias' }, { status: 500 });
    }
};

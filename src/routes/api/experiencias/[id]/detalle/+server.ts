import { json } from '@sveltejs/kit';
import { obtenerDetalleExperienciaPorIdExperiencia } from '$lib/services/detalleExperienciaService';
import type { RequestHandler } from './$types';

export const GET: RequestHandler = async ({ params, locals }) => {
    try {
        const id = Number(params.id);
        if (isNaN(id)) {
            return json({ error: 'ID inválido' }, { status: 400 });
        }
        const detalle = await obtenerDetalleExperienciaPorIdExperiencia(id, locals.supabase);
        return json(detalle);
    } catch (error: any) {
        return json({ error: error.message || 'Error al obtener detalle de experiencia' }, { status: 500 });
    }
};

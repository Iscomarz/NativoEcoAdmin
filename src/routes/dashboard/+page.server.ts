import type { Experiencia } from '$lib/services/experienciasService';
import type { Ubicacion } from '$lib/services/ubicacionesService';
import type { mreserva } from '$lib/services/reservasService';
import { obtenerExperiencias } from '$lib/services/experienciasService';
import { obtenerUbicaciones } from '$lib/services/ubicacionesService';
import { obtenerTodasLasReservas } from '$lib/services/reservasService';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals }) => {
    try {
        // Ejecutar las consultas de manera paralela para mejorar el tiempo de respuesta
        const [experiencias, ubicaciones, reservas] = await Promise.all([
            obtenerExperiencias(),
            obtenerUbicaciones(),
            obtenerTodasLasReservas()
        ]);

        return {
            experiencias: experiencias || [],
            ubicaciones: ubicaciones || [],
            reservas: reservas || [],
            session: await locals.getSession()
        };
    } catch (error) {
        console.error('Error cargando datos para el dashboard:', error);
        return {
            experiencias: [],
            ubicaciones: [],
            reservas: [],
            session: null
        };
    }
};

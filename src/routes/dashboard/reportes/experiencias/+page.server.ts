import { obtenerExperiencias } from '$lib/services/experienciasService';
import { obtenerTodasLasReservas } from '$lib/services/reservasService';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async () => {
    try {
        const [experiencias, reservas] = await Promise.all([
            obtenerExperiencias(),
            obtenerTodasLasReservas()
        ]);

        return {
            experiencias: experiencias || [],
            reservas: reservas || []
        };
    } catch (error) {
        console.error('Error cargando reporte de experiencias:', error);
        return {
            experiencias: [],
            reservas: []
        };
    }
};

import { obtenerReservasConExperiencia } from '$lib/services/reservasService';
import type { PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async () => {
    try {
        const reservas = await obtenerReservasConExperiencia();
        console.log(reservas);
        return {
            reservas: reservas || []
        };
    } catch (error) {
        console.error('Error cargando reporte de ventas:', error);
        return {
            reservas: []
        };
    }
};

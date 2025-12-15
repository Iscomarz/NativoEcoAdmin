import { redirect } from '@sveltejs/kit';
import type { LayoutServerLoad } from './$types';

export const load: LayoutServerLoad = async ({ url, locals: { getSession } }) => {
    const publicRoutes = ['/login'];
    const isPublicRoute = publicRoutes.some(route => url.pathname.startsWith(route));

    // Si no estamos en una ruta pública, permitir el acceso
    // La verificación de autenticación se hace en el cliente con el auth store
    return {
        isPublicRoute, session: await getSession()
    };
};

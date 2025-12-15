import { supabase } from '$lib/supabaseClient';

/**
 * Espera a que haya una sesión activa con reintentos
 */
async function esperarSesion(intentos = 3, delay = 100): Promise<any> {
    for (let i = 0; i < intentos; i++) {
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            return session;
        }
        if (i < intentos - 1) {
            await new Promise(resolve => setTimeout(resolve, delay));
        }
    }
    return null;
}

/**
 * Verifica si hay una sesión activa de Supabase
 * Útil para debugging de RLS
 */
export async function verificarSesionActiva(): Promise<boolean> {
    try {
        // Intentar obtener sesión con reintentos
        let session = await esperarSesion(3, 100);

        // Si no hay sesión después de reintentos, intentar refrescar
        if (!session) {
            console.log('🔄 Intentando refrescar sesión...');
            const refreshResult = await supabase.auth.refreshSession();
            session = refreshResult.data.session;

            if (refreshResult.error) {
                console.error('❌ Error refrescando sesión:', refreshResult.error);
                return false;
            }
        }

        if (session) {
            console.log('✅ Sesión verificada:', {
                user: session.user.email,
                expires_at: new Date(session.expires_at! * 1000).toLocaleString(),
                access_token_present: !!session.access_token
            });
            return true;
        } else {
            console.warn('⚠️ No hay sesión activa en Supabase');
            return false;
        }
    } catch (error) {
        console.error('❌ Error al verificar sesión:', error);
        return false;
    }
}

/**
 * Obtiene el token de acceso actual
 */
export async function obtenerTokenAcceso(): Promise<string | null> {
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
}

/**
 * Verifica si el usuario tiene una sesión válida antes de hacer una operación
 */
export async function ejecutarConSesion<T>(
    operacion: () => Promise<T>,
    nombreOperacion: string = 'Operación'
): Promise<T> {
    const haySession = await verificarSesionActiva();

    if (!haySession) {
        throw new Error(`${nombreOperacion}: No hay sesión activa. Por favor, inicia sesión nuevamente.`);
    }

    return await operacion();
}

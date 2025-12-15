import { createServerClient } from '@supabase/ssr';
import { type Handle, redirect } from '@sveltejs/kit';
import { sequence } from '@sveltejs/kit/hooks';
import { PUBLIC_SUPABASE_URL, PUBLIC_SUPABASE_ANON_KEY } from '$env/static/public';


const supabase: Handle = async ({ event, resolve }) => {
    event.locals.supabase = createServerClient(
        PUBLIC_SUPABASE_URL,
        PUBLIC_SUPABASE_ANON_KEY,
        {
            cookies: {
                getAll: () => event.cookies.getAll(),
                setAll: (cookiesToSet) => {
                    cookiesToSet.forEach(({ name, value, options }) => {
                        event.cookies.set(name, value, { ...options, path: '/' });
                    });
                },
            },
        }
    );

    event.locals.getSession = async () => {
        const {
            data: { session },
        } = await event.locals.supabase.auth.getSession();
        return session;
    };

    return resolve(event, {
        filterSerializedResponseHeaders(name) {
            return name === 'content-range' || name === 'x-supabase-api-version';
        },
    });
};

const authGuard: Handle = async ({ event, resolve }) => {
    const session = await event.locals.getSession();
    const url = new URL(event.request.url);

    // Rutas públicas
    if (url.pathname === '/' || url.pathname === '/login') {
        return resolve(event);
    }

    // Proteger dashboard
    if (url.pathname.startsWith('/dashboard') && !session) {
        throw redirect(303, '/login');
    }

    return resolve(event);
};

export const handle = sequence(supabase, authGuard);

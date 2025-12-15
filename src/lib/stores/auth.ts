import { writable } from 'svelte/store';
import { browser } from '$app/environment';
import { supabase } from '$lib/supabaseClient';

export interface User {
    id: string;
    email: string;
    name: string;
}

function createAuthStore() {
    const storedUser = browser ? localStorage.getItem('nativo-user') : null;
    const initialUser = storedUser ? JSON.parse(storedUser) : null;

    const { subscribe, set, update } = writable<User | null>(initialUser);

    return {
        subscribe,
        login: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
            try {
                const { data, error } = await supabase.auth.signInWithPassword({
                    email,
                    password
                });

                if (error) {
                    return { success: false, error: error.message };
                }

                if (data.user && data.session) {
                    const user: User = {
                        id: data.user.id,
                        email: data.user.email || '',
                        name: data.user.email?.split('@')[0] || 'Usuario'
                    };

                    if (browser) {
                        localStorage.setItem('nativo-user', JSON.stringify(user));
                    }

                    console.log(await supabase.auth.getUser());


                    set(user);
                    return { success: true };
                }

                return { success: false, error: 'Error al autenticar' };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                return { success: false, error: errorMessage };
            }
        },

        signup: async (email: string, password: string): Promise<{ success: boolean; error?: string }> => {
            try {
                const { data, error } = await supabase.auth.signUp({
                    email,
                    password
                });

                if (error) {
                    return { success: false, error: error.message };
                }

                if (data.user) {
                    return { success: true };
                }

                return { success: false, error: 'Error al registrar' };
            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Error desconocido';
                return { success: false, error: errorMessage };
            }
        },

        logout: async () => {
            try {
                await supabase.auth.signOut();
                if (browser) {
                    localStorage.removeItem('nativo-user');
                }
                set(null);
            } catch (error) {
                console.error('Error al cerrar sesión:', error);
            }
        },

        checkAuth: async () => {
            if (browser) {
                try {
                    const { data: { session } } = await supabase.auth.getSession();

                    if (session?.user) {
                        const user: User = {
                            id: session.user.id,
                            email: session.user.email || '',
                            name: session.user.email?.split('@')[0] || 'Usuario'
                        };
                        set(user);
                        localStorage.setItem('nativo-user', JSON.stringify(user));
                    } else {
                        const storedUser = localStorage.getItem('nativo-user');
                        if (storedUser) {
                            set(JSON.parse(storedUser));
                        } else {
                            set(null);
                        }
                    }
                } catch (error) {
                    console.error('Error al verificar sesión:', error);
                    set(null);
                }
            }
        }
    };
}

export const auth = createAuthStore();

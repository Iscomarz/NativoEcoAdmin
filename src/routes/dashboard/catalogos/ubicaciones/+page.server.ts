import { obtenerUbicacionesConDetalle, crearUbicacion, actualizarUbicacionConDetalle } from '$lib/services/ubicacionesService';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

export const load: PageServerLoad = async ({ locals }) => {
    try {
        const ubicaciones = await obtenerUbicacionesConDetalle();

        return {
            ubicaciones: ubicaciones || [],
            session: await locals.getSession()
        };
    } catch (error) {
        console.error('Error cargando ubicaciones:', error);
        return {
            ubicaciones: [],
            session: null
        };
    }
};

export const actions: Actions = {
    crear: async ({ request, locals }) => {
        try {
            const formData = await request.formData();

            // Parsear portada (array con 1 elemento)
            const portadaJson = formData.get('portada') as string;
            let portada: string[] = [];
            if (portadaJson) {
                try {
                    portada = JSON.parse(portadaJson);
                } catch (e) {
                    console.error('Error parseando portada:', e);
                }
            }

            // Parsear imágenes del detalle
            const imagenesJson = formData.get('imagenes') as string;
            let imagenes: string[] = [];
            if (imagenesJson) {
                try {
                    imagenes = JSON.parse(imagenesJson);
                } catch (e) {
                    console.error('Error parseando imágenes:', e);
                }
            }

            const nuevaUbicacion = {
                nombre_ubicacion: formData.get('nombre_ubicacion') as string,
                estado_ubicacion: formData.get('estado_ubicacion') as string,
                pais_ubicacion: formData.get('pais_ubicacion') as string,
                activo: formData.get('activo') === 'true',
                portada: portada
            };

            const detalleUbicacion = {
                descripcion_larga: formData.get('descripcion_larga') as string,
                historia: formData.get('historia') as string,
                imagenes: imagenes
            };

            await crearUbicacion(nuevaUbicacion, detalleUbicacion, locals.supabase);

            return { success: true, message: 'Ubicación creada correctamente' };
        } catch (error) {
            console.error('Error creando ubicación:', error);
            return fail(500, { message: 'Error al crear la ubicación' });
        }
    },

    actualizar: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = Number(formData.get('id_ubicacion'));

            // Parsear portada
            const portadaJson = formData.get('portada') as string;
            let portada: string[] = [];
            if (portadaJson) {
                try {
                    portada = JSON.parse(portadaJson);
                } catch (e) {
                    console.error('Error parseando portada:', e);
                }
            }

            // Parsear imágenes del detalle
            const imagenesJson = formData.get('imagenes') as string;
            let imagenes: string[] = [];
            if (imagenesJson) {
                try {
                    imagenes = JSON.parse(imagenesJson);
                } catch (e) {
                    console.error('Error parseando imágenes:', e);
                }
            }

            const datosActualizados = {
                nombre_ubicacion: formData.get('nombre_ubicacion') as string,
                estado_ubicacion: formData.get('estado_ubicacion') as string,
                pais_ubicacion: formData.get('pais_ubicacion') as string,
                activo: formData.get('activo') === 'true',
                portada: portada
            };

            const detalleActualizado = {
                descripcion_larga: formData.get('descripcion_larga') as string,
                historia: formData.get('historia') as string,
                imagenes: imagenes
            };

            await actualizarUbicacionConDetalle(id, datosActualizados, detalleActualizado, locals.supabase);

            return { success: true, message: 'Ubicación actualizada correctamente' };
        } catch (error) {
            console.error('Error actualizando ubicación:', error);
            return fail(500, { message: 'Error al actualizar la ubicación' });
        }
    }
};

import type { Experiencia } from '$lib/services/experienciasService';
import type { Ubicacion } from '$lib/services/ubicacionesService';
import { obtenerExperiencias, actualizarExperiencia, obtenerExperienciaActiva } from '$lib/services/experienciasService';
import { obtenerUbicaciones } from '$lib/services/ubicacionesService';
import { fail } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';
export const prerender = false;

// Load function para cargar datos iniciales
export const load: PageServerLoad = async ({ locals }) => {
    try {
        // Usar el cliente de Supabase del servidor (con acceso a cookies)
        const experiencias: Experiencia[] = await obtenerExperiencias();

        const ubicaciones: Ubicacion[] = await obtenerUbicaciones();

        return {
            experiencias: experiencias || [],
            ubicaciones: ubicaciones || [],
            session: await locals.getSession()
        };
    } catch (error) {
        console.error('Error cargando datos:', error);
        return {
            experiencias: [],
            ubicaciones: [],
            session: null
        };
    }
}

// Actions para manejar las acciones del formulario
export const actions: Actions = {
    // Acción para actualizar una experiencia
    actualizar: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = Number(formData.get('id'));

            const datosActualizados = {
                titulo: formData.get('titulo') as string,
                descripcion: formData.get('descripcion') as string,
                fecha_inicio: formData.get('fecha_inicio') as string,
                fecha_fin: formData.get('fecha_fin') as string,
                capacidad: Number(formData.get('capacidad')),
                activo: formData.get('activo') === 'true',
                id_ubicacion: Number(formData.get('id_ubicacion'))
            };

            // ✅ VALIDACIÓN: Solo puede haber una experiencia activa a la vez
            if (datosActualizados.activo) {
                const experienciaActiva = await obtenerExperienciaActiva();

                // Si hay una experiencia activa y NO es la que estamos editando
                if (experienciaActiva && experienciaActiva.id !== id) {
                    console.log('⚠️ Intento de activar experiencia cuando ya existe otra activa');
                    console.log('   Experiencia activa actual:', experienciaActiva.titulo);

                    return fail(400, {
                        message: `Ya existe una experiencia activa: "${experienciaActiva.titulo}". Desactívala primero para poder activar esta.`,
                        tituloActiva: experienciaActiva.titulo
                    });
                }
            }

            // Parsear el array de imágenes que viene como JSON string
            const imagenesJson = formData.get('imagenes') as string;
            let imagenes: string[] = [];
            if (imagenesJson) {
                try {
                    imagenes = JSON.parse(imagenesJson);
                } catch (error) {
                    console.error('Error parseando imágenes:', error);
                    imagenes = [];
                }
            }

            const detalleActualizado = {
                descripcionLarga: formData.get('descripcionLarga') as string,
                sede: formData.get('sede') as string,
                actividades: formData.get('actividades') as string,
                queincluye: formData.get('queIncluye') as string,
                imagenes: imagenes
            };

            // Usar el cliente de Supabase del servidor con la sesión del usuario
            await actualizarExperiencia(id, datosActualizados, detalleActualizado, locals.supabase);

            return { success: true, message: 'Experiencia actualizada correctamente' };
        } catch (error) {
            console.error('Error actualizando experiencia:', error);
            return fail(500, { error: 'Error al actualizar la experiencia' });
        }
    }
};

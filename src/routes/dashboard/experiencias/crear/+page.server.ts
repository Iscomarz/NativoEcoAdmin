import type { Ubicacion } from '$lib/services/ubicacionesService';
import { obtenerUbicaciones } from '$lib/services/ubicacionesService';
import { crearExperiencia, obtenerExperienciaActiva } from '$lib/services/experienciasService';
import { fail, redirect } from '@sveltejs/kit';
import type { Actions, PageServerLoad } from './$types';

export const prerender = false;

// Load function para cargar ubicaciones
export const load: PageServerLoad = async ({ locals }) => {
    try {
        const ubicaciones: Ubicacion[] = await obtenerUbicaciones();

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
}

// Actions para manejar la creación
export const actions: Actions = {
    crear: async ({ request, locals }) => {
        try {
            const formData = await request.formData();

            const nuevaExperiencia = {
                titulo: formData.get('titulo') as string,
                descripcion: formData.get('descripcion') as string,
                fecha_inicio: formData.get('fecha_inicio') as string,
                fecha_fin: formData.get('fecha_fin') as string,
                capacidad: Number(formData.get('capacidad')),
                activo: formData.get('activo') === 'true',
                id_ubicacion: Number(formData.get('id_ubicacion'))
            };

            // ✅ VALIDACIÓN: Solo puede haber una experiencia activa a la vez
            if (nuevaExperiencia.activo) {
                const experienciaActiva = await obtenerExperienciaActiva();

                if (experienciaActiva) {
                    console.log('⚠️ Intento de crear experiencia activa cuando ya existe otra');
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

            const detalleExperiencia = {
                descripcionLarga: formData.get('descripcionLarga') as string,
                sede: formData.get('sede') as string,
                actividades: formData.get('actividades') as string,
                queincluye: formData.get('queIncluye') as string,
                imagenes: imagenes
            };

            console.log('📋 Datos a crear:', nuevaExperiencia);
            console.log('📋 Detalle a crear:', detalleExperiencia);

            // Crear experiencia
            await crearExperiencia(nuevaExperiencia, detalleExperiencia, locals.supabase);

            return { success: true, message: 'Experiencia creada correctamente' };
        } catch (error) {
            console.error('Error creando experiencia:', error);
            return fail(500, { message: 'Error al crear la experiencia' });
        }
    }
};

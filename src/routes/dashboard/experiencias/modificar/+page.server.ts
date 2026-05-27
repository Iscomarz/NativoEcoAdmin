import type { Experiencia } from '$lib/services/experienciasService';
import type { Ubicacion } from '$lib/services/ubicacionesService';
import { obtenerExperiencias, actualizarExperiencia, obtenerExperienciaActiva } from '$lib/services/experienciasService';
import { obtenerUbicaciones } from '$lib/services/ubicacionesService';
import { crearHabitacion, actualizarHabitacion, eliminarHabitacion } from '$lib/services/habitacionesService';
import type { chabitacion, dhabitacion } from '$lib/services/habitacionesService';
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

            if (isNaN(id) || id <= 0) {
                return fail(400, { message: 'El ID de la experiencia no es válido' });
            }

            const titulo = formData.get('titulo') as string;
            const descripcion = formData.get('descripcion') as string;
            const fecha_inicio = formData.get('fecha_inicio') as string;
            const fecha_fin = formData.get('fecha_fin') as string;
            const capacidad = Number(formData.get('capacidad'));
            const id_ubicacion = Number(formData.get('id_ubicacion'));

            if (!titulo || titulo.trim() === '') {
                return fail(400, { message: 'El título de la experiencia es obligatorio y no puede estar vacío' });
            }
            if (!descripcion || descripcion.trim() === '') {
                return fail(400, { message: 'La descripción corta de la experiencia es obligatoria y no puede estar vacía' });
            }
            if (isNaN(capacidad) || capacidad <= 0) {
                return fail(400, { message: 'La capacidad de la experiencia debe ser mayor a 0' });
            }
            if (isNaN(id_ubicacion) || id_ubicacion <= 0) {
                return fail(400, { message: 'Debes seleccionar una ubicación válida' });
            }
            if (!fecha_inicio || !fecha_fin) {
                return fail(400, { message: 'Las fechas de inicio y fin son obligatorias' });
            }

            const fechaInicioDate = new Date(fecha_inicio);
            const fechaFinDate = new Date(fecha_fin);
            if (fechaInicioDate > fechaFinDate) {
                return fail(400, { message: 'La fecha de fin no puede ser anterior a la fecha de inicio' });
            }

            const portadaExperiencia = formData.get('portada_experiencia') as string | null;
            const datosActualizados: Record<string, any> = {
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                fecha_inicio: fecha_inicio,
                fecha_fin: fecha_fin,
                capacidad: capacidad,
                activo: formData.get('activo') === 'true',
                oculto: formData.get('oculto') === 'true',
                id_ubicacion: id_ubicacion,
                portada_experiencia: portadaExperiencia || null
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
                grupo_whatsapp: formData.get('grupo_whatsapp') as string,
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
    },

    // Acción para manejar habitaciones (crear, actualizar, eliminar)
    manejarHabitaciones: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const action = formData.get('action') as string;

            if (action === 'crear') {
                // Crear nueva habitación
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

                const nombre = formData.get('nombre') as string;
                if (!nombre || nombre.trim() === '') {
                    return fail(400, { message: 'El nombre de la habitación es obligatorio' });
                }

                const precioPersona = Number(formData.get('precioPersona'));
                if (isNaN(precioPersona) || precioPersona <= 0) {
                    return fail(400, { message: 'El precio por persona debe ser mayor a 0' });
                }

                const capacidad = Number(formData.get('capacidad'));
                if (isNaN(capacidad) || capacidad <= 0) {
                    return fail(400, { message: 'La capacidad de la habitación debe ser mayor a 0' });
                }

                const cantidad = Number(formData.get('cantidad_habitacion'));
                if (isNaN(cantidad) || cantidad <= 0 || cantidad > 50) {
                    return fail(400, { message: 'La cantidad de habitaciones debe estar entre 1 y 50' });
                }

                let precioCuarto = Number(formData.get('precioCuarto'));
                if (isNaN(precioCuarto) || precioCuarto <= 0) {
                    precioCuarto = capacidad * precioPersona;
                }

                const nuevaHabitacion: chabitacion = {
                    nombre: nombre,
                    habitacion_descripcion: formData.get('habitacion_descripcion') as string || '',
                    precioPersona: precioPersona,
                    precioCuarto: precioCuarto,
                    imagenes: imagenes,
                    idexperiencia: Number(formData.get('idexperiencia')),
                    cantidad_habitacion: cantidad,
                    capacidad: capacidad
                };

                const detalleHabitacion: dhabitacion = {
                    capacidad: capacidad,
                    id_chabitacion: 0, // Se asignará en el servicio
                    conteo_capacidad: 0,
                    id_estatus: 1
                };

                await crearHabitacion(nuevaHabitacion, detalleHabitacion, locals.supabase);
                return { success: true, message: 'Habitación creada correctamente' };

            } else if (action === 'actualizar') {
                // Actualizar habitación existente
                const id = Number(formData.get('id_habitacion'));
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

                const nombre = formData.get('nombre') as string;
                if (!nombre || nombre.trim() === '') {
                    return fail(400, { message: 'El nombre de la habitación es obligatorio' });
                }

                const precioPersona = Number(formData.get('precioPersona'));
                if (isNaN(precioPersona) || precioPersona <= 0) {
                    return fail(400, { message: 'El precio por persona debe ser mayor a 0' });
                }

                const capacidad = Number(formData.get('capacidad'));
                if (isNaN(capacidad) || capacidad <= 0) {
                    return fail(400, { message: 'La capacidad de la habitación debe ser mayor a 0' });
                }

                const cantidad = Number(formData.get('cantidad_habitacion'));
                if (isNaN(cantidad) || cantidad <= 0 || cantidad > 50) {
                    return fail(400, { message: 'La cantidad de habitaciones debe estar entre 1 y 50' });
                }

                let precioCuarto = Number(formData.get('precioCuarto'));
                if (isNaN(precioCuarto) || precioCuarto <= 0) {
                    precioCuarto = capacidad * precioPersona;
                }

                const habitacionActualizada: Partial<chabitacion> = {
                    nombre: nombre,
                    habitacion_descripcion: formData.get('habitacion_descripcion') as string || '',
                    precioPersona: precioPersona,
                    precioCuarto: precioCuarto,
                    imagenes: imagenes,
                    cantidad_habitacion: cantidad,
                    capacidad: capacidad
                };

                const capacidadVal = capacidad;

                await actualizarHabitacion(id, habitacionActualizada, capacidadVal, locals.supabase);
                return { success: true, message: 'Habitación actualizada correctamente' };

            } else if (action === 'eliminar') {
                // Eliminar habitación
                const id = Number(formData.get('id_habitacion'));
                await eliminarHabitacion(id, locals.supabase);
                return { success: true, message: 'Habitación eliminada correctamente' };
            }

            return fail(400, { error: 'Acción no válida' });
        } catch (error) {
            console.error('Error manejando habitación:', error);
            return fail(500, { error: 'Error al procesar la habitación' });
        }
    },

    eliminar: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const id = Number(formData.get('id'));

            if (!id) return fail(400, { message: 'ID de experiencia no proporcionado' });

            const { eliminarExperiencia } = await import('$lib/services/experienciasService');
            await eliminarExperiencia(id, locals.supabase);

            return { success: true, message: 'Experiencia y recursos asociados eliminados correctamente' };
        } catch (error: any) {
            console.error('Error eliminando experiencia:', error);
            return fail(500, { message: error.message || 'Error al eliminar la experiencia' });
        }
    }
};

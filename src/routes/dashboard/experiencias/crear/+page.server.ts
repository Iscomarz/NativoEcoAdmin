import type { Ubicacion } from '$lib/services/ubicacionesService';
import { obtenerUbicaciones } from '$lib/services/ubicacionesService';
import { crearExperiencia, obtenerExperienciaActiva } from '$lib/services/experienciasService';
import { crearHabitacion } from '$lib/services/habitacionesService';
import type { chabitacion, dhabitacion } from '$lib/services/habitacionesService';
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

            const nuevaExperiencia = {
                titulo: titulo.trim(),
                descripcion: descripcion.trim(),
                fecha_inicio,
                fecha_fin,
                capacidad,
                activo: formData.get('activo') === 'true',
                id_ubicacion,
                portada_experiencia: (formData.get('portada_experiencia') as string) || undefined,
                oculto: formData.get('oculto') === 'true',
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
            const experienciaCreada = await crearExperiencia(nuevaExperiencia, detalleExperiencia, locals.supabase);

            return {
                success: true,
                message: 'Experiencia creada correctamente',
                data: { id: experienciaCreada.id },
                idExperiencia: experienciaCreada.id
            };
        } catch (error) {
            console.error('Error creando experiencia:', error);
            return fail(500, { message: 'Error al crear la experiencia' });
        }
    },

    crearHabitaciones: async ({ request, locals }) => {
        try {
            const formData = await request.formData();
            const habitacionesJson = formData.get('habitaciones') as string;

            if (!habitacionesJson) {
                return fail(400, { message: 'No se recibieron habitaciones' });
            }

            const habitaciones = JSON.parse(habitacionesJson);

            console.log('🏠 Creando', habitaciones.length, 'habitación(es)');

            // Crear cada habitación
            for (const hab of habitaciones) {
                if (!hab.nombre || hab.nombre.trim() === '') {
                    return fail(400, { message: 'El nombre de la habitación es obligatorio' });
                }

                const precioPersona = Number(hab.precioPersona);
                if (isNaN(precioPersona) || precioPersona <= 0) {
                    return fail(400, { message: `El precio por persona de la habitación "${hab.nombre}" debe ser mayor a 0` });
                }

                const capacidadHab = Number(hab.capacidad);
                if (isNaN(capacidadHab) || capacidadHab <= 0) {
                    return fail(400, { message: `La capacidad de la habitación "${hab.nombre}" debe ser mayor a 0` });
                }

                const cantidadHab = Number(hab.cantidad_habitacion);
                if (isNaN(cantidadHab) || cantidadHab <= 0 || cantidadHab > 50) {
                    return fail(400, { message: `La cantidad de habitaciones de tipo "${hab.nombre}" debe estar entre 1 y 50` });
                }

                let precioCuarto = Number(hab.precioCuarto);
                if (isNaN(precioCuarto) || precioCuarto <= 0) {
                    precioCuarto = capacidadHab * precioPersona;
                }

                const nuevaHabitacion: chabitacion = {
                    //id: 0, // Se asignará automáticamente
                    nombre: hab.nombre,
                    habitacion_descripcion: hab.habitacion_descripcion,
                    precioPersona: precioPersona,
                    precioCuarto: precioCuarto,
                    imagenes: hab.imagenes,
                    idexperiencia: hab.idexperiencia,
                    cantidad_habitacion: cantidadHab
                };

                const detalleHabitacion: dhabitacion = {
                    capacidad: capacidadHab,
                    id_chabitacion: 0, // Se asignará en el servicio
                    conteo_capacidad: 0,
                    id_estatus: 1 // Estado inicial (disponible)
                };

                await crearHabitacion(nuevaHabitacion, detalleHabitacion, locals.supabase);
            }

            return {
                success: true,
                message: `${habitaciones.length} habitación(es) creada(s) correctamente`
            };
        } catch (error) {
            console.error('Error creando habitaciones:', error);
            return fail(500, { message: 'Error al crear las habitaciones' });
        }
    }
};

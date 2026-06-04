import { supabase } from "$lib/supabaseClient";

// Tipos
export interface mreserva {
    id?: number;
    usuario_id: string;
    nombre_cliente: string;
    correo_cliente: string;
    experiencia_id: number;
    estatus_id: number;
    fecha_reserva: string;
    total: number;
    metodo_pago_id: number;
    pago_a_plazos: boolean;
    fecha_liquidacion?: string;
    grupo: boolean;
    cantidad_grupo?: number;
    numero_cliente?: number;
    precio_unitario?: number;
    susuario?: { nombre: string; correo: string } | null;
}

const TABLA_RESERVAS = "mreserva";

/**
 * Helper para vincular nombres y correos de usuarios registrados
 */
async function vincularNombresUsuarios(reservas: any[], supabaseClient = supabase) {
    if (!reservas || reservas.length === 0) return reservas;

    // Extraer IDs únicos de usuario
    const idsUsuarios = [...new Set(reservas.map(r => r.usuario_id).filter(Boolean))];
    
    if (idsUsuarios.length === 0) return reservas;

    try {
        // Buscar nombres y correos en la tabla susuario
        const { data: usuarios, error } = await supabaseClient
            .from('susuario')
            .select('idAuth, nombre, correo')
            .in('idAuth', idsUsuarios);

        if (error) {
            console.error('Error al vincular datos de usuarios:', error);
            return reservas;
        }

        // Crear mapa de idAuth -> { nombre, correo }
        const mapaUsuarios = Object.fromEntries(usuarios.map(u => [u.idAuth, { nombre: u.nombre, correo: u.correo }]));

        // Asignar los datos al objeto susuario simulado
        return reservas.map(r => ({
            ...r,
            susuario: r.usuario_id && mapaUsuarios[r.usuario_id] 
                ? mapaUsuarios[r.usuario_id] 
                : null
        }));
    } catch (err) {
        console.error('Error inesperado vinculando usuarios:', err);
        return reservas;
    }
}

/**
 * Obtener reservas por experiencia ID
 */

export async function obtenerReservasByExperiencia(idExperiencia: number, supabaseClient = supabase): Promise<mreserva[]> {
    try {
        const { data, error } = await supabaseClient
            .from(TABLA_RESERVAS)
            .select("*")
            .eq("experiencia_id", idExperiencia)
            .order("fecha_reserva", { ascending: true });

        if (error) throw error;
        
        // Vincular nombres manualmente
        return await vincularNombresUsuarios(data || [], supabaseClient);
    } catch (error) {
        console.error("Error obteniendo reservas:", error);
        throw error;
    }
}

/**
 * Obtener todas las reservas de la base de datos
 */
export async function obtenerTodasLasReservas(supabaseClient = supabase): Promise<mreserva[]> {
    try {
        const { data, error } = await supabaseClient
            .from(TABLA_RESERVAS)
            .select("*")
            .order("fecha_reserva", { ascending: false });

        if (error) throw error;

        // Vincular nombres manualmente
        return await vincularNombresUsuarios(data || [], supabaseClient);
    } catch (error) {
        console.error("Error obteniendo todas las reservas:", error);
        throw error;
    }
}

/**
 * Obtener todas las reservas de la base de datos junto con el título de su experiencia
 */
export async function obtenerReservasConExperiencia(supabaseClient = supabase): Promise<any[]> {
    try {
        const { data, error } = await supabaseClient
            .from(TABLA_RESERVAS)
            .select("*, cexperiencia(titulo)")
            .order("fecha_reserva", { ascending: false });

        if (error) throw error;

        // Vincular nombres manualmente
        return await vincularNombresUsuarios(data || [], supabaseClient);
    } catch (error) {
        console.error("Error obteniendo reservas con experiencia:", error);
        throw error;
    }
}


/**
 * Interface para métricas de reservas
 */
export interface MetricasReservas {
    totalReservas: number;
    totalRevenue: number;
    reservasConfirmadas: number;
    reservasPendientes: number;
    reservasCanceladas: number;
    reservasGrupo: number;
    reservasIndividuales: number;
    totalPersonas: number;
    pagosLiquidados: number;
    pagosPendientes: number;
    clientesUnicos: number;
}

/**
 * Calcular métricas de reservas para una experiencia
 */
export function calcularMetricasReservas(reservas: mreserva[]): MetricasReservas {
    const totalReservas = reservas.length;
    const totalRevenue = reservas.reduce((sum, r) => sum + r.total, 0);

    // Contar por estatus (asumiendo: 1=confirmada, 2=pendiente, 3=cancelada)
    const reservasConfirmadas = reservas.filter(r => r.estatus_id === 1).length;
    const reservasPendientes = reservas.filter(r => r.estatus_id === 2).length;
    const reservasCanceladas = reservas.filter(r => r.estatus_id === 3).length;

    // Contar grupos vs individuales
    const reservasGrupo = reservas.filter(r => r.grupo).length;
    const reservasIndividuales = totalReservas - reservasGrupo;

    // Total de personas
    const totalPersonas = reservas.reduce((sum, r) => {
        if (r.grupo && r.cantidad_grupo) {
            return sum + r.cantidad_grupo;
        }
        return sum + (r.numero_cliente || 1);
    }, 0);

    // Pagos liquidados vs pendientes
    const pagosLiquidados = reservas.filter(r => !r.pago_a_plazos || r.fecha_liquidacion).length;
    const pagosPendientes = reservas.filter(r => r.pago_a_plazos && !r.fecha_liquidacion).length;

    // Clientes únicos (por correo)
    const clientesUnicos = new Set(reservas.map(r => r.correo_cliente)).size;

    return {
        totalReservas,
        totalRevenue,
        reservasConfirmadas,
        reservasPendientes,
        reservasCanceladas,
        reservasGrupo,
        reservasIndividuales,
        totalPersonas,
        pagosLiquidados,
        pagosPendientes,
        clientesUnicos
    };
}

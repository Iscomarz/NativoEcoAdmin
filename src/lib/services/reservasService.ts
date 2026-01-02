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
}

const TABLA_RESERVAS = "mreserva";

/**
 * Obtener reservas por experiencia ID
 */

export async function obtenerReservasByExperiencia(idExperiencia: number): Promise<mreserva[]> {
    try {
        const { data, error } = await supabase
            .from(TABLA_RESERVAS)
            .select("*")
            .eq("experiencia_id", idExperiencia)
            .order("fecha_reserva", { ascending: true });

        if (error) throw error;
        return data || [];
    } catch (error) {
        console.error("Error obteniendo reservas:", error);
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
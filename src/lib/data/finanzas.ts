import "server-only";
import type { CuentaPorPagar, MovimientoFinanciero } from "@/lib/finanzas";
import { montoConSigno, META_MENSUAL_MXN } from "@/lib/finanzas";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { CXP_MUESTRA, MOVIMIENTOS_MUESTRA } from "./finanzas-muestra";
import { listarPedidos } from "./pedidos";
import { burnMensual } from "./gastos";
import { listarCotizaciones } from "./cotizaciones";

/*
  Capa de datos de Finanzas. SOLO-ADMIN: la RLS de movimiento_financiero lo
  garantiza en la base; aquí además devolvemos vacío si el usuario no es admin.
*/

export async function listarMovimientos(): Promise<MovimientoFinanciero[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    return MOVIMIENTOS_MUESTRA.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("movimiento_financiero")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(200);
  if (error) throw error;
  return (data ?? []) as MovimientoFinanciero[];
}

export type ResumenFinanciero = {
  ingresosMes: number;
  egresosMes: number;
  netoMes: number;
  capitalAtrapado: number;
};

/** P&L del mes en curso + capital de trabajo atrapado (§3.9). Solo-admin. */
export async function resumenFinanciero(): Promise<ResumenFinanciero> {
  const [movimientos, pedidos] = await Promise.all([
    listarMovimientos(),
    listarPedidos(),
  ]);
  const mes = new Date().toISOString().slice(0, 7); // YYYY-MM
  const delMes = movimientos.filter((m) => m.fecha.startsWith(mes));
  const ingresosMes = delMes
    .filter((m) => montoConSigno(m) > 0)
    .reduce((s, m) => s + m.monto, 0);
  const egresosMes = delMes
    .filter((m) => montoConSigno(m) < 0)
    .reduce((s, m) => s + m.monto, 0);

  // Capital atrapado: por pedido activo, costo real ya incurrido − pagos recibidos.
  const activos = pedidos.filter(
    (p) => p.estado !== "entregado" && p.estado !== "cancelado",
  );
  const capitalAtrapado = activos.reduce((s, p) => {
    const costo = p.costo_real ?? 0;
    const pagado = p.pagado ?? 0;
    const atrapado = costo - pagado;
    return s + (atrapado > 0 ? atrapado : 0);
  }, 0);

  return {
    ingresosMes,
    egresosMes,
    netoMes: ingresosMes - egresosMes,
    capitalAtrapado,
  };
}

export type MetricasMes = {
  ingresoBridal: number;
  ingresoConcierge: number;
  ingresoTotal: number;
  pctConcierge: number; // % de ingresos del mes que es Concierge
  avanceMeta: number; // % de la meta mensual alcanzado
  ticketPromedio: number; // total promedio por pedido activo/entregado
};

/** Métricas del mes: ingresos por línea, % Concierge, avance de meta, ticket. Solo-admin. */
export async function metricasMes(): Promise<MetricasMes> {
  const [movimientos, pedidos] = await Promise.all([
    listarMovimientos(),
    listarPedidos(),
  ]);
  const mes = new Date().toISOString().slice(0, 7);
  const ingresosMes = movimientos.filter(
    (m) => m.categoria === "ingreso" && m.fecha.startsWith(mes),
  );
  const ingresoBridal = ingresosMes
    .filter((m) => m.linea_negocio === "bridal")
    .reduce((s, m) => s + m.monto, 0);
  const ingresoConcierge = ingresosMes
    .filter((m) => m.linea_negocio === "concierge")
    .reduce((s, m) => s + m.monto, 0);
  const ingresoTotal = ingresosMes.reduce((s, m) => s + m.monto, 0);

  const vivos = pedidos.filter((p) => p.estado !== "cancelado");
  const ticketPromedio =
    vivos.length > 0 ? vivos.reduce((s, p) => s + p.total, 0) / vivos.length : 0;

  return {
    ingresoBridal,
    ingresoConcierge,
    ingresoTotal,
    pctConcierge: ingresoTotal > 0 ? Math.round((ingresoConcierge / ingresoTotal) * 100) : 0,
    avanceMeta: Math.round((ingresoTotal / META_MENSUAL_MXN) * 100),
    ticketPromedio,
  };
}

/** Cuentas por pagar (consignantes y futuros proveedores). Solo-admin. */
export async function listarCxP(): Promise<CuentaPorPagar[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    return CXP_MUESTRA.slice().sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "pendiente" ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cuenta_por_pagar")
    .select("*, consignante(nombre)")
    .order("estado")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    consignante_nombre: Array.isArray(r.consignante)
      ? (r.consignante[0]?.nombre ?? null)
      : (r.consignante?.nombre ?? null),
  })) as CuentaPorPagar[];
}

export type ReporteSocio = {
  mes: string; // 'YYYY-MM'
  ingresoMes: number;
  netoMes: number;
  ingresoBridal: number;
  ingresoConcierge: number;
  pctConcierge: number;
  avanceMeta: number;
  ticketPromedio: number;
  pipelineValor: number;
  pipelineCount: number;
  serie: { mes: string; ingreso: number }[]; // últimos 6 meses, ascendente
};

/** Agregado mensual para el reporte al socio capitalista (§3.9). Solo-admin. */
export async function reporteSocio(): Promise<ReporteSocio> {
  const [movimientos, metricas, resumen, cotizaciones] = await Promise.all([
    listarMovimientos(),
    metricasMes(),
    resumenFinanciero(),
    listarCotizaciones(),
  ]);

  const hoy = new Date();
  const mesKey = (d: Date) => d.toISOString().slice(0, 7);
  const serie: { mes: string; ingreso: number }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(hoy.getFullYear(), hoy.getMonth() - i, 1);
    const k = mesKey(d);
    const ingreso = movimientos
      .filter((m) => m.categoria === "ingreso" && m.fecha.startsWith(k))
      .reduce((s, m) => s + m.monto, 0);
    serie.push({ mes: k, ingreso });
  }

  const vivas = cotizaciones.filter((c) =>
    ["borrador", "enviada", "seguimiento"].includes(c.estado),
  );

  return {
    mes: mesKey(hoy),
    ingresoMes: resumen.ingresosMes,
    netoMes: resumen.netoMes,
    ingresoBridal: metricas.ingresoBridal,
    ingresoConcierge: metricas.ingresoConcierge,
    pctConcierge: metricas.pctConcierge,
    avanceMeta: metricas.avanceMeta,
    ticketPromedio: metricas.ticketPromedio,
    pipelineValor: vivas.reduce((s, c) => s + c.total, 0),
    pipelineCount: vivas.length,
    serie,
  };
}

export type ProyeccionFlujo = {
  cobros: [number, number, number]; // acumulado a 30/60/90 días
  pagos: [number, number, number]; // CxP acumuladas a 30/60/90
  burnMensual: number;
  neto: [number, number, number]; // cobros − pagos − burn·(1,2,3)
  saldoSinFecha: number; // por cobrar de pedidos sin fecha compromiso
};

function diasDesdeHoy(fecha: string): number {
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const f = new Date(fecha + "T00:00:00");
  return Math.round((f.getTime() - hoy.getTime()) / 86400000);
}

/** Índice de bucket acumulado (0=≤30, 1=≤60, 2=≤90). Vencido cuenta en ≤30. */
function bucket(dias: number): number | null {
  if (dias <= 30) return 0;
  if (dias <= 60) return 1;
  if (dias <= 90) return 2;
  return null; // más allá de 90: fuera del horizonte
}

/**
 * Proyección de flujo a 30/60/90 días (§3.9): entradas por cobrar (saldos de
 * pedidos activos por fecha compromiso) menos CxP por vencer y burn fijo. Es
 * flujo NETO proyectado (no incluye saldo de caja actual). Solo-admin.
 */
export async function proyeccionFlujo(): Promise<ProyeccionFlujo> {
  const [pedidos, cxp, burn] = await Promise.all([
    listarPedidos(),
    listarCxP(),
    burnMensual(),
  ]);

  const cobros: [number, number, number] = [0, 0, 0];
  let saldoSinFecha = 0;
  for (const p of pedidos) {
    if (p.estado === "entregado" || p.estado === "cancelado") continue;
    const saldo = p.saldo ?? 0;
    if (saldo <= 0) continue;
    if (!p.fecha_compromiso) {
      saldoSinFecha += saldo;
      continue;
    }
    const b = bucket(diasDesdeHoy(p.fecha_compromiso));
    if (b === null) continue;
    for (let i = b; i < 3; i++) cobros[i] += saldo; // acumulado
  }

  const pagos: [number, number, number] = [0, 0, 0];
  for (const c of cxp) {
    if (c.estado !== "pendiente") continue;
    // Sin vencimiento se asume inmediato (≤30).
    const dias = c.fecha_vencimiento ? diasDesdeHoy(c.fecha_vencimiento) : 0;
    const b = bucket(dias);
    if (b === null) continue;
    for (let i = b; i < 3; i++) pagos[i] += c.monto;
  }

  const neto: [number, number, number] = [
    cobros[0] - pagos[0] - burn * 1,
    cobros[1] - pagos[1] - burn * 2,
    cobros[2] - pagos[2] - burn * 3,
  ];

  return { cobros, pagos, burnMensual: burn, neto, saldoSinFecha };
}

import "server-only";
import type { MovimientoFinanciero } from "@/lib/finanzas";
import { montoConSigno } from "@/lib/finanzas";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { MOVIMIENTOS_MUESTRA } from "./finanzas-muestra";
import { listarPedidos } from "./pedidos";

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

import "server-only";
import type { Comision } from "@/lib/comisiones";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { COMISIONES_MUESTRA } from "./comisiones-muestra";

/* Capa de datos de Comisiones. Solo-admin (RLS + puerta en la UI). */

export async function listarComisiones(): Promise<Comision[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    return COMISIONES_MUESTRA.slice().sort((a, b) => {
      if (a.estado !== b.estado) return a.estado === "devengada" ? -1 : 1;
      return b.created_at.localeCompare(a.created_at);
    });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("comision")
    .select("*, pedido(cliente(nombre))")
    .order("estado")
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => {
    const pedido = Array.isArray(r.pedido) ? r.pedido[0] : r.pedido;
    const cliente = pedido
      ? Array.isArray(pedido.cliente)
        ? pedido.cliente[0]
        : pedido.cliente
      : null;
    return { ...r, pedido_cliente: cliente?.nombre ?? null };
  }) as Comision[];
}

/** Total devengado (por pagar) de comisiones. Solo-admin. */
export async function comisionesPorPagar(): Promise<number> {
  const comisiones = await listarComisiones();
  return comisiones
    .filter((c) => c.estado === "devengada")
    .reduce((s, c) => s + c.monto, 0);
}

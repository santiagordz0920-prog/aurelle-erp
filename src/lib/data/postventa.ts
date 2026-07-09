import "server-only";
import type { PiezaEntregada } from "@/lib/postventa";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { PIEZAS_MUESTRA, SERVICIOS_MUESTRA } from "./postventa-muestra";
import { PEDIDOS_MUESTRA } from "./pedidos-muestra";

/* Capa de datos de Postventa (§3.7). RLS por sucursal. */

/** Pieza entregada de un pedido (con su historial de servicios). null si no entregado. */
export async function getPiezaDePedido(pedidoId: string): Promise<PiezaEntregada | null> {
  if (!supabaseConfigurado()) {
    const p = PIEZAS_MUESTRA.find((x) => x.pedido_id === pedidoId);
    if (!p) return null;
    return { ...p, servicios: SERVICIOS_MUESTRA.filter((s) => s.pieza_id === p.id) };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("pieza_entregada")
    .select("*, cliente:cliente_id(nombre), servicio_pieza(*)")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const cli = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
  return {
    ...r,
    cliente_nombre: cli?.nombre ?? null,
    servicios: (r.servicio_pieza ?? []).sort((a: { fecha: string }, b: { fecha: string }) =>
      b.fecha.localeCompare(a.fecha),
    ),
  } as PiezaEntregada;
}

export type ResumenPostventa = {
  piezas: PiezaEntregada[];
  totalEntregadas: number;
  clientesRecompra: number; // clientes con ≥2 pedidos
  totalClientesEntregados: number;
  tasaRecompra: number; // clientesRecompra / totalClientesEntregados
};

/** Todas las piezas entregadas + métrica de recompra. */
export async function resumenPostventa(): Promise<ResumenPostventa> {
  if (!supabaseConfigurado()) {
    const piezas = PIEZAS_MUESTRA.map((p) => ({
      ...p,
      servicios: SERVICIOS_MUESTRA.filter((s) => s.pieza_id === p.id),
    }));
    return recompra(piezas, contarPedidosPorClienteMuestra());
  }
  const supabase = await createClient();
  const [{ data: piezasData }, { data: pedidosData }] = await Promise.all([
    supabase
      .from("pieza_entregada")
      .select("*, cliente:cliente_id(nombre)")
      .order("garantia_hasta", { ascending: true }),
    supabase.from("pedido").select("cliente_id, estado"),
  ]);
  const piezas: PiezaEntregada[] = (piezasData ?? []).map((r) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rel = r as any;
    const cli = Array.isArray(rel.cliente) ? rel.cliente[0] : rel.cliente;
    return { ...rel, cliente_nombre: cli?.nombre ?? null } as PiezaEntregada;
  });
  const porCliente = new Map<string, number>();
  for (const p of pedidosData ?? []) {
    if (!p.cliente_id || p.estado === "cancelado") continue;
    porCliente.set(p.cliente_id, (porCliente.get(p.cliente_id) ?? 0) + 1);
  }
  return recompra(piezas, porCliente);
}

function recompra(piezas: PiezaEntregada[], pedidosPorCliente: Map<string, number>): ResumenPostventa {
  const clientesEntregados = new Set(piezas.map((p) => p.cliente_id).filter(Boolean) as string[]);
  let clientesRecompra = 0;
  for (const c of clientesEntregados) if ((pedidosPorCliente.get(c) ?? 0) >= 2) clientesRecompra += 1;
  const totalClientesEntregados = clientesEntregados.size;
  return {
    piezas,
    totalEntregadas: piezas.length,
    clientesRecompra,
    totalClientesEntregados,
    tasaRecompra: totalClientesEntregados > 0 ? clientesRecompra / totalClientesEntregados : 0,
  };
}

function contarPedidosPorClienteMuestra(): Map<string, number> {
  const m = new Map<string, number>();
  for (const p of PEDIDOS_MUESTRA) {
    if (!p.cliente_id || p.estado === "cancelado") continue;
    m.set(p.cliente_id, (m.get(p.cliente_id) ?? 0) + 1);
  }
  return m;
}

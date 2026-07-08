import "server-only";
import type { OrdenProduccion, QcChecklistItem } from "@/lib/produccion";
import { diasEnEtapa, QC_CHECKLIST, lineaODefault } from "@/lib/produccion";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { ORDENES_MUESTRA, COSTOS_PROD_MUESTRA, CHECKLIST_QC_MUESTRA } from "./produccion-muestra";

/* Capa de datos de Producción. RLS por sucursal. */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizar(r: any): OrdenProduccion {
  const pedido = Array.isArray(r.pedido) ? r.pedido[0] : r.pedido;
  const cliente = pedido
    ? Array.isArray(pedido.cliente)
      ? pedido.cliente[0]
      : pedido.cliente
    : null;
  const resp = Array.isArray(r.usuario) ? r.usuario[0] : r.usuario;
  const costos = r.costo_produccion ?? [];
  return {
    ...r,
    pedido_cliente: cliente?.nombre ?? null,
    linea_negocio: pedido?.linea_negocio ?? null,
    responsable_nombre: resp?.nombre ?? null,
    costos,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    costo_total: costos.reduce((s: number, c: any) => s + Number(c.monto), 0),
    dias_en_etapa: diasEnEtapa(r.updated_at),
  } as OrdenProduccion;
}

export async function listarOrdenes(): Promise<OrdenProduccion[]> {
  if (!supabaseConfigurado()) {
    return ORDENES_MUESTRA.map((o) => {
      const costos = COSTOS_PROD_MUESTRA.filter((c) => c.orden_id === o.id);
      return {
        ...o,
        costos,
        costo_total: costos.reduce((s, c) => s + c.monto, 0),
        dias_en_etapa: diasEnEtapa(o.updated_at),
      };
    });
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("orden_produccion")
    .select(
      "*, pedido(linea_negocio, cliente(nombre)), usuario:responsable_id(nombre), costo_produccion(*)",
    )
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []).map(normalizar);
}

export async function getOrden(id: string): Promise<OrdenProduccion | null> {
  if (!supabaseConfigurado()) {
    const o = ORDENES_MUESTRA.find((x) => x.id === id);
    if (!o) return null;
    const costos = COSTOS_PROD_MUESTRA.filter((c) => c.orden_id === o.id);
    return { ...o, costos, costo_total: costos.reduce((s, c) => s + c.monto, 0) };
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("orden_produccion")
    .select(
      "*, pedido(linea_negocio, cliente(nombre)), usuario:responsable_id(nombre), costo_produccion(*)",
    )
    .eq("id", id)
    .maybeSingle();
  return data ? normalizar(data) : null;
}

/* ── Checklist de QC (editable, 0023). En modo muestra usa el array mutable
   `CHECKLIST_QC_MUESTRA` (sembrado del default `QC_CHECKLIST`). ────────────── */

/** Todos los ítems del checklist (para administrarlos), ordenados por línea/posición. */
export async function listarChecklistQC(): Promise<QcChecklistItem[]> {
  if (!supabaseConfigurado()) {
    return [...CHECKLIST_QC_MUESTRA].sort(
      (a, b) =>
        a.linea_negocio.localeCompare(b.linea_negocio) || a.posicion - b.posicion,
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("qc_checklist_item")
    .select("*")
    .order("linea_negocio", { ascending: true })
    .order("posicion", { ascending: true });
  if (error) throw error;
  return (data ?? []) as QcChecklistItem[];
}

/**
 * Puntos ACTIVOS del checklist de una línea, como textos (para el QC de la
 * orden). Si la tabla no tiene puntos capturados para esa línea, cae al default
 * en código (`QC_CHECKLIST`) para no dejar el QC sin guía.
 */
export async function checklistDeLinea(linea?: string | null): Promise<string[]> {
  const l = lineaODefault(linea);
  if (!supabaseConfigurado()) {
    const items = CHECKLIST_QC_MUESTRA.filter((i) => i.linea_negocio === l && i.activo)
      .sort((a, b) => a.posicion - b.posicion)
      .map((i) => i.texto);
    return items.length > 0 ? items : QC_CHECKLIST[l];
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("qc_checklist_item")
    .select("texto")
    .eq("linea_negocio", l)
    .eq("activo", true)
    .order("posicion", { ascending: true });
  const items = (data ?? []).map((r) => r.texto as string);
  return items.length > 0 ? items : QC_CHECKLIST[l];
}

/** ¿El pedido ya tiene orden? (para el botón "crear orden" en el pedido). */
export async function ordenDePedido(pedidoId: string): Promise<OrdenProduccion | null> {
  if (!supabaseConfigurado()) {
    return ORDENES_MUESTRA.find((o) => o.pedido_id === pedidoId) ?? null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("orden_produccion")
    .select("*, pedido(linea_negocio, cliente(nombre)), usuario:responsable_id(nombre), costo_produccion(*)")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  return data ? normalizar(data) : null;
}

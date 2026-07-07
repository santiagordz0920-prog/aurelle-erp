import "server-only";
import type { OrdenProduccion } from "@/lib/produccion";
import { diasEnEtapa } from "@/lib/produccion";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { ORDENES_MUESTRA, COSTOS_PROD_MUESTRA } from "./produccion-muestra";

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

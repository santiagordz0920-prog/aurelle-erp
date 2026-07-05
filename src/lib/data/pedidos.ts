import "server-only";
import type { Pedido } from "@/lib/pedidos";
import type { ItemInventario } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { PEDIDOS_MUESTRA, pagadoDe } from "./pedidos-muestra";
import { ITEMS_MUESTRA } from "./inventario-muestra";

/*
  Capa de datos de Pedidos. Deriva `pagado`/`saldo` a partir de los pagos.
  El costo/margen real (pedido_costo) es solo-admin: la RLS lo oculta al resto
  (la relación viene vacía) y en local se limpia si el usuario no es admin.
*/

function derivar(p: Pedido): Pedido {
  const pagado = pagadoDe(p);
  return { ...p, pagado, saldo: p.total - pagado };
}

export async function listarPedidos(estado?: string): Promise<Pedido[]> {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";

  if (!supabaseConfigurado()) {
    return PEDIDOS_MUESTRA.filter((p) => !estado || p.estado === estado)
      .map((p) => derivar({ ...p, costo_real: esAdmin ? p.costo_real : undefined }))
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }

  const supabase = await createClient();
  let query = supabase
    .from("pedido")
    .select("*, cliente(nombre), pago(*), pedido_costo(costo_real, margen_sellado)")
    .order("created_at", { ascending: false });
  if (estado) query = query.eq("estado", estado);
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => normalizar(r, esAdmin));
}

export async function getPedido(id: string): Promise<Pedido | null> {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";

  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === id);
    if (!p) return null;
    return derivar({ ...p, costo_real: esAdmin ? p.costo_real : undefined });
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("pedido")
    .select("*, cliente(nombre), pago(*), pedido_costo(costo_real, margen_sellado)")
    .eq("id", id)
    .maybeSingle();
  return data ? normalizar(data, esAdmin) : null;
}

/** Items de inventario reservados/consumidos para este pedido. */
export async function itemsReservados(pedidoId: string): Promise<ItemInventario[]> {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";

  if (!supabaseConfigurado()) {
    return ITEMS_MUESTRA.filter((i) => i.pedido_id === pedidoId).map((i) => ({
      ...i,
      costo: esAdmin ? i.costo : undefined,
    }));
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("item_inventario")
    .select("*, consignante(nombre), item_costo(costo)")
    .eq("pedido_id", pedidoId)
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => {
    const costoRel = Array.isArray(r.item_costo) ? r.item_costo[0] : r.item_costo;
    const consig = Array.isArray(r.consignante) ? r.consignante[0] : r.consignante;
    return {
      ...r,
      consignante_nombre: consig?.nombre ?? null,
      costo: esAdmin ? (costoRel?.costo ?? null) : undefined,
    } as ItemInventario;
  });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizar(r: any, esAdmin: boolean): Pedido {
  const costoRel = Array.isArray(r.pedido_costo)
    ? r.pedido_costo[0]
    : r.pedido_costo;
  const cliente = Array.isArray(r.cliente) ? r.cliente[0] : r.cliente;
  const pagos = (r.pago ?? []).slice().sort(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (a: any, b: any) => a.created_at.localeCompare(b.created_at),
  );
  const pagado = pagos.reduce(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (s: number, x: any) => s + Number(x.monto),
    0,
  );
  return {
    ...r,
    cliente_nombre: cliente?.nombre ?? null,
    pagos,
    pagado,
    saldo: Number(r.total) - pagado,
    costo_real: esAdmin ? (costoRel?.costo_real ?? null) : undefined,
    margen_sellado: esAdmin ? (costoRel?.margen_sellado ?? null) : undefined,
  } as Pedido;
}

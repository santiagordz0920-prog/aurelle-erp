import "server-only";
import type { ItemInventario } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { ITEMS_MUESTRA } from "./inventario-muestra";

/*
  Capa de datos de Inventario. El costo solo llega si el usuario es admin: la
  RLS de item_costo lo oculta al resto (aquí la relación viene null). En local,
  los costos de muestra se limpian si el usuario no es admin.
*/

type FiltroItems = { q?: string; tipo?: string; estado?: string };

function coincide(i: ItemInventario, f: FiltroItems): boolean {
  if (f.tipo && i.tipo !== f.tipo) return false;
  if (f.estado && i.estado !== f.estado) return false;
  if (f.q) {
    const t = f.q.toLowerCase();
    if (
      !i.sku.toLowerCase().includes(t) &&
      !i.nombre.toLowerCase().includes(t) &&
      !(i.ubicacion ?? "").toLowerCase().includes(t)
    )
      return false;
  }
  return true;
}

export async function listarItems(
  filtro: FiltroItems = {},
): Promise<ItemInventario[]> {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";

  if (!supabaseConfigurado()) {
    return ITEMS_MUESTRA.filter((i) => coincide(i, filtro)).map((i) => ({
      ...i,
      costo: esAdmin ? i.costo : undefined,
    }));
  }

  const supabase = await createClient();
  let query = supabase
    .from("item_inventario")
    .select(
      "*, consignante(nombre), item_costo(costo)",
    )
    .order("created_at", { ascending: false });
  if (filtro.tipo) query = query.eq("tipo", filtro.tipo);
  if (filtro.estado) query = query.eq("estado", filtro.estado);
  if (filtro.q)
    query = query.or(
      `sku.ilike.%${filtro.q}%,nombre.ilike.%${filtro.q}%,ubicacion.ilike.%${filtro.q}%`,
    );
  const { data, error } = await query;
  if (error) throw error;
  return (data ?? []).map((r) => normalizar(r, esAdmin));
}

export async function getItem(id: string): Promise<ItemInventario | null> {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";
  if (!supabaseConfigurado()) {
    const i = ITEMS_MUESTRA.find((x) => x.id === id);
    return i ? { ...i, costo: esAdmin ? i.costo : undefined } : null;
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("item_inventario")
    .select("*, consignante(nombre), item_costo(costo)")
    .eq("id", id)
    .maybeSingle();
  return data ? normalizar(data, esAdmin) : null;
}

/** Valor total del inventario propio a costo (solo admin). */
export async function valorInventario(): Promise<number | null> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return null;
  const items = await listarItems();
  return items
    .filter((i) => i.propiedad === "propio" && i.estado !== "vendido")
    .reduce((s, i) => s + (i.costo ?? 0), 0);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizar(r: any, esAdmin: boolean): ItemInventario {
  const costoRel = Array.isArray(r.item_costo) ? r.item_costo[0] : r.item_costo;
  const consig = Array.isArray(r.consignante) ? r.consignante[0] : r.consignante;
  return {
    ...r,
    consignante_nombre: consig?.nombre ?? null,
    costo: esAdmin ? (costoRel?.costo ?? null) : undefined,
  } as ItemInventario;
}

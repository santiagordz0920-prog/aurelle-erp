import "server-only";
import type { TipoItem } from "@/lib/inventario";
import { TIPO_ITEM } from "@/lib/inventario";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { ITEMS_MUESTRA } from "./inventario-muestra";

/*
  Umbrales de stock (0028): mínimo de piezas DISPONIBLES por categoría (tipo).
  El cron nocturno crea una tarea sugerida cuando los disponibles caen por debajo.
  Config solo-admin (RLS); aquí se lee el mínimo + el conteo actual de disponibles
  para que el admin fije números con contexto.
*/

export type UmbralStock = { tipo: TipoItem; minimo: number; disponibles: number };

const TIPOS = Object.keys(TIPO_ITEM) as TipoItem[];

/** Store en memoria para modo muestra (local, sin Supabase). */
export const UMBRALES_MUESTRA: Partial<Record<TipoItem, number>> = {};

export async function listarUmbrales(): Promise<UmbralStock[]> {
  if (!supabaseConfigurado()) {
    return TIPOS.map((tipo) => ({
      tipo,
      minimo: UMBRALES_MUESTRA[tipo] ?? 0,
      disponibles: ITEMS_MUESTRA.filter((i) => i.tipo === tipo && i.estado === "disponible").length,
    }));
  }
  const supabase = await createClient();
  const [umbralesRes, itemsRes] = await Promise.all([
    supabase.from("umbral_stock").select("tipo, minimo"),
    supabase.from("item_inventario").select("tipo").eq("estado", "disponible"),
  ]);
  const minimo = new Map<string, number>();
  for (const u of umbralesRes.data ?? []) minimo.set(u.tipo, u.minimo);
  const disp = new Map<string, number>();
  for (const it of itemsRes.data ?? []) disp.set(it.tipo, (disp.get(it.tipo) ?? 0) + 1);
  return TIPOS.map((tipo) => ({
    tipo,
    minimo: minimo.get(tipo) ?? 0,
    disponibles: disp.get(tipo) ?? 0,
  }));
}

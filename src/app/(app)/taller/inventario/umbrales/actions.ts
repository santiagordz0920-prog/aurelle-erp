"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { TipoItem } from "@/lib/inventario";
import { TIPO_ITEM } from "@/lib/inventario";
import { UMBRALES_MUESTRA } from "@/lib/data/umbrales";

export type ResultadoAccion = { ok: boolean; error?: string };

/**
 * Fija el mínimo de stock de una categoría (0 = sin alerta). Solo-admin (la RLS
 * de `umbral_stock` también lo impone). El cron nocturno usa este mínimo.
 */
export async function guardarUmbral(tipo: TipoItem, minimo: number): Promise<ResultadoAccion> {
  if (!(tipo in TIPO_ITEM)) return { ok: false, error: "Categoría inválida." };
  if (!Number.isInteger(minimo) || minimo < 0) return { ok: false, error: "El mínimo debe ser un entero ≥ 0." };

  if (!supabaseConfigurado()) {
    UMBRALES_MUESTRA[tipo] = minimo;
    revalidatePath("/taller/inventario/umbrales");
    return { ok: true };
  }

  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo un admin puede fijar umbrales." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("umbral_stock")
    .upsert({ tipo, minimo, sucursal_id: usuario.sucursalId }, { onConflict: "tipo,sucursal_id" });
  if (error) return { ok: false, error: "No se pudo guardar el umbral." };
  revalidatePath("/taller/inventario/umbrales");
  return { ok: true };
}

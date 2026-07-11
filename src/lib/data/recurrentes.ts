import "server-only";
import type { TareaRecurrente } from "@/lib/recurrentes";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { RECURRENTES_MUESTRA } from "./recurrentes-muestra";

/* Capa de datos de tareas recurrentes (§3.15, 0032). RLS por sucursal. */

export async function listarRecurrentes(): Promise<TareaRecurrente[]> {
  if (!supabaseConfigurado()) {
    return RECURRENTES_MUESTRA.slice();
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("tarea_recurrente")
    .select("*, usuario:responsable_id(nombre)")
    .order("created_at", { ascending: false });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    responsable_nombre: Array.isArray(r.usuario)
      ? (r.usuario[0]?.nombre ?? null)
      : (r.usuario?.nombre ?? null),
  })) as TareaRecurrente[];
}

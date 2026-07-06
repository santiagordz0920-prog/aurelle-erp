import "server-only";
import type { GastoRecurrente } from "@/lib/gastos";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { GASTOS_MUESTRA } from "./gastos-muestra";

/* Capa de datos de Gastos recurrentes. Solo-admin (RLS + puerta en la UI). */

export async function listarGastosRecurrentes(): Promise<GastoRecurrente[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    return GASTOS_MUESTRA.slice().sort((a, b) => b.monto - a.monto);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("gasto_recurrente")
    .select("*")
    .order("monto", { ascending: false });
  if (error) throw error;
  return (data ?? []) as GastoRecurrente[];
}

/** Burn fijo mensual: suma de los gastos recurrentes activos. */
export async function burnMensual(): Promise<number> {
  const gastos = await listarGastosRecurrentes();
  return gastos.filter((g) => g.activo).reduce((s, g) => s + g.monto, 0);
}

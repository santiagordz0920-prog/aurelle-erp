import "server-only";
import type { Compra } from "@/lib/compras";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { COMPRAS_MUESTRA } from "./compras-muestra";

/* Capa de datos de Compras. Solo-admin (RLS + puerta en la UI). */

export async function listarCompras(): Promise<Compra[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    return COMPRAS_MUESTRA.slice().sort((a, b) => b.fecha.localeCompare(a.fecha));
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("compra")
    .select("*, proveedor(nombre)")
    .order("fecha", { ascending: false })
    .limit(200);
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    proveedor_nombre: Array.isArray(r.proveedor)
      ? (r.proveedor[0]?.nombre ?? null)
      : (r.proveedor?.nombre ?? null),
  })) as Compra[];
}

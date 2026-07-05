import "server-only";
import type { Proveedor } from "@/lib/proveedores";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { PROVEEDORES_MUESTRA } from "./proveedores-muestra";

/* Capa de datos de Proveedores. Solo-admin (RLS + doble puerta en la UI). */

export async function listarProveedores(): Promise<Proveedor[]> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return [];

  if (!supabaseConfigurado()) {
    return PROVEEDORES_MUESTRA.slice().sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("proveedor")
    .select("*")
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as Proveedor[];
}

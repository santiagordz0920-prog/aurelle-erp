import "server-only";
import type { ContactoUtil } from "@/lib/contactos-utiles";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { CONTACTOS_UTILES_MUESTRA } from "./contactos-utiles-muestra";

/*
  Capa de datos de Contactos del gremio (tercerización). RLS: lectura/escritura
  por sucursal para todo el equipo (a diferencia de `proveedor`, solo-admin).
*/

export async function listarContactosUtiles(): Promise<ContactoUtil[]> {
  if (!supabaseConfigurado()) {
    return CONTACTOS_UTILES_MUESTRA.slice().sort((a, b) =>
      a.nombre.localeCompare(b.nombre),
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("contacto_util")
    .select("*")
    .order("nombre", { ascending: true });
  if (error) throw error;
  return (data ?? []) as ContactoUtil[];
}

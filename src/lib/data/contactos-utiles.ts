import "server-only";
import type { ContactoUtil } from "@/lib/contactos-utiles";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { CONTACTOS_UTILES_MUESTRA } from "./contactos-utiles-muestra";

/* Capa de datos de Contactos útiles. Visible para todos los usuarios
   (la RLS filtra por sucursal; admin ve todo). */

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
    .order("nombre");
  if (error) throw error;
  return (data ?? []) as ContactoUtil[];
}

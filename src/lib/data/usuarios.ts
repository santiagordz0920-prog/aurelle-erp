import "server-only";
import type { Rol } from "@/lib/roles";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

export type UsuarioLite = { id: string; nombre: string; rol: Rol };

/* Directorio ligero de usuarios activos, para selectores (responsable de tarea,
   etc.). RLS de `usuario` deja ver el propio perfil y —para admin— todos; en
   local devuelve al equipo de muestra. */
const USUARIOS_MUESTRA: UsuarioLite[] = [
  { id: "00000000-0000-0000-0000-0000000000aa", nombre: "Santiago", rol: "admin" },
  { id: "00000000-0000-0000-0000-0000000000bb", nombre: "Fer", rol: "admin" },
];

export async function listarUsuarios(): Promise<UsuarioLite[]> {
  if (!supabaseConfigurado()) return USUARIOS_MUESTRA;
  const supabase = await createClient();
  const { data } = await supabase
    .from("usuario")
    .select("id, nombre, rol")
    .order("nombre");
  return (data ?? []) as UsuarioLite[];
}

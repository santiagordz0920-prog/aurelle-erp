import { redirect } from "next/navigation";
import type { Rol } from "./roles";
import { createClient } from "./supabase/server";
import { supabaseConfigurado } from "./supabase/config";

export type UsuarioActual = {
  id: string;
  nombre: string;
  rol: Rol;
  sucursalId: string;
};

/*
  Usuario de la sesión.

  - Con Supabase configurado (producción): lee el usuario de Auth y su perfil de
    `public.usuario`. Si no hay sesión, redirige a /login. La seguridad real la
    impone RLS en la base; este helper solo alimenta la interfaz.
  - Sin Supabase (desarrollo local): devuelve un admin de prueba para poder
    construir y ver la interfaz sin la nube.
*/
export async function getUsuarioActual(): Promise<UsuarioActual> {
  if (!supabaseConfigurado()) {
    return {
      id: "00000000-0000-0000-0000-0000000000aa",
      nombre: "Santiago",
      rol: "admin",
      sucursalId: "00000000-0000-0000-0000-000000000001",
    };
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: perfil } = await supabase
    .from("usuario")
    .select("id, nombre, rol, sucursal_id")
    .eq("id", user.id)
    .single();

  if (!perfil) redirect("/login");

  return {
    id: perfil.id,
    nombre: perfil.nombre,
    rol: perfil.rol as Rol,
    sucursalId: perfil.sucursal_id,
  };
}

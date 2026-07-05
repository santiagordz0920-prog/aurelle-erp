import type { Rol } from "./roles";

export type UsuarioActual = {
  id: string;
  nombre: string;
  rol: Rol;
};

/*
  PUNTO DE INTEGRACIÓN DE AUTH.

  En Fase 0 (sin proyecto Supabase provisionado todavía) devolvemos un usuario
  admin de marcador de posición para que el cascarón de la app renderice. Cuando
  Supabase Auth esté conectado, reemplazar el cuerpo por la consulta real:

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");
    const { data: perfil } = await supabase
      .from("usuario")
      .select("id, nombre, rol")
      .eq("id", user.id)
      .single();
    return perfil;

  La seguridad real la impone RLS en la base; este helper solo alimenta la UI.
*/
export async function getUsuarioActual(): Promise<UsuarioActual> {
  return { id: "stub-santiago", nombre: "Santiago", rol: "admin" };
}

"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { contactoUtilSchema } from "@/lib/validaciones";
import { CONTACTOS_UTILES_MUESTRA } from "@/lib/data/contactos-utiles-muestra";

/*
  Acciones de Contactos del gremio. Un solo `guardar` sirve para alta (sin id)
  y edición (con id); RLS por sucursal permite escribir a todo el equipo.
*/

export type ResultadoContacto = { ok: boolean; error?: string };

export async function guardarContactoUtil(
  _prev: ResultadoContacto,
  formData: FormData,
): Promise<ResultadoContacto> {
  const parsed = contactoUtilSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const campos = {
    nombre: d.nombre,
    tipo: d.tipo ?? null,
    contacto: d.contacto ?? null,
    especialidad: d.especialidad ?? null,
    tiempo_entrega: d.tiempo_entrega ?? null,
    precios_estimados: d.precios_estimados ?? null,
    notas: d.notas ?? null,
  };
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    if (d.id) {
      const c = CONTACTOS_UTILES_MUESTRA.find((x) => x.id === d.id);
      if (c) Object.assign(c, campos, { updated_at: new Date().toISOString() });
    } else {
      CONTACTOS_UTILES_MUESTRA.push({
        id: `60000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
        ...campos,
        sucursal_id: usuario.sucursalId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      });
    }
    revalidatePath("/taller/contactos");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = d.id
    ? await supabase.from("contacto_util").update(campos).eq("id", d.id)
    : await supabase
        .from("contacto_util")
        .insert({ ...campos, sucursal_id: usuario.sucursalId });
  if (error) return { ok: false, error: "No se pudo guardar el contacto." };
  revalidatePath("/taller/contactos");
  return { ok: true };
}

export async function eliminarContactoUtil(id: string): Promise<ResultadoContacto> {
  if (!supabaseConfigurado()) {
    const i = CONTACTOS_UTILES_MUESTRA.findIndex((c) => c.id === id);
    if (i >= 0) CONTACTOS_UTILES_MUESTRA.splice(i, 1);
    revalidatePath("/taller/contactos");
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("contacto_util").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidatePath("/taller/contactos");
  return { ok: true };
}

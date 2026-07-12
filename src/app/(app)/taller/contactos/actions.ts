"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { ContactoUtil } from "@/lib/contactos-utiles";
import { CONTACTOS_UTILES_MUESTRA } from "@/lib/data/contactos-utiles-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const contactoUtilSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio."),
  tipo: z.enum(["joyero", "vaciador", "montador", "otro"]),
  contacto: z.string().trim().optional().nullable(),
  especialidad: z.string().trim().optional().nullable(),
  tiempo_entrega: z.string().trim().optional().nullable(),
  precio_estimado: z.string().trim().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
});

export async function crearContactoUtil(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();

  const parsed = contactoUtilSchema.safeParse({
    nombre: formData.get("nombre"),
    tipo: formData.get("tipo") || "otro",
    contacto: (formData.get("contacto") as string) || null,
    especialidad: (formData.get("especialidad") as string) || null,
    tiempo_entrega: (formData.get("tiempo_entrega") as string) || null,
    precio_estimado: (formData.get("precio_estimado") as string) || null,
    notas: (formData.get("notas") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;

  if (!supabaseConfigurado()) {
    const nuevo: ContactoUtil = {
      id: `c3000000-0000-0000-0000-0000000000${(CONTACTOS_UTILES_MUESTRA.length + 10).toString().slice(-2)}`,
      nombre: d.nombre,
      tipo: d.tipo,
      contacto: d.contacto ?? null,
      especialidad: d.especialidad ?? null,
      tiempo_entrega: d.tiempo_entrega ?? null,
      precio_estimado: d.precio_estimado ?? null,
      notas: d.notas ?? null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    CONTACTOS_UTILES_MUESTRA.unshift(nuevo);
    revalidatePath("/taller/contactos");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contacto_util").insert({
    nombre: d.nombre,
    tipo: d.tipo,
    contacto: d.contacto ?? null,
    especialidad: d.especialidad ?? null,
    tiempo_entrega: d.tiempo_entrega ?? null,
    precio_estimado: d.precio_estimado ?? null,
    notas: d.notas ?? null,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo guardar el contacto." };
  revalidatePath("/taller/contactos");
  return { ok: true };
}

export async function eliminarContactoUtil(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const id = (formData.get("id") as string) || "";
  if (!id) return { ok: false, error: "Contacto no válido." };

  if (!supabaseConfigurado()) {
    const idx = CONTACTOS_UTILES_MUESTRA.findIndex((c) => c.id === id);
    if (idx >= 0) CONTACTOS_UTILES_MUESTRA.splice(idx, 1);
    revalidatePath("/taller/contactos");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("contacto_util").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el contacto." };
  revalidatePath("/taller/contactos");
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { EstadoExpo } from "@/lib/expos";
import { EXPOS_MUESTRA } from "@/lib/data/expos-muestra";
import { CLIENTES_MUESTRA } from "@/lib/data/clientes-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar() {
  revalidatePath("/crecimiento/expos");
  revalidatePath("/crecimiento");
}

const expoSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio."),
  ciudad: z.string().trim().optional().nullable(),
  fecha_inicio: z.string().optional().nullable(),
  fecha_fin: z.string().optional().nullable(),
  estado: z.enum(["candidata", "contratada", "ejecutada", "cancelada"]),
  costo: z.coerce.number().min(0, "El costo no puede ser negativo."),
  contacto: z.string().trim().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
});

export async function crearExpo(_prev: ResultadoAccion, formData: FormData): Promise<ResultadoAccion> {
  const parsed = expoSchema.safeParse({
    nombre: formData.get("nombre"),
    ciudad: (formData.get("ciudad") as string) || null,
    fecha_inicio: (formData.get("fecha_inicio") as string) || null,
    fecha_fin: (formData.get("fecha_fin") as string) || null,
    estado: (formData.get("estado") as string) || "candidata",
    costo: (formData.get("costo") as string) || "0",
    contacto: (formData.get("contacto") as string) || null,
    notas: (formData.get("notas") as string) || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const d = parsed.data;
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    EXPOS_MUESTRA.unshift({
      id: `e5000000-0000-0000-0000-0000000000${(EXPOS_MUESTRA.length + 10).toString().slice(-2)}`,
      nombre: d.nombre,
      ciudad: d.ciudad ?? null,
      fecha_inicio: d.fecha_inicio || null,
      fecha_fin: d.fecha_fin || null,
      estado: d.estado,
      costo: d.costo,
      contacto: d.contacto ?? null,
      notas: d.notas ?? null,
      sucursal_id: usuario.sucursalId,
    });
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("expo").insert({
    nombre: d.nombre,
    ciudad: d.ciudad ?? null,
    fecha_inicio: d.fecha_inicio || null,
    fecha_fin: d.fecha_fin || null,
    estado: d.estado,
    costo: d.costo,
    contacto: d.contacto ?? null,
    notas: d.notas ?? null,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo crear la expo." };
  revalidar();
  return { ok: true };
}

export async function cambiarEstadoExpo(id: string, estado: EstadoExpo): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const e = EXPOS_MUESTRA.find((x) => x.id === id);
    if (e) e.estado = estado;
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("expo").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidar();
  return { ok: true };
}

export async function eliminarExpo(id: string): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const i = EXPOS_MUESTRA.findIndex((x) => x.id === id);
    if (i >= 0) EXPOS_MUESTRA.splice(i, 1);
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("expo").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidar();
  return { ok: true };
}

const leadSchema = z
  .object({
    expo_nombre: z.string().trim().min(1),
    nombre: z.string().trim().min(2, "El nombre es obligatorio."),
    telefono: z.string().trim().optional().nullable(),
    correo: z.string().trim().email("Correo no válido.").optional().nullable(),
    otro_contacto: z.string().trim().optional().nullable(),
    fecha_boda: z.string().optional().nullable(),
  })
  .refine((d) => d.telefono || d.correo || d.otro_contacto, {
    message: "Captura al menos un contacto (teléfono, correo u otro).",
  });

/**
 * Captura rápida de lead en el stand → cliente con fuente=expo, detalle=nombre.
 * En expo el contacto puede ser teléfono, correo u otro — mínimo uno; el
 * preferido queda en el primero capturado. Teléfono sin espacios (regla 0036).
 */
export async function capturarLeadExpo(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = leadSchema.safeParse({
    expo_nombre: formData.get("expo_nombre"),
    nombre: formData.get("nombre"),
    telefono: (formData.get("telefono") as string) || null,
    correo: (formData.get("correo") as string) || null,
    otro_contacto: (formData.get("otro_contacto") as string) || null,
    fecha_boda: (formData.get("fecha_boda") as string) || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const d = parsed.data;
  const telefono = d.telefono ? d.telefono.replace(/[^0-9+]/g, "") : null;
  const contacto_preferido = telefono ? "telefono" : d.correo ? "correo" : "otro";
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    CLIENTES_MUESTRA.unshift({
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      id: `10000000-0000-0000-0000-0000000009${(CLIENTES_MUESTRA.length + 10).toString().slice(-2)}` as any,
      nombre: d.nombre,
      telefono,
      correo: d.correo ?? null,
      otro_contacto: d.otro_contacto ?? null,
      contacto_preferido,
      fecha_nacimiento: null,
      fecha_boda: d.fecha_boda || null,
      pareja_nombre: null,
      fuente_canal: "expo",
      fuente_detalle: d.expo_nombre,
      etiquetas: [],
      estado_pipeline: "nuevo",
      motivo_perdida: null,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any);
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("cliente").insert({
    nombre: d.nombre,
    telefono,
    correo: d.correo ?? null,
    otro_contacto: d.otro_contacto ?? null,
    contacto_preferido,
    fecha_boda: d.fecha_boda || null,
    fuente_canal: "expo",
    fuente_detalle: d.expo_nombre,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo capturar el lead." };
  revalidar();
  return { ok: true };
}

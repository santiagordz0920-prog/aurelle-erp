"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { RECURRENTES_MUESTRA } from "@/lib/data/recurrentes-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar() {
  revalidatePath("/hoy/tareas/recurrentes");
}

const schema = z.object({
  titulo: z.string().trim().min(2, "El título es obligatorio."),
  detalle: z.string().trim().optional().nullable(),
  responsable_id: z.string().uuid().optional().nullable(),
  prioridad: z.enum(["baja", "media", "alta"]),
  cadencia: z.enum(["semanal", "mensual"]),
  dia: z.coerce.number().int().min(1).max(28),
});

export async function crearRecurrente(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = schema.safeParse({
    titulo: formData.get("titulo"),
    detalle: (formData.get("detalle") as string) || null,
    responsable_id: (formData.get("responsable_id") as string) || null,
    prioridad: (formData.get("prioridad") as string) || "media",
    cadencia: (formData.get("cadencia") as string) || "mensual",
    dia: (formData.get("dia") as string) || "1",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  const d = parsed.data;
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    RECURRENTES_MUESTRA.unshift({
      id: `aa000000-0000-0000-0000-0000000000${(RECURRENTES_MUESTRA.length + 10).toString().slice(-2)}`,
      titulo: d.titulo,
      detalle: d.detalle ?? null,
      responsable_id: d.responsable_id ?? null,
      responsable_nombre: null,
      prioridad: d.prioridad,
      cadencia: d.cadencia,
      dia: d.dia,
      activo: true,
      sucursal_id: usuario.sucursalId,
    });
    revalidar();
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tarea_recurrente").insert({
    titulo: d.titulo,
    detalle: d.detalle ?? null,
    responsable_id: d.responsable_id ?? null,
    prioridad: d.prioridad,
    cadencia: d.cadencia,
    dia: d.dia,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo crear la tarea recurrente." };
  revalidar();
  return { ok: true };
}

export async function alternarRecurrente(id: string, activo: boolean): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const r = RECURRENTES_MUESTRA.find((x) => x.id === id);
    if (r) r.activo = activo;
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tarea_recurrente").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidar();
  return { ok: true };
}

export async function eliminarRecurrente(id: string): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const i = RECURRENTES_MUESTRA.findIndex((x) => x.id === id);
    if (i >= 0) RECURRENTES_MUESTRA.splice(i, 1);
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tarea_recurrente").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  revalidar();
  return { ok: true };
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { EstadoTarea, Tarea } from "@/lib/tareas";
import { TAREAS_MUESTRA } from "@/lib/data/tareas-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar() {
  revalidatePath("/hoy");
  revalidatePath("/hoy/tareas");
  revalidatePath("/clientes", "layout");
}

const tareaSchema = z.object({
  titulo: z.string().trim().min(2, "El título es obligatorio."),
  detalle: z.string().trim().optional().nullable(),
  responsable_id: z.string().uuid().optional().nullable(),
  prioridad: z.enum(["baja", "media", "alta"]),
  fecha_vencimiento: z.string().optional().nullable(),
  entidad_tipo: z
    .enum(["cliente", "pedido", "cotizacion", "item_inventario", "expo", "proveedor"])
    .optional()
    .nullable(),
  entidad_id: z.string().uuid().optional().nullable(),
});

export async function crearTarea(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = tareaSchema.safeParse({
    titulo: formData.get("titulo"),
    detalle: (formData.get("detalle") as string) || null,
    responsable_id: (formData.get("responsable_id") as string) || null,
    prioridad: (formData.get("prioridad") as string) || "media",
    fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
    entidad_tipo: (formData.get("entidad_tipo") as string) || null,
    entidad_id: (formData.get("entidad_id") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    const nuevo: Tarea = {
      id: `d1000000-0000-0000-0000-0000000009${(TAREAS_MUESTRA.length + 10).toString().slice(-2)}`,
      titulo: d.titulo,
      detalle: d.detalle ?? null,
      responsable_id: d.responsable_id ?? usuario.id,
      responsable_nombre: null,
      prioridad: d.prioridad,
      estado: "pendiente",
      fecha_vencimiento: d.fecha_vencimiento || null,
      entidad_tipo: d.entidad_tipo ?? null,
      entidad_id: d.entidad_id ?? null,
      origen: "manual",
      completada_at: null,
      creada_por: usuario.id,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    TAREAS_MUESTRA.unshift(nuevo);
    revalidar();
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("tarea").insert({
    titulo: d.titulo,
    detalle: d.detalle ?? null,
    responsable_id: d.responsable_id ?? usuario.id,
    prioridad: d.prioridad,
    fecha_vencimiento: d.fecha_vencimiento || null,
    entidad_tipo: d.entidad_tipo ?? null,
    entidad_id: d.entidad_id ?? null,
    creada_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo crear la tarea." };
  revalidar();
  return { ok: true };
}

export async function cambiarEstadoTarea(
  id: string,
  estado: EstadoTarea,
): Promise<ResultadoAccion> {
  const completada_at = estado === "hecha" ? new Date().toISOString() : null;

  if (!supabaseConfigurado()) {
    const t = TAREAS_MUESTRA.find((x) => x.id === id);
    if (t) {
      t.estado = estado;
      t.completada_at = completada_at;
    }
    revalidar();
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("tarea")
    .update({ estado, completada_at })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la tarea." };
  revalidar();
  return { ok: true };
}

export async function eliminarTarea(id: string): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const i = TAREAS_MUESTRA.findIndex((x) => x.id === id);
    if (i >= 0) TAREAS_MUESTRA.splice(i, 1);
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("tarea").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la tarea." };
  revalidar();
  return { ok: true };
}

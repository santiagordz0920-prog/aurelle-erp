import "server-only";
import type { EntidadTarea, Tarea } from "@/lib/tareas";
import { esDeHoy, PRIORIDAD_TAREA } from "@/lib/tareas";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { TAREAS_MUESTRA } from "./tareas-muestra";

/*
  Capa de datos de Tareas. RLS filtra por sucursal (no es solo-admin). El
  responsable se resuelve por relación con `usuario` en producción.
*/

export type FiltroTareas = {
  estado?: "pendiente" | "hecha";
  entidad_tipo?: EntidadTarea;
  entidad_id?: string;
};

/** Orden estable: pendientes primero, luego por prioridad y vencimiento. */
function ordenar(a: Tarea, b: Tarea): number {
  if (a.estado !== b.estado) return a.estado === "pendiente" ? -1 : 1;
  const pa = PRIORIDAD_TAREA[a.prioridad].orden;
  const pb = PRIORIDAD_TAREA[b.prioridad].orden;
  if (pa !== pb) return pa - pb;
  const fa = a.fecha_vencimiento ?? "9999-12-31";
  const fb = b.fecha_vencimiento ?? "9999-12-31";
  return fa.localeCompare(fb);
}

export async function listarTareas(filtro: FiltroTareas = {}): Promise<Tarea[]> {
  if (!supabaseConfigurado()) {
    return TAREAS_MUESTRA.filter(
      (t) =>
        (!filtro.estado || t.estado === filtro.estado) &&
        (!filtro.entidad_tipo || t.entidad_tipo === filtro.entidad_tipo) &&
        (!filtro.entidad_id || t.entidad_id === filtro.entidad_id),
    )
      .slice()
      .sort(ordenar);
  }

  const supabase = await createClient();
  let query = supabase
    .from("tarea")
    .select("*, usuario:responsable_id(nombre)")
    .order("created_at", { ascending: false });
  if (filtro.estado) query = query.eq("estado", filtro.estado);
  if (filtro.entidad_tipo) query = query.eq("entidad_tipo", filtro.entidad_tipo);
  if (filtro.entidad_id) query = query.eq("entidad_id", filtro.entidad_id);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const filas = (data ?? []) as any[];
  return filas
    .map((r) => ({
      ...r,
      responsable_nombre: Array.isArray(r.usuario)
        ? (r.usuario[0]?.nombre ?? null)
        : (r.usuario?.nombre ?? null),
    }))
    .sort(ordenar) as Tarea[];
}

/** Tareas de "Hoy": pendientes vencidas, para hoy, o sin fecha. */
export async function tareasDeHoy(): Promise<Tarea[]> {
  const tareas = await listarTareas({ estado: "pendiente" });
  return tareas.filter(esDeHoy);
}

"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { LineaNegocio } from "@/lib/pedidos";
import { CHECKLIST_QC_MUESTRA } from "@/lib/data/produccion-muestra";

/*
  CRUD del checklist de QC (editable, 0023). Es config del negocio: SOLO admin
  (la RLS de `qc_checklist_item` también lo impone; aquí lo verificamos para dar
  un error claro en vez de una falla silenciosa de RLS).
*/

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar() {
  revalidatePath("/taller/produccion/qc");
  revalidatePath("/taller/produccion");
}

async function soloAdmin(): Promise<ResultadoAccion | null> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") {
    return { ok: false, error: "Solo un administrador puede editar el checklist." };
  }
  return null;
}

const textoSchema = z.string().trim().min(3, "Escribe el punto de control.").max(160);

/** Agrega un punto al final del checklist de una línea. */
export async function agregarChecklistItem(
  linea: LineaNegocio,
  texto: string,
): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (!supabaseConfigurado()) {
    const posicion =
      Math.max(-1, ...CHECKLIST_QC_MUESTRA.filter((i) => i.linea_negocio === linea).map((i) => i.posicion)) + 1;
    const now = new Date().toISOString();
    CHECKLIST_QC_MUESTRA.push({
      id: `qc-${linea}-${Date.now()}`,
      linea_negocio: linea,
      posicion,
      texto: parsed.data,
      activo: true,
      sucursal_id: "00000000-0000-0000-0000-000000000001",
      created_at: now,
      updated_at: now,
    });
    revalidar();
    return { ok: true };
  }

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  const { data: max } = await supabase
    .from("qc_checklist_item")
    .select("posicion")
    .eq("linea_negocio", linea)
    .order("posicion", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("qc_checklist_item").insert({
    linea_negocio: linea,
    posicion: (max?.posicion ?? -1) + 1,
    texto: parsed.data,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo agregar el punto." };
  revalidar();
  return { ok: true };
}

/** Edita el texto de un punto. */
export async function editarChecklistItem(id: string, texto: string): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;
  const parsed = textoSchema.safeParse(texto);
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (!supabaseConfigurado()) {
    const it = CHECKLIST_QC_MUESTRA.find((i) => i.id === id);
    if (it) it.texto = parsed.data;
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("qc_checklist_item")
    .update({ texto: parsed.data })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar el cambio." };
  revalidar();
  return { ok: true };
}

/** Activa o desactiva un punto (desactivado = no aparece en el QC, pero se conserva). */
export async function alternarChecklistItem(id: string, activo: boolean): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;

  if (!supabaseConfigurado()) {
    const it = CHECKLIST_QC_MUESTRA.find((i) => i.id === id);
    if (it) it.activo = activo;
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("qc_checklist_item").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar el punto." };
  revalidar();
  return { ok: true };
}

/** Mueve un punto arriba/abajo intercambiando la posición con su vecino de la misma línea. */
export async function moverChecklistItem(id: string, dir: "arriba" | "abajo"): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;

  if (!supabaseConfigurado()) {
    const it = CHECKLIST_QC_MUESTRA.find((i) => i.id === id);
    if (!it) return { ok: false, error: "Punto no encontrado." };
    const hermanos = CHECKLIST_QC_MUESTRA.filter((i) => i.linea_negocio === it.linea_negocio).sort(
      (a, b) => a.posicion - b.posicion,
    );
    const idx = hermanos.findIndex((i) => i.id === id);
    const otro = dir === "arriba" ? hermanos[idx - 1] : hermanos[idx + 1];
    if (!otro) return { ok: true };
    [it.posicion, otro.posicion] = [otro.posicion, it.posicion];
    revalidar();
    return { ok: true };
  }

  const supabase = await createClient();
  const { data: it } = await supabase
    .from("qc_checklist_item")
    .select("id, linea_negocio, posicion")
    .eq("id", id)
    .maybeSingle();
  if (!it) return { ok: false, error: "Punto no encontrado." };
  // Vecino inmediato en la dirección pedida (arriba = posición menor).
  const base = supabase
    .from("qc_checklist_item")
    .select("id, posicion")
    .eq("linea_negocio", it.linea_negocio);
  const q =
    dir === "arriba"
      ? base.lt("posicion", it.posicion).order("posicion", { ascending: false })
      : base.gt("posicion", it.posicion).order("posicion", { ascending: true });
  const { data: vecino } = await q.limit(1).maybeSingle();
  if (!vecino) return { ok: true };
  // Intercambio de posiciones (dos updates).
  await supabase.from("qc_checklist_item").update({ posicion: vecino.posicion }).eq("id", it.id);
  await supabase.from("qc_checklist_item").update({ posicion: it.posicion }).eq("id", vecino.id);
  revalidar();
  return { ok: true };
}

/** Elimina un punto del checklist. */
export async function eliminarChecklistItem(id: string): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;

  if (!supabaseConfigurado()) {
    const i = CHECKLIST_QC_MUESTRA.findIndex((x) => x.id === id);
    if (i >= 0) CHECKLIST_QC_MUESTRA.splice(i, 1);
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("qc_checklist_item").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar el punto." };
  revalidar();
  return { ok: true };
}

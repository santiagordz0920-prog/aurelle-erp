"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { CLAUSULAS_CONTRATO_MUESTRA } from "@/lib/data/documentos-muestra";

/*
  CRUD de las cláusulas del contrato (editable, 0024). Es texto legal del
  negocio: SOLO admin (la RLS de `clausula_contrato` también lo impone; aquí lo
  verificamos para dar un error claro). Las cláusulas vigentes se congelan en el
  snapshot al firmar (0022): editar aquí NO altera contratos ya firmados.
*/

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar() {
  revalidatePath("/sistema/contrato");
}

async function soloAdmin(): Promise<ResultadoAccion | null> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") {
    return { ok: false, error: "Solo un administrador puede editar las cláusulas." };
  }
  return null;
}

const clausulaSchema = z.object({
  titulo: z.string().trim().min(2, "El título es obligatorio.").max(60),
  cuerpo: z.string().trim().min(10, "El texto de la cláusula es muy corto.").max(1000),
});

/** Agrega una cláusula al final. */
export async function agregarClausula(titulo: string, cuerpo: string): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;
  const parsed = clausulaSchema.safeParse({ titulo, cuerpo });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (!supabaseConfigurado()) {
    const posicion = Math.max(-1, ...CLAUSULAS_CONTRATO_MUESTRA.map((c) => c.posicion)) + 1;
    const now = new Date().toISOString();
    CLAUSULAS_CONTRATO_MUESTRA.push({
      id: `cl-${Date.now()}`,
      titulo: parsed.data.titulo,
      cuerpo: parsed.data.cuerpo,
      posicion,
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
    .from("clausula_contrato")
    .select("posicion")
    .order("posicion", { ascending: false })
    .limit(1)
    .maybeSingle();
  const { error } = await supabase.from("clausula_contrato").insert({
    titulo: parsed.data.titulo,
    cuerpo: parsed.data.cuerpo,
    posicion: (max?.posicion ?? -1) + 1,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo agregar la cláusula." };
  revalidar();
  return { ok: true };
}

/** Edita título y cuerpo de una cláusula. */
export async function editarClausula(
  id: string,
  titulo: string,
  cuerpo: string,
): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;
  const parsed = clausulaSchema.safeParse({ titulo, cuerpo });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message };

  if (!supabaseConfigurado()) {
    const c = CLAUSULAS_CONTRATO_MUESTRA.find((x) => x.id === id);
    if (c) {
      c.titulo = parsed.data.titulo;
      c.cuerpo = parsed.data.cuerpo;
    }
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("clausula_contrato")
    .update({ titulo: parsed.data.titulo, cuerpo: parsed.data.cuerpo })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo guardar el cambio." };
  revalidar();
  return { ok: true };
}

/** Activa o desactiva una cláusula (desactivada = no aparece en el contrato). */
export async function alternarClausula(id: string, activo: boolean): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;

  if (!supabaseConfigurado()) {
    const c = CLAUSULAS_CONTRATO_MUESTRA.find((x) => x.id === id);
    if (c) c.activo = activo;
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("clausula_contrato").update({ activo }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la cláusula." };
  revalidar();
  return { ok: true };
}

/** Mueve una cláusula arriba/abajo intercambiando la posición con su vecina. */
export async function moverClausula(id: string, dir: "arriba" | "abajo"): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;

  if (!supabaseConfigurado()) {
    const orden = [...CLAUSULAS_CONTRATO_MUESTRA].sort((a, b) => a.posicion - b.posicion);
    const idx = orden.findIndex((c) => c.id === id);
    if (idx < 0) return { ok: false, error: "Cláusula no encontrada." };
    const otro = dir === "arriba" ? orden[idx - 1] : orden[idx + 1];
    if (!otro) return { ok: true };
    const actual = orden[idx];
    [actual.posicion, otro.posicion] = [otro.posicion, actual.posicion];
    revalidar();
    return { ok: true };
  }

  const supabase = await createClient();
  const { data: it } = await supabase
    .from("clausula_contrato")
    .select("id, posicion")
    .eq("id", id)
    .maybeSingle();
  if (!it) return { ok: false, error: "Cláusula no encontrada." };
  const base = supabase.from("clausula_contrato").select("id, posicion");
  const q =
    dir === "arriba"
      ? base.lt("posicion", it.posicion).order("posicion", { ascending: false })
      : base.gt("posicion", it.posicion).order("posicion", { ascending: true });
  const { data: vecino } = await q.limit(1).maybeSingle();
  if (!vecino) return { ok: true };
  await supabase.from("clausula_contrato").update({ posicion: vecino.posicion }).eq("id", it.id);
  await supabase.from("clausula_contrato").update({ posicion: it.posicion }).eq("id", vecino.id);
  revalidar();
  return { ok: true };
}

/** Elimina una cláusula. */
export async function eliminarClausula(id: string): Promise<ResultadoAccion> {
  const noAdmin = await soloAdmin();
  if (noAdmin) return noAdmin;

  if (!supabaseConfigurado()) {
    const i = CLAUSULAS_CONTRATO_MUESTRA.findIndex((x) => x.id === id);
    if (i >= 0) CLAUSULAS_CONTRATO_MUESTRA.splice(i, 1);
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("clausula_contrato").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar la cláusula." };
  revalidar();
  return { ok: true };
}

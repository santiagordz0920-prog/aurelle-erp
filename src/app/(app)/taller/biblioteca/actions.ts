"use server";

import { randomUUID } from "crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Media, TipoMedia } from "@/lib/media";
import { TIPOS_MEDIA, TODAS_ETIQUETAS } from "@/lib/media";
import { MEDIA_MUESTRA } from "@/lib/data/media-muestra";

export type ResultadoMedia = { ok: boolean; error?: string };

const BUCKET = "media";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por archivo

const esquema = z.object({
  tipo: z.enum(TIPOS_MEDIA as [TipoMedia, ...TipoMedia[]]),
  pedido_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  etiquetas: z.array(z.string()).default([]),
});

/** Sube un archivo al bucket privado `media` e indexa la fila con metadatos. */
export async function subirMedia(formData: FormData): Promise<ResultadoMedia> {
  const usuario = await getUsuarioActual();
  const archivo = formData.get("archivo");
  if (!(archivo instanceof File) || archivo.size === 0) {
    return { ok: false, error: "Selecciona un archivo." };
  }
  if (archivo.size > MAX_BYTES) {
    return { ok: false, error: "El archivo supera 15 MB." };
  }

  const parsed = esquema.safeParse({
    tipo: formData.get("tipo"),
    pedido_id: (formData.get("pedido_id") as string) || null,
    cliente_id: (formData.get("cliente_id") as string) || null,
    etiquetas: formData
      .getAll("etiquetas")
      .map(String)
      .filter((t) => TODAS_ETIQUETAS.includes(t)),
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { tipo, pedido_id, cliente_id, etiquetas } = parsed.data;

  const revalidar = () => {
    revalidatePath("/taller/biblioteca");
    if (pedido_id) revalidatePath(`/ventas/pedidos/${pedido_id}`);
  };

  if (!supabaseConfigurado()) {
    // Local: sin Storage. Guardamos el archivo como data-URI para verlo en la galería.
    const buf = Buffer.from(await archivo.arrayBuffer());
    const url = `data:${archivo.type || "application/octet-stream"};base64,${buf.toString("base64")}`;
    const nueva: Media = {
      id: randomUUID(),
      tipo,
      storage_path: `muestra/${archivo.name}`,
      nombre: archivo.name,
      cliente_id: cliente_id ?? null,
      pedido_id: pedido_id ?? null,
      item_id: null,
      orden_id: null,
      etapa: null,
      version: 1,
      aprobado: false,
      etiquetas,
      subido_por: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      url,
    };
    MEDIA_MUESTRA.unshift(nueva);
    revalidar();
    return { ok: true };
  }

  const supabase = await createClient();
  const carpeta = pedido_id ?? cliente_id ?? "general";
  const path = `${carpeta}/${randomUUID()}-${archivo.name}`;
  const { error: errUp } = await supabase.storage
    .from(BUCKET)
    .upload(path, archivo, { contentType: archivo.type || undefined, upsert: false });
  if (errUp) return { ok: false, error: "No se pudo subir el archivo." };

  const { error: errIns } = await supabase.from("media").insert({
    tipo,
    storage_path: path,
    nombre: archivo.name,
    pedido_id: pedido_id ?? null,
    cliente_id: cliente_id ?? null,
    etiquetas,
    sucursal_id: usuario.sucursalId,
    subido_por: usuario.id,
  });
  if (errIns) {
    // Rollback del archivo si la fila no se pudo indexar.
    await supabase.storage.from(BUCKET).remove([path]);
    return { ok: false, error: "No se pudo registrar el archivo." };
  }
  revalidar();
  return { ok: true };
}

/** Marca/desmarca un render como aprobado por el cliente (v2 aprobado). */
export async function alternarAprobado(
  id: string,
  aprobado: boolean,
  pedidoId?: string | null,
): Promise<ResultadoMedia> {
  if (!supabaseConfigurado()) {
    const m = MEDIA_MUESTRA.find((x) => x.id === id);
    if (m) m.aprobado = aprobado;
    revalidatePath("/taller/biblioteca");
    if (pedidoId) revalidatePath(`/ventas/pedidos/${pedidoId}`);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("media").update({ aprobado }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  revalidatePath("/taller/biblioteca");
  if (pedidoId) revalidatePath(`/ventas/pedidos/${pedidoId}`);
  return { ok: true };
}

/** Elimina un archivo (fila + objeto en Storage). */
export async function eliminarMedia(
  id: string,
  pedidoId?: string | null,
): Promise<ResultadoMedia> {
  if (!supabaseConfigurado()) {
    const i = MEDIA_MUESTRA.findIndex((x) => x.id === id);
    if (i >= 0) MEDIA_MUESTRA.splice(i, 1);
    revalidatePath("/taller/biblioteca");
    if (pedidoId) revalidatePath(`/ventas/pedidos/${pedidoId}`);
    return { ok: true };
  }
  const supabase = await createClient();
  const { data: fila } = await supabase
    .from("media")
    .select("storage_path")
    .eq("id", id)
    .maybeSingle();
  const { error } = await supabase.from("media").delete().eq("id", id);
  if (error) return { ok: false, error: "No se pudo eliminar." };
  if (fila?.storage_path) {
    await supabase.storage.from(BUCKET).remove([fila.storage_path]);
  }
  revalidatePath("/taller/biblioteca");
  if (pedidoId) revalidatePath(`/ventas/pedidos/${pedidoId}`);
  return { ok: true };
}

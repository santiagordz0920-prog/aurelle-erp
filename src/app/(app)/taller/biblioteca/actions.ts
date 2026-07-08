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
import { ETAPAS_PRODUCCION, indiceEtapa, type EtapaProduccion } from "@/lib/produccion";
import { ORDENES_MUESTRA } from "@/lib/data/produccion-muestra";

export type ResultadoMedia = { ok: boolean; error?: string };

const BUCKET = "media";
const MAX_BYTES = 15 * 1024 * 1024; // 15 MB por archivo

const esquema = z.object({
  tipo: z.enum(TIPOS_MEDIA as [TipoMedia, ...TipoMedia[]]),
  pedido_id: z.string().uuid().nullable().optional(),
  cliente_id: z.string().uuid().nullable().optional(),
  orden_id: z.string().uuid().nullable().optional(),
  etapa: z.enum(ETAPAS_PRODUCCION as [EtapaProduccion, ...EtapaProduccion[]]).nullable().optional(),
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
    orden_id: (formData.get("orden_id") as string) || null,
    etapa: (formData.get("etapa") as string) || null,
    etiquetas: formData
      .getAll("etiquetas")
      .map(String)
      .filter((t) => TODAS_ETIQUETAS.includes(t)),
  });
  if (!parsed.success) return { ok: false, error: "Datos inválidos." };
  const { tipo, pedido_id, cliente_id, orden_id, etapa, etiquetas } = parsed.data;

  const revalidar = () => {
    revalidatePath("/taller/biblioteca");
    if (pedido_id) revalidatePath(`/ventas/pedidos/${pedido_id}`);
    if (orden_id) revalidatePath(`/taller/produccion/${orden_id}`);
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
      orden_id: orden_id ?? null,
      etapa: etapa ?? null,
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
    orden_id: orden_id ?? null,
    etapa: etapa ?? null,
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

/**
 * Avanza la orden de un pedido a `aprobacion_cliente` (matriz §4: render aprobado
 * → etapa aprobada). Solo hacia adelante: si ya pasó esa etapa, no retrocede.
 */
async function avanzarOrdenAAprobacion(usuarioId: string, pedidoId: string) {
  const meta = indiceEtapa("aprobacion_cliente");

  if (!supabaseConfigurado()) {
    const orden = ORDENES_MUESTRA.find((o) => o.pedido_id === pedidoId);
    if (orden && indiceEtapa(orden.etapa) < meta) {
      orden.etapa = "aprobacion_cliente";
      orden.updated_at = new Date().toISOString();
      revalidatePath(`/taller/produccion/${orden.id}`);
      revalidatePath("/taller/produccion");
    }
    return;
  }

  const supabase = await createClient();
  const { data: orden } = await supabase
    .from("orden_produccion")
    .select("id, etapa")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (!orden || indiceEtapa(orden.etapa as EtapaProduccion) >= meta) return;
  await supabase
    .from("orden_produccion")
    .update({ etapa: "aprobacion_cliente" })
    .eq("id", orden.id);
  await supabase.from("orden_movimiento").insert({
    orden_id: orden.id,
    etapa_desde: orden.etapa,
    etapa_hasta: "aprobacion_cliente",
    movido_por: usuarioId,
  });
  revalidatePath(`/taller/produccion/${orden.id}`);
  revalidatePath("/taller/produccion");
}

/** Marca/desmarca un render como aprobado por el cliente (v2 aprobado). */
export async function alternarAprobado(
  id: string,
  aprobado: boolean,
  pedidoId?: string | null,
  tipo?: TipoMedia,
): Promise<ResultadoMedia> {
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    const m = MEDIA_MUESTRA.find((x) => x.id === id);
    if (m) m.aprobado = aprobado;
    if (aprobado && tipo === "render" && pedidoId) {
      await avanzarOrdenAAprobacion(usuario.id, pedidoId);
    }
    revalidatePath("/taller/biblioteca");
    if (pedidoId) revalidatePath(`/ventas/pedidos/${pedidoId}`);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("media").update({ aprobado }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar." };
  if (aprobado && tipo === "render" && pedidoId) {
    await avanzarOrdenAAprobacion(usuario.id, pedidoId);
  }
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

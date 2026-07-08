import "server-only";
import type { Media, TipoMedia } from "@/lib/media";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { MEDIA_MUESTRA } from "./media-muestra";

/*
  Capa de datos de la Biblioteca de media. RLS filtra por sucursal. Los archivos
  están en el bucket privado `media`: se leen con URLs firmadas de corta vida
  (1 h) generadas aquí, en el servidor — nunca se expone una URL pública.
*/

const BUCKET = "media";
const FIRMA_SEGUNDOS = 60 * 60; // 1 hora

export type FiltroMedia = {
  tipo?: TipoMedia;
  etiqueta?: string;
  pedido_id?: string;
  cliente_id?: string;
  soloSinPedido?: boolean; // galería general "libre" (piezas terminadas de marketing)
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function normalizar(r: any): Media {
  return { ...r, url: null } as Media;
}

/** Adjunta URLs firmadas de corta vida a un lote de media (prod). */
async function conUrls(
  supabase: Awaited<ReturnType<typeof createClient>>,
  filas: Media[],
): Promise<Media[]> {
  if (filas.length === 0) return filas;
  const paths = filas.map((f) => f.storage_path);
  const { data } = await supabase.storage.from(BUCKET).createSignedUrls(paths, FIRMA_SEGUNDOS);
  const porPath = new Map<string, string>();
  for (const s of data ?? []) {
    if (s.path && s.signedUrl) porPath.set(s.path, s.signedUrl);
  }
  return filas.map((f) => ({ ...f, url: porPath.get(f.storage_path) ?? null }));
}

function aplicarFiltroMuestra(m: Media[], f: FiltroMedia): Media[] {
  return m.filter(
    (x) =>
      (!f.tipo || x.tipo === f.tipo) &&
      (!f.etiqueta || x.etiquetas.includes(f.etiqueta)) &&
      (!f.pedido_id || x.pedido_id === f.pedido_id) &&
      (!f.cliente_id || x.cliente_id === f.cliente_id) &&
      (!f.soloSinPedido || x.pedido_id === null),
  );
}

/** Media de un pedido (galería de su ficha / producción). */
export async function listarMediaDePedido(pedidoId: string): Promise<Media[]> {
  return listarMedia({ pedido_id: pedidoId });
}

/** Listado general con filtros; ordenado por más reciente. */
export async function listarMedia(filtro: FiltroMedia = {}): Promise<Media[]> {
  if (!supabaseConfigurado()) {
    return aplicarFiltroMuestra(MEDIA_MUESTRA, filtro)
      .slice()
      .sort((a, b) => b.created_at.localeCompare(a.created_at));
  }
  const supabase = await createClient();
  let query = supabase.from("media").select("*").order("created_at", { ascending: false });
  if (filtro.tipo) query = query.eq("tipo", filtro.tipo);
  if (filtro.etiqueta) query = query.contains("etiquetas", [filtro.etiqueta]);
  if (filtro.pedido_id) query = query.eq("pedido_id", filtro.pedido_id);
  if (filtro.cliente_id) query = query.eq("cliente_id", filtro.cliente_id);
  if (filtro.soloSinPedido) query = query.is("pedido_id", null);
  const { data, error } = await query;
  if (error) throw error;
  const filas = (data ?? []).map(normalizar);
  return conUrls(supabase, filas);
}

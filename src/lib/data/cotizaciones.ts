import "server-only";
import type { Cotizacion, PrecioMetal } from "@/lib/cotizaciones";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import {
  COTIZACIONES_MUESTRA,
  PRECIOS_METAL_MUESTRA,
} from "./cotizaciones-muestra";

export async function listarCotizaciones(estado?: string): Promise<Cotizacion[]> {
  if (!supabaseConfigurado()) {
    return COTIZACIONES_MUESTRA.filter((c) => !estado || c.estado === estado);
  }
  const supabase = await createClient();
  let query = supabase
    .from("cotizacion")
    .select("*, cliente(nombre)")
    .order("created_at", { ascending: false });
  if (estado) query = query.eq("estado", estado);
  const { data, error } = await query;
  if (error) throw error;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  return (data ?? []).map((r: any) => ({
    ...r,
    cliente_nombre: Array.isArray(r.cliente)
      ? (r.cliente[0]?.nombre ?? null)
      : (r.cliente?.nombre ?? null),
  })) as Cotizacion[];
}

export async function getCotizacion(id: string): Promise<Cotizacion | null> {
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";

  if (!supabaseConfigurado()) {
    const c = COTIZACIONES_MUESTRA.find((x) => x.id === id);
    if (!c) return null;
    return { ...c, costo_estimado: esAdmin ? c.costo_estimado : undefined };
  }

  const supabase = await createClient();
  const { data } = await supabase
    .from("cotizacion")
    .select(
      "*, cliente(nombre), cotizacion_linea(*), cotizacion_margen(costo_estimado)",
    )
    .eq("id", id)
    .maybeSingle();
  if (!data) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const r = data as any;
  const margen = Array.isArray(r.cotizacion_margen)
    ? r.cotizacion_margen[0]
    : r.cotizacion_margen;
  return {
    ...r,
    cliente_nombre: Array.isArray(r.cliente)
      ? (r.cliente[0]?.nombre ?? null)
      : (r.cliente?.nombre ?? null),
    lineas: (r.cotizacion_linea ?? []).sort(
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (a: any, b: any) => a.orden - b.orden,
    ),
    costo_estimado: esAdmin ? (margen?.costo_estimado ?? null) : undefined,
  } as Cotizacion;
}

/** Último precio por metal (para referencia en el constructor). */
export async function preciosMetalActuales(): Promise<PrecioMetal[]> {
  if (!supabaseConfigurado()) return PRECIOS_METAL_MUESTRA;
  const supabase = await createClient();
  const { data } = await supabase
    .from("precio_metal")
    .select("*")
    .order("fecha", { ascending: false })
    .limit(20);
  // Quedarse con el más reciente por (metal, pureza)
  const vistos = new Set<string>();
  const out: PrecioMetal[] = [];
  for (const p of (data ?? []) as PrecioMetal[]) {
    const k = `${p.metal}-${p.pureza ?? ""}`;
    if (!vistos.has(k)) {
      vistos.add(k);
      out.push(p);
    }
  }
  return out;
}

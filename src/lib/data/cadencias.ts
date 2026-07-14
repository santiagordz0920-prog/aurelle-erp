import "server-only";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import type { Cliente } from "@/lib/clientes";
import {
  type EstadoCadencia,
  type ArquetipoToque,
  ESTADOS_ACTIVOS,
  ESTADOS_CADENCIA,
  cadenciaDesdePipeline,
  renderMensaje,
  waMeLink,
} from "@/lib/cadencias";
import { CLIENTES_MUESTRA } from "./clientes-muestra";

/* Capa de datos de Follow-ups / cadencias (§ DISENO_FUNNEL_MENSAJES). */

export type PlantillaCadencia = {
  id: string;
  estado_cadencia: EstadoCadencia;
  toque_n: number;
  arquetipo: ArquetipoToque;
  variante: string;
  texto: string;
  offset_horas: number;
  activa: boolean;
  pendiente_contenido: boolean;
};

export type ToqueDeHoy = {
  cliente_id: string;
  nombre: string;
  telefono: string | null;
  interes: string | null;
  estado_cadencia: EstadoCadencia;
  toque_n: number;
  arquetipo: ArquetipoToque | null;
  plantilla_id: string | null;
  variante: string | null;
  texto: string; // ya renderizado con los datos del lead
  pendiente_contenido: boolean;
  wa_link: string | null;
  escalado: boolean;
  es_simulacion: boolean;
};

export type LeadCadencia = {
  id: string;
  nombre: string;
  telefono: string | null;
  interes: string | null;
  estado_cadencia: EstadoCadencia;
  cadencia_toque_n: number;
  proximo_toque_at: string | null;
  cadencia_pausada: boolean;
  escalado: boolean;
  es_simulacion: boolean;
};

/** Plantillas activas, ordenadas. Editable por admin en /crecimiento/seguimiento. */
export async function listarPlantillas(): Promise<PlantillaCadencia[]> {
  if (!supabaseConfigurado()) return PLANTILLAS_MUESTRA;
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("plantilla_cadencia")
    .select("*")
    .order("estado_cadencia")
    .order("toque_n");
  if (error) throw error;
  return (data ?? []) as PlantillaCadencia[];
}

function texto(
  plantilla: PlantillaCadencia | undefined,
  lead: { nombre: string; interes?: string | null; fecha_propuesta?: string | null },
): string {
  if (!plantilla) return "";
  return renderMensaje(plantilla.texto, {
    nombre: lead.nombre,
    interes: lead.interes,
    fecha: lead.fecha_propuesta ?? null,
  });
}

/**
 * Toques de hoy (F1): leads en cadencia cuyo próximo toque ya venció, con el
 * mensaje LISTO para copiar/pegar o wa.me. El humano lo envía y marca hecho.
 */
export async function toquesDeHoy(): Promise<ToqueDeHoy[]> {
  const plantillas = await listarPlantillas();
  const plantillaDe = (estado: EstadoCadencia, toqueN: number) =>
    plantillas.find((p) => p.estado_cadencia === estado && p.toque_n === toqueN && p.activa);

  if (!supabaseConfigurado()) {
    // Muestra: sintetiza 3 toques desde clientes de ejemplo.
    return CLIENTES_MUESTRA.slice(0, 3).map((c, i) => {
      const estado: EstadoCadencia = (["caliente", "cotizado", "frio"] as const)[i];
      const toqueN = 1;
      const pl = plantillaDe(estado, toqueN);
      return armarToque(c, estado, toqueN, pl);
    });
  }

  const supabase = await createClient();
  const ahora = new Date().toISOString();
  const { data, error } = await supabase
    .from("cliente")
    .select("id, nombre, telefono, interes, estado_cadencia, cadencia_toque_n, fecha_propuesta, escalado, es_simulacion")
    .not("estado_cadencia", "is", null)
    .in("estado_cadencia", ESTADOS_ACTIVOS)
    .eq("cadencia_pausada", false)
    .eq("escalado", false)
    .lte("proximo_toque_at", ahora)
    .order("proximo_toque_at", { ascending: true })
    .limit(200);
  if (error) throw error;

  const salida: ToqueDeHoy[] = [];
  for (const c of data ?? []) {
    const estado = c.estado_cadencia as EstadoCadencia;
    const toqueN = (c.cadencia_toque_n ?? 0) + 1;
    const pl = plantillaDe(estado, toqueN);
    if (!pl) continue; // sin plantilla para ese toque → el motor lo transiciona
    salida.push(armarToque(c as unknown as Cliente, estado, toqueN, pl));
  }
  return salida;
}

function armarToque(
  c: Pick<Cliente, "id" | "nombre" | "telefono" | "interes" | "fecha_propuesta" | "escalado" | "es_simulacion">,
  estado: EstadoCadencia,
  toqueN: number,
  pl: PlantillaCadencia | undefined,
): ToqueDeHoy {
  const t = texto(pl, { nombre: c.nombre, interes: c.interes, fecha_propuesta: c.fecha_propuesta });
  return {
    cliente_id: c.id,
    nombre: c.nombre,
    telefono: c.telefono,
    interes: c.interes,
    estado_cadencia: estado,
    toque_n: toqueN,
    arquetipo: pl?.arquetipo ?? null,
    plantilla_id: pl?.id ?? null,
    variante: pl?.variante ?? null,
    texto: t,
    pendiente_contenido: pl?.pendiente_contenido ?? false,
    wa_link: waMeLink(c.telefono, t),
    escalado: Boolean(c.escalado),
    es_simulacion: Boolean(c.es_simulacion),
  };
}

/** Leads por estado de cadencia (kanban). Solo los que están en cadencia. */
export async function kanbanCadencias(): Promise<Record<EstadoCadencia, LeadCadencia[]>> {
  const base = Object.fromEntries(
    ESTADOS_CADENCIA.map((e) => [e, [] as LeadCadencia[]]),
  ) as Record<EstadoCadencia, LeadCadencia[]>;

  if (!supabaseConfigurado()) {
    for (const c of CLIENTES_MUESTRA) {
      const estado = cadenciaDesdePipeline(c.estado_pipeline);
      base[estado].push({
        id: c.id,
        nombre: c.nombre,
        telefono: c.telefono,
        interes: c.interes,
        estado_cadencia: estado,
        cadencia_toque_n: 0,
        proximo_toque_at: null,
        cadencia_pausada: false,
        escalado: false,
        es_simulacion: false,
      });
    }
    return base;
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cliente")
    .select("id, nombre, telefono, interes, estado_cadencia, cadencia_toque_n, proximo_toque_at, cadencia_pausada, escalado, es_simulacion")
    .not("estado_cadencia", "is", null)
    .order("proximo_toque_at", { ascending: true, nullsFirst: false })
    .limit(500);
  if (error) throw error;
  for (const c of data ?? []) {
    const estado = c.estado_cadencia as EstadoCadencia;
    if (!base[estado]) continue;
    base[estado].push({
      id: c.id,
      nombre: c.nombre,
      telefono: c.telefono,
      interes: c.interes,
      estado_cadencia: estado,
      cadencia_toque_n: c.cadencia_toque_n ?? 0,
      proximo_toque_at: c.proximo_toque_at ?? null,
      cadencia_pausada: Boolean(c.cadencia_pausada),
      escalado: Boolean(c.escalado),
      es_simulacion: Boolean(c.es_simulacion),
    });
  }
  return base;
}

/* Muestra de plantillas para local (subconjunto del seed 0040). */
const PLANTILLAS_MUESTRA: PlantillaCadencia[] = [
  { id: "p-cal-1", estado_cadencia: "caliente", toque_n: 1, arquetipo: "continuidad", variante: "A", texto: "Hola {nombre}, seguí pensando en lo de {interes}. ¿Cómo vas con la decisión?", offset_horas: 0, activa: true, pendiente_contenido: false },
  { id: "p-cot-1", estado_cadencia: "cotizado", toque_n: 1, arquetipo: "continuidad", variante: "A", texto: "Hola {nombre}, ¿qué te pareció lo que vimos? Quedo al pendiente de tus dudas.", offset_horas: 24, activa: true, pendiente_contenido: false },
  { id: "p-frio-1", estado_cadencia: "frio", toque_n: 1, arquetipo: "reactivacion", variante: "A", texto: "Hola {nombre}, ¿cómo vas con lo de {interes}? Aquí seguimos por si retomas.", offset_horas: 168, activa: true, pendiente_contenido: false },
];

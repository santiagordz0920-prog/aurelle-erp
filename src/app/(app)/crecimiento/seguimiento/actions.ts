"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import {
  type EstadoCadencia,
  estadoTrasAgotarCadencia,
  cadenciaDesdePipeline,
} from "@/lib/cadencias";

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidar() {
  revalidatePath("/crecimiento/seguimiento");
  revalidatePath("/hoy");
}

const HORA_MS = 3_600_000;

/* Plantillas (estado, toque_n, offset) para calcular cuándo cae el próximo toque. */
type Fila = { toque_n: number; offset_horas: number };
async function offsets(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  estado: EstadoCadencia,
): Promise<Fila[]> {
  const { data } = await supabase
    .from("plantilla_cadencia")
    .select("toque_n, offset_horas")
    .eq("estado_cadencia", estado)
    .eq("activa", true)
    .order("toque_n");
  return (data ?? []) as Fila[];
}

/**
 * Programa el próximo toque del lead tras enviar el toque `enviadoN` (0 = recién
 * activado, aún sin toques). Si ya no quedan toques en el estado, transiciona
 * al siguiente (casi todos → frío; frío → descartado) y arma su primer toque.
 * Offsets acumulados desde que entra al estado → el delta es la espera real.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function programarSiguiente(supabase: any, clienteId: string, estado: EstadoCadencia, enviadoN: number) {
  const filas = await offsets(supabase, estado);
  const actualOffset = enviadoN === 0 ? 0 : filas.find((f) => f.toque_n === enviadoN)?.offset_horas ?? 0;
  const siguiente = filas.find((f) => f.toque_n > enviadoN);

  if (siguiente) {
    const esperaH = Math.max(0, siguiente.offset_horas - actualOffset);
    const proximo = new Date(Date.now() + esperaH * HORA_MS).toISOString();
    await supabase
      .from("cliente")
      .update({ estado_cadencia: estado, cadencia_toque_n: enviadoN, proximo_toque_at: proximo })
      .eq("id", clienteId);
    return;
  }

  // Se agotó la cadencia del estado: transicionar.
  const destino = estadoTrasAgotarCadencia(estado);
  if (!destino) {
    // Terminal o anclado a cita: solo deja de haber próximo toque.
    await supabase.from("cliente").update({ proximo_toque_at: null }).eq("id", clienteId);
    return;
  }
  const filasDestino = await offsets(supabase, destino);
  const primero = filasDestino[0];
  const proximo = primero
    ? new Date(Date.now() + primero.offset_horas * HORA_MS).toISOString()
    : null;
  await supabase
    .from("cliente")
    .update({ estado_cadencia: destino, cadencia_toque_n: 0, proximo_toque_at: proximo, cadencia_pausada: false })
    .eq("id", clienteId);
}

/** Activa el follow-up de un lead (desde su etapa de pipeline si no se indica). */
export async function activarCadencia(
  clienteId: string,
  estado?: EstadoCadencia,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { data: cli } = await supabase
    .from("cliente")
    .select("estado_pipeline")
    .eq("id", clienteId)
    .maybeSingle();
  const est = estado ?? cadenciaDesdePipeline(cli?.estado_pipeline ?? "nuevo");
  const { error } = await supabase
    .from("cliente")
    .update({ estado_cadencia: est, cadencia_toque_n: 0, cadencia_pausada: false, escalado: false })
    .eq("id", clienteId);
  if (error) return { ok: false, error: "No se pudo activar el seguimiento." };
  await programarSiguiente(supabase, clienteId, est, 0);
  revalidar();
  return { ok: true };
}

/** Registra que se envió el toque (copiar/pegar o wa.me) y avanza el motor. */
export async function marcarToqueEnviado(input: {
  clienteId: string;
  estado: EstadoCadencia;
  toqueN: number;
  arquetipo: string;
  plantillaId: string | null;
  variante: string | null;
  texto: string;
  canal?: string;
}): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const usuario = await getUsuarioActual();

  const { data: cli } = await supabase
    .from("cliente")
    .select("es_simulacion")
    .eq("id", input.clienteId)
    .maybeSingle();

  const { error } = await supabase.from("toque").insert({
    cliente_id: input.clienteId,
    estado_cadencia: input.estado,
    toque_n: input.toqueN,
    arquetipo: input.arquetipo,
    plantilla_id: input.plantillaId,
    variante: input.variante,
    canal: input.canal ?? "manual",
    texto_enviado: input.texto,
    enviado_por: usuario.id,
    es_simulacion: Boolean(cli?.es_simulacion),
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo registrar el toque." };
  await programarSiguiente(supabase, input.clienteId, input.estado, input.toqueN);
  revalidar();
  return { ok: true };
}

/** Escala un lead (2ct+, presupuesto alto…): detiene su cadencia. */
export async function escalarLead(clienteId: string, escalar = true): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("cliente")
    .update({ escalado: escalar, proximo_toque_at: escalar ? null : new Date().toISOString() })
    .eq("id", clienteId);
  if (error) return { ok: false, error: "No se pudo actualizar el escalamiento." };
  revalidar();
  return { ok: true };
}

/** Mueve un lead a otra columna del kanban (override manual) y re-arma toques. */
export async function moverEstadoCadencia(
  clienteId: string,
  estado: EstadoCadencia,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    revalidar();
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("cliente")
    .update({ estado_cadencia: estado, cadencia_toque_n: 0, cadencia_pausada: false })
    .eq("id", clienteId);
  if (error) return { ok: false, error: "No se pudo mover el lead." };
  await programarSiguiente(supabase, clienteId, estado, 0);
  revalidar();
  return { ok: true };
}

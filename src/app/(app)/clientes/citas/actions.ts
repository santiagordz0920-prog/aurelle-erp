"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Cita, EstadoCita, ResultadoCita, TipoCita } from "@/lib/citas";
import { seTraslapan, fechaMonterrey, TIPO_CITA } from "@/lib/citas";
import type { EstadoPipeline } from "@/lib/clientes";
import { PIPELINE_ORDEN } from "@/lib/clientes";
import { CITAS_MUESTRA } from "@/lib/data/citas-muestra";
import { CLIENTES_MUESTRA } from "@/lib/data/clientes-muestra";
import { TAREAS_MUESTRA } from "@/lib/data/tareas-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

// Monterrey es UTC-6 todo el año (México sin horario de verano desde 2022).
const OFFSET_MTY = "-06:00";

const citaSchema = z.object({
  cliente_id: z.string().uuid("Elige un cliente."),
  tipo: z.enum([
    "primera_visita",
    "seguimiento",
    "cierre",
    "entrega",
    "postventa",
    "noche_privada",
  ]),
  sala: z.enum(["piso_ventas", "closing_room"]),
  cuando: z.string().min(10, "Elige fecha y hora."), // datetime-local: YYYY-MM-DDTHH:mm
  duracion_min: z.coerce.number().int().min(15).max(480).default(60),
  notas: z.string().trim().optional().nullable(),
});

function revalidar(clienteId?: string) {
  revalidatePath("/clientes/citas");
  revalidatePath("/hoy");
  if (clienteId) revalidatePath(`/clientes/${clienteId}`);
}

export async function agendarCita(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = citaSchema.safeParse({
    cliente_id: formData.get("cliente_id"),
    tipo: formData.get("tipo"),
    sala: formData.get("sala"),
    cuando: formData.get("cuando"),
    duracion_min: (formData.get("duracion_min") as string) || 60,
    notas: (formData.get("notas") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const inicio = new Date(`${d.cuando}:00${OFFSET_MTY}`).toISOString();
  const usuario = await getUsuarioActual();

  // Candado anti doble-reserva: misma sala, citas no canceladas que se traslapen.
  const mismaSala = await citasDeSala(d.sala, inicio);
  const choca = mismaSala.some(
    (c) => c.estado !== "cancelada" && seTraslapan(inicio, d.duracion_min, c.inicio, c.duracion_min),
  );
  if (choca) {
    return { ok: false, error: "Esa sala ya está ocupada a esa hora. Elige otro horario o sala." };
  }

  if (!supabaseConfigurado()) {
    const nueva: Cita = {
      id: `c4000000-0000-0000-0000-0000000009${(CITAS_MUESTRA.length + 10).toString().slice(-2)}`,
      cliente_id: d.cliente_id,
      cliente_nombre: null,
      tipo: d.tipo,
      sala: d.sala,
      inicio,
      duracion_min: d.duracion_min,
      estado: "agendada",
      resultado: null,
      pedido_id: null,
      notas: d.notas ?? null,
      creada_por: usuario.id,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    CITAS_MUESTRA.push(nueva);
    await crearTareaPreparacion(d.cliente_id, d.tipo, inicio);
    revalidar(d.cliente_id);
    revalidatePath("/hoy/tareas");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("cita").insert({
    cliente_id: d.cliente_id,
    tipo: d.tipo,
    sala: d.sala,
    inicio,
    duracion_min: d.duracion_min,
    notas: d.notas ?? null,
    creada_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo agendar la cita." };
  // Enganche §3.15 (espíritu): la cita nueva sugiere una tarea de preparación.
  await crearTareaPreparacion(d.cliente_id, d.tipo, inicio);
  revalidar(d.cliente_id);
  revalidatePath("/hoy/tareas");
  return { ok: true };
}

/**
 * Cita agendada → tarea SUGERIDA de preparación (ligada al cliente, vence el día
 * de la cita). Aparece en "Sugerencias nuevas" de Hoy para aceptar/descartar en
 * un toque. Una por cliente pendiente (no duplica si ya hay una sin atender).
 */
async function crearTareaPreparacion(clienteId: string, tipo: TipoCita, inicioISO: string) {
  const usuario = await getUsuarioActual();
  const vence = fechaMonterrey(new Date(inicioISO));
  const etiquetaTipo = TIPO_CITA[tipo].etiqueta;
  const PREFIJO = "Preparar cita";

  if (!supabaseConfigurado()) {
    const cli = CLIENTES_MUESTRA.find((c) => c.id === clienteId);
    const yaHay = TAREAS_MUESTRA.some(
      (t) =>
        t.entidad_tipo === "cliente" &&
        t.entidad_id === clienteId &&
        t.estado === "pendiente" &&
        !t.descartada &&
        t.titulo.startsWith(PREFIJO),
    );
    if (yaHay) return;
    TAREAS_MUESTRA.unshift({
      id: `d1000000-0000-0000-0000-0000000009${(TAREAS_MUESTRA.length + 30).toString().slice(-2)}`,
      titulo: `${PREFIJO}: ${cli?.nombre ?? "cliente"} (${etiquetaTipo})`,
      detalle: "Prepara diseños, opciones y upsells antes de la cita.",
      responsable_id: usuario.id,
      responsable_nombre: null,
      prioridad: "media",
      estado: "pendiente",
      fecha_vencimiento: vence,
      entidad_tipo: "cliente",
      entidad_id: clienteId,
      origen: "sugerida",
      descartada: false,
      completada_at: null,
      creada_por: usuario.id,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    return;
  }

  const supabase = await createClient();
  const { data: existentes } = await supabase
    .from("tarea")
    .select("id")
    .eq("entidad_tipo", "cliente")
    .eq("entidad_id", clienteId)
    .eq("estado", "pendiente")
    .eq("descartada", false)
    .ilike("titulo", `${PREFIJO}%`)
    .limit(1);
  if (existentes && existentes.length > 0) return;
  const { data: cli } = await supabase
    .from("cliente")
    .select("nombre")
    .eq("id", clienteId)
    .maybeSingle();
  await supabase.from("tarea").insert({
    titulo: `${PREFIJO}: ${cli?.nombre ?? "cliente"} (${etiquetaTipo})`,
    detalle: "Prepara diseños, opciones y upsells antes de la cita.",
    responsable_id: usuario.id,
    prioridad: "media",
    fecha_vencimiento: vence,
    entidad_tipo: "cliente",
    entidad_id: clienteId,
    origen: "sugerida",
    creada_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
}

/** Citas del mismo día y sala (para el chequeo de traslape). */
async function citasDeSala(sala: string, inicioISO: string): Promise<Cita[]> {
  const dia = inicioISO.slice(0, 10);
  const desde = `${dia}T00:00:00Z`;
  const hasta = new Date(new Date(desde).getTime() + 86400000).toISOString();
  if (!supabaseConfigurado()) {
    return CITAS_MUESTRA.filter(
      (c) => c.sala === sala && c.inicio >= desde && c.inicio < hasta,
    );
  }
  const supabase = await createClient();
  const { data } = await supabase
    .from("cita")
    .select("*")
    .eq("sala", sala)
    .gte("inicio", desde)
    .lt("inicio", hasta);
  return (data ?? []) as Cita[];
}

export async function cambiarEstadoCita(
  id: string,
  estado: EstadoCita,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const c = CITAS_MUESTRA.find((x) => x.id === id);
    if (c) c.estado = estado;
    revalidar(c?.cliente_id);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase.from("cita").update({ estado }).eq("id", id);
  if (error) return { ok: false, error: "No se pudo actualizar la cita." };
  revalidar();
  return { ok: true };
}

/*
  Reacción §4 "Resultado de cita registrado → CRM actualiza pipeline":
  el resultado de la visita mueve al cliente en el funnel (SOLO hacia adelante).
  no-show no cambia el pipeline; en su lugar deja una tarea de reagendar
  (lifecycle de re-engagement, versión sin WhatsApp).
*/
const RESULTADO_A_PIPELINE: Partial<Record<ResultadoCita, EstadoPipeline>> = {
  asistio: "visito",
  cotizo: "cotizado",
  cerro: "cerrado",
};
const PREFIJO_REAGENDAR = "Reagendar (no-show)";

/** Avanza el pipeline del cliente por el resultado, solo si es hacia adelante. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function avanzarPipeline(supabase: any, clienteId: string, resultado: ResultadoCita) {
  const destino = RESULTADO_A_PIPELINE[resultado];
  if (!destino) return;
  const { data: cli } = await supabase
    .from("cliente")
    .select("estado_pipeline")
    .eq("id", clienteId)
    .maybeSingle();
  if (!cli) return;
  const actualIdx = PIPELINE_ORDEN.indexOf(cli.estado_pipeline as EstadoPipeline);
  const destinoIdx = PIPELINE_ORDEN.indexOf(destino);
  // Solo avanza; no retrocede ni resucita un 'perdido' (fuera de PIPELINE_ORDEN → -1).
  if (actualIdx >= 0 && destinoIdx > actualIdx) {
    await supabase.from("cliente").update({ estado_pipeline: destino }).eq("id", clienteId);
  }
}

/** No-show → tarea sugerida de reagendar (idempotente por cliente pendiente). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function tareaReagendar(supabase: any, clienteId: string) {
  const usuario = await getUsuarioActual();
  const { data: existentes } = await supabase
    .from("tarea")
    .select("id")
    .eq("entidad_tipo", "cliente")
    .eq("entidad_id", clienteId)
    .eq("estado", "pendiente")
    .ilike("titulo", `${PREFIJO_REAGENDAR}%`)
    .limit(1);
  if (existentes && existentes.length > 0) return;
  const { data: cli } = await supabase
    .from("cliente")
    .select("nombre")
    .eq("id", clienteId)
    .maybeSingle();
  await supabase.from("tarea").insert({
    titulo: `${PREFIJO_REAGENDAR}: ${cli?.nombre ?? "cliente"}`,
    detalle: "El cliente no asistió a su cita. Contáctalo para reagendar y no perder el lead.",
    responsable_id: usuario.id,
    prioridad: "media",
    entidad_tipo: "cliente",
    entidad_id: clienteId,
    origen: "sugerida",
    creada_por: usuario.id,
    sucursal_id: usuario.sucursalId,
  });
}

/** Captura del resultado (el funnel). Marca la cita como completada. */
export async function registrarResultado(
  id: string,
  resultado: ResultadoCita,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const c = CITAS_MUESTRA.find((x) => x.id === id);
    if (c) {
      c.resultado = resultado;
      c.estado = "completada";
      // Reacción §4 en muestra: mover pipeline (solo adelante) o dejar tarea de reagendar.
      const cli = CLIENTES_MUESTRA.find((x) => x.id === c.cliente_id);
      const destino = RESULTADO_A_PIPELINE[resultado];
      if (cli && destino) {
        const ai = PIPELINE_ORDEN.indexOf(cli.estado_pipeline);
        const di = PIPELINE_ORDEN.indexOf(destino);
        if (ai >= 0 && di > ai) cli.estado_pipeline = destino;
      } else if (cli && resultado === "no_asistio") {
        const dup = TAREAS_MUESTRA.some(
          (t) =>
            t.entidad_tipo === "cliente" &&
            t.entidad_id === cli.id &&
            t.estado === "pendiente" &&
            t.titulo.startsWith(PREFIJO_REAGENDAR),
        );
        if (!dup) {
          const usuario = await getUsuarioActual();
          TAREAS_MUESTRA.unshift({
            id: `d1000000-0000-0000-0000-0000000009${(TAREAS_MUESTRA.length + 60).toString().slice(-2)}`,
            titulo: `${PREFIJO_REAGENDAR}: ${cli.nombre}`,
            detalle: "El cliente no asistió a su cita. Contáctalo para reagendar y no perder el lead.",
            responsable_id: usuario.id,
            responsable_nombre: null,
            prioridad: "media",
            estado: "pendiente",
            fecha_vencimiento: null,
            entidad_tipo: "cliente",
            entidad_id: cli.id,
            origen: "sugerida",
            completada_at: null,
            creada_por: usuario.id,
            sucursal_id: usuario.sucursalId,
            created_at: new Date().toISOString(),
            updated_at: new Date().toISOString(),
          });
        }
      }
    }
    revalidar(c?.cliente_id);
    return { ok: true };
  }
  const supabase = await createClient();
  const { data: cita, error } = await supabase
    .from("cita")
    .update({ resultado, estado: "completada" })
    .eq("id", id)
    .select("cliente_id")
    .maybeSingle();
  if (error) return { ok: false, error: "No se pudo registrar el resultado." };
  // Reacción §4: resultado → pipeline del cliente; no-show → tarea de reagendar.
  if (cita?.cliente_id) {
    if (resultado === "no_asistio") {
      await tareaReagendar(supabase, cita.cliente_id);
    } else {
      await avanzarPipeline(supabase, cita.cliente_id, resultado);
    }
    revalidar(cita.cliente_id);
    revalidatePath("/hoy/tareas");
  } else {
    revalidar();
  }
  return { ok: true };
}

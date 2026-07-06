"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Cita, EstadoCita, ResultadoCita } from "@/lib/citas";
import { seTraslapan } from "@/lib/citas";
import { CITAS_MUESTRA } from "@/lib/data/citas-muestra";

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
    revalidar(d.cliente_id);
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
  revalidar(d.cliente_id);
  return { ok: true };
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
    }
    revalidar(c?.cliente_id);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("cita")
    .update({ resultado, estado: "completada" })
    .eq("id", id);
  if (error) return { ok: false, error: "No se pudo registrar el resultado." };
  // Reacción §4 pendiente: resultado → pipeline del cliente; no-show → lifecycle.
  revalidar();
  return { ok: true };
}

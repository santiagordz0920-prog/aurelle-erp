"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { enviarTextoWa, whatsappConfigurado } from "@/lib/whatsapp";

/*
  Acciones del Inbox con el riel VIVO: responder por la Cloud API, aprobar o
  descartar un borrador de la IA, y marcar leído. El envío usa el token de
  WhatsApp (server-side); la escritura del mensaje respeta la RLS por sucursal.
*/

export type ResultadoInbox = { ok: boolean; error?: string };

/** Responde por la API oficial y guarda el mensaje saliente (autor = usuario). */
export async function responderInbox(
  conversacionId: string,
  telefono: string,
  texto: string,
): Promise<ResultadoInbox> {
  const cuerpo = (texto || "").trim();
  if (cuerpo.length === 0) return { ok: false, error: "Escribe un mensaje." };
  if (!whatsappConfigurado()) {
    return { ok: false, error: "WhatsApp no está configurado todavía." };
  }
  const usuario = await getUsuarioActual();
  const envio = await enviarTextoWa(telefono, cuerpo);
  if (!supabaseConfigurado()) return { ok: envio.ok, error: envio.error };

  const supabase = await createClient();
  const { error } = await supabase.from("mensaje").insert({
    conversacion_id: conversacionId,
    direccion: "saliente",
    tipo: "texto",
    cuerpo,
    es_ia: false,
    autor_id: usuario.id,
    estado_entrega: envio.ok ? "enviado" : "error",
    wa_id: envio.wa_id ?? null,
  });
  if (error) return { ok: false, error: "No se pudo guardar el mensaje." };
  await supabase
    .from("conversacion")
    .update({ ultimo_at: new Date().toISOString(), no_leidos: 0 })
    .eq("id", conversacionId);
  revalidatePath(`/clientes/inbox/${conversacionId}`);
  revalidatePath("/clientes/inbox");
  if (!envio.ok) return { ok: false, error: envio.error ?? "No se pudo enviar." };
  return { ok: true };
}

/** Aprueba un borrador de la IA: lo envía por la API y lo marca enviado. */
export async function aprobarBorrador(mensajeId: string): Promise<ResultadoInbox> {
  if (!whatsappConfigurado()) {
    return { ok: false, error: "WhatsApp no está configurado todavía." };
  }
  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  const { data: msg } = await supabase
    .from("mensaje")
    .select("id, cuerpo, conversacion_id, estado_entrega, conversacion(telefono)")
    .eq("id", mensajeId)
    .maybeSingle();
  if (!msg) return { ok: false, error: "Borrador no encontrado." };
  if (msg.estado_entrega !== "borrador_ia") {
    return { ok: false, error: "Este mensaje ya no es un borrador." };
  }
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const conv = (msg as any).conversacion;
  const telefono = Array.isArray(conv) ? conv[0]?.telefono : conv?.telefono;
  if (!telefono) return { ok: false, error: "Sin teléfono de la conversación." };

  const envio = await enviarTextoWa(telefono, msg.cuerpo ?? "");
  const { error } = await supabase
    .from("mensaje")
    .update({
      estado_entrega: envio.ok ? "enviado" : "error",
      wa_id: envio.wa_id ?? null,
      autor_id: usuario.id, // quién aprobó
    })
    .eq("id", mensajeId);
  if (error) return { ok: false, error: "No se pudo actualizar el borrador." };
  await supabase
    .from("conversacion")
    .update({ ultimo_at: new Date().toISOString() })
    .eq("id", msg.conversacion_id);
  revalidatePath(`/clientes/inbox/${msg.conversacion_id}`);
  revalidatePath("/clientes/inbox");
  if (!envio.ok) return { ok: false, error: envio.error ?? "No se pudo enviar." };
  return { ok: true };
}

/** Descarta un borrador de la IA (lo elimina; no se envió nunca). */
export async function descartarBorrador(mensajeId: string): Promise<ResultadoInbox> {
  const supabase = await createClient();
  const { data: msg } = await supabase
    .from("mensaje")
    .select("id, conversacion_id, estado_entrega")
    .eq("id", mensajeId)
    .maybeSingle();
  if (!msg) return { ok: false, error: "Borrador no encontrado." };
  if (msg.estado_entrega !== "borrador_ia") {
    return { ok: false, error: "Este mensaje ya no es un borrador." };
  }
  const { error } = await supabase.from("mensaje").delete().eq("id", mensajeId);
  if (error) return { ok: false, error: "No se pudo descartar." };
  revalidatePath(`/clientes/inbox/${msg.conversacion_id}`);
  return { ok: true };
}

/** Marca la conversación como leída (no_leidos = 0). */
export async function marcarLeido(conversacionId: string): Promise<ResultadoInbox> {
  if (!supabaseConfigurado()) return { ok: true };
  const supabase = await createClient();
  await supabase.from("conversacion").update({ no_leidos: 0 }).eq("id", conversacionId);
  revalidatePath("/clientes/inbox");
  return { ok: true };
}

import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { MensajeEntrante, EstadoSaliente } from "@/lib/whatsapp";

/*
  Escritura del riel de WhatsApp (webhook). Usa el cliente service_role porque el
  webhook no tiene sesión de usuario; la ruta se protege con el verify token y la
  firma de Meta. Regla §3.1: el teléfono es el identificador — un mensaje entrante
  encuentra o CREA al cliente y a la conversación.
*/

const SUCURSAL_DEFAULT = "00000000-0000-0000-0000-000000000001";

/** Últimos 10 dígitos de un teléfono (para casar formatos MX: 52 / 521 / 10). */
function ultimos10(tel: string): string {
  return (tel || "").replace(/\D/g, "").slice(-10);
}

export type ResultadoEntrante = {
  duplicado: boolean;
  conversacionId: string;
  clienteId: string | null;
  clienteNombre: string | null;
  esNuevoCliente: boolean;
};

/**
 * Registra un mensaje entrante: dedup por wa_id, encuentra/crea cliente y
 * conversación por teléfono, inserta el mensaje, sube no_leidos y ultimo_at.
 * Devuelve datos para que el bot decida si responde.
 */
export async function registrarEntrante(m: MensajeEntrante): Promise<ResultadoEntrante | null> {
  const supabase = createAdminClient();

  // 1) Dedup: si ya guardamos este wa_id, no repetir (Meta reintenta el webhook).
  if (m.wa_id) {
    const { data: existe } = await supabase
      .from("mensaje")
      .select("id, conversacion_id")
      .eq("wa_id", m.wa_id)
      .maybeSingle();
    if (existe) {
      return {
        duplicado: true,
        conversacionId: existe.conversacion_id,
        clienteId: null,
        clienteNombre: null,
        esNuevoCliente: false,
      };
    }
  }

  // 2) Encontrar/crear cliente por teléfono (últimos 10 dígitos).
  const last10 = ultimos10(m.telefono);
  let clienteId: string | null = null;
  let clienteNombre: string | null = null;
  let esNuevoCliente = false;
  if (last10) {
    const { data: cli } = await supabase
      .from("cliente")
      .select("id, nombre")
      .ilike("telefono", `%${last10}`)
      .limit(1)
      .maybeSingle();
    if (cli) {
      clienteId = cli.id;
      clienteNombre = cli.nombre;
    } else {
      const { data: nuevo } = await supabase
        .from("cliente")
        .insert({
          nombre: m.nombre_perfil ?? `WhatsApp ${last10}`,
          telefono: m.telefono,
          fuente_canal: "organico",
          sucursal_id: SUCURSAL_DEFAULT,
        })
        .select("id, nombre")
        .maybeSingle();
      if (nuevo) {
        clienteId = nuevo.id;
        clienteNombre = nuevo.nombre;
        esNuevoCliente = true;
      }
    }
  }

  // 3) Encontrar/crear conversación por teléfono (identificador natural).
  const { data: conv } = await supabase
    .from("conversacion")
    .select("id, no_leidos, cliente_id")
    .eq("sucursal_id", SUCURSAL_DEFAULT)
    .eq("telefono", m.telefono)
    .maybeSingle();

  let conversacionId: string;
  if (conv) {
    conversacionId = conv.id;
    await supabase
      .from("conversacion")
      .update({
        no_leidos: (conv.no_leidos ?? 0) + 1,
        ultimo_at: new Date().toISOString(),
        cliente_id: conv.cliente_id ?? clienteId,
        estado: "abierta",
      })
      .eq("id", conversacionId);
  } else {
    const { data: nuevaConv } = await supabase
      .from("conversacion")
      .insert({
        telefono: m.telefono,
        cliente_id: clienteId,
        no_leidos: 1,
        ultimo_at: new Date().toISOString(),
        sucursal_id: SUCURSAL_DEFAULT,
      })
      .select("id")
      .single();
    conversacionId = nuevaConv!.id;
  }

  // 4) Insertar el mensaje entrante.
  await supabase.from("mensaje").insert({
    conversacion_id: conversacionId,
    direccion: "entrante",
    tipo: m.tipo,
    cuerpo: m.cuerpo,
    wa_id: m.wa_id,
  });

  return { duplicado: false, conversacionId, clienteId, clienteNombre, esNuevoCliente };
}

/** Actualiza el estado de entrega de un mensaje saliente (por wa_id). */
export async function actualizarEstadoSaliente(e: EstadoSaliente): Promise<void> {
  const supabase = createAdminClient();
  await supabase
    .from("mensaje")
    .update({ estado_entrega: e.estado })
    .eq("wa_id", e.wa_id)
    .eq("direccion", "saliente");
}

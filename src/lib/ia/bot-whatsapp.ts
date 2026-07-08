import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, iaConfigurada, MODELO_IA } from "./anthropic";
import { enviarTextoWa } from "@/lib/whatsapp";

/*
  Bot de WhatsApp con IA (§4: "Mensaje entrante → IA clasifica; si sensible →
  cola humana"). Al llegar un mensaje del cliente:
   1. Lee el hilo reciente como contexto.
   2. Pide a Claude que clasifique + redacte una respuesta en tono Aurelle.
   3. Si es SENSIBLE (2ct+, queja, negociación, compromiso, o duda) → guarda la
      respuesta como BORRADOR (estado 'borrador_ia') para que un humano la apruebe;
      NO la envía.
   4. Si es segura → la envía por la Cloud API y la guarda como mensaje saliente
      de IA (es_ia).
  Corre en background desde el webhook (Next `after`), así el webhook responde
  200 rápido a Meta.
*/

const SISTEMA = `Eres la asistente de WhatsApp de Aurelle & Co., joyería de compromiso premium en Monterrey (showroom Ellion). Atiendes a clientes que escriben interesados en anillos de compromiso y piezas a la medida.

Tono Aurelle: cálido, cercano y sobrio; español de México, natural, sin exagerar. Breve (1-3 frases), como un mensaje de WhatsApp real. Nunca suenes a robot ni uses lenguaje corporativo. Puedes usar el nombre del cliente si lo tienes.

Tu objetivo es acompañar y, cuando tenga sentido, invitar a agendar una visita al showroom (es gratis y sin compromiso) o a compartir lo que busca (estilo, presupuesto aproximado, fecha). Haz UNA pregunta a la vez.

REGLAS DURAS:
- NUNCA des precios, cotizaciones, ni montos. NUNCA prometas fechas de entrega, descuentos ni condiciones.
- NUNCA inventes disponibilidad de piedras ni características técnicas.
- Si no estás segura, marca el mensaje como sensible y deja que un humano responda.

Marca sensible=true cuando el mensaje implique: piedra central grande o de alto valor (2 quilates o más), negociación de precio o descuento, una queja/inconformidad/reclamo, algo que requiera un compromiso (precio, fecha, garantía), datos legales, o cualquier caso donde una persona del equipo deba decidir. En esos casos igual redacta una respuesta propuesta (para que el humano la use o edite), pero no se enviará automáticamente.`;

const ESQUEMA = {
  type: "object" as const,
  additionalProperties: false,
  properties: {
    intencion: {
      type: "string",
      enum: [
        "saludo",
        "informacion",
        "agendar_cita",
        "cotizacion",
        "queja",
        "seguimiento",
        "otro",
      ],
    },
    sensible: { type: "boolean" },
    motivo: { type: "string" },
    respuesta: { type: "string" },
  },
  required: ["intencion", "sensible", "motivo", "respuesta"],
};

type SalidaBot = {
  intencion: string;
  sensible: boolean;
  motivo: string;
  respuesta: string;
};

export type EntradaBot = {
  conversacionId: string;
  clienteId: string | null;
  clienteNombre: string | null;
  telefono: string;
  texto: string;
};

/** Historial reciente del hilo como turnos user/assistant (sin borradores). */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function historial(supabase: any, conversacionId: string) {
  const { data } = await supabase
    .from("mensaje")
    .select("direccion, cuerpo, estado_entrega, created_at")
    .eq("conversacion_id", conversacionId)
    .order("created_at", { ascending: true })
    .limit(14);
  const msgs: { role: "user" | "assistant"; content: string }[] = [];
  for (const m of data ?? []) {
    if (!m.cuerpo) continue;
    if (m.estado_entrega === "borrador_ia") continue; // borradores no enviados
    msgs.push({
      role: m.direccion === "entrante" ? "user" : "assistant",
      content: String(m.cuerpo).slice(0, 1500),
    });
  }
  // La API exige que el primer turno sea 'user'.
  while (msgs.length && msgs[0].role !== "user") msgs.shift();
  return msgs;
}

export async function responderConBot(entrada: EntradaBot): Promise<void> {
  if (!iaConfigurada()) return; // sin IA, el humano responde desde el Inbox
  const supabase = createAdminClient();

  let salida: SalidaBot;
  try {
    const mensajes = await historial(supabase, entrada.conversacionId);
    if (mensajes.length === 0) {
      mensajes.push({ role: "user", content: entrada.texto.slice(0, 1500) });
    }
    const contexto = entrada.clienteNombre
      ? `El cliente se llama ${entrada.clienteNombre}.`
      : "Aún no sabemos el nombre del cliente.";

    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: MODELO_IA,
      max_tokens: 700,
      system: `${SISTEMA}\n\nContexto: ${contexto}`,
      output_config: { format: { type: "json_schema", schema: ESQUEMA } },
      messages: mensajes,
    });
    const bloque = resp.content.find((b) => b.type === "text");
    if (!bloque || bloque.type !== "text") return;
    salida = JSON.parse(bloque.text) as SalidaBot;
  } catch {
    // Si la IA falla, no rompemos el riel: el mensaje ya está guardado y un
    // humano puede responder desde el Inbox.
    return;
  }

  const respuesta = (salida.respuesta || "").trim();
  if (!respuesta) return;

  if (salida.sensible) {
    // Cola humana: guardar como borrador para aprobar/editar, NO enviar.
    await supabase.from("mensaje").insert({
      conversacion_id: entrada.conversacionId,
      direccion: "saliente",
      tipo: "texto",
      cuerpo: respuesta,
      es_ia: true,
      estado_entrega: "borrador_ia",
    });
    return;
  }

  // Respuesta segura: enviar por la Cloud API y guardar como saliente de IA.
  const envio = await enviarTextoWa(entrada.telefono, respuesta);
  await supabase.from("mensaje").insert({
    conversacion_id: entrada.conversacionId,
    direccion: "saliente",
    tipo: "texto",
    cuerpo: respuesta,
    es_ia: true,
    estado_entrega: envio.ok ? "enviado" : "error",
    wa_id: envio.wa_id ?? null,
  });
}

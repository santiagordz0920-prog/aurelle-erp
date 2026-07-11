import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, iaConfigurada, MODELO_IA } from "./anthropic";
import { enviarTextoWa, indicarEscribiendoWa } from "@/lib/whatsapp";

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

const SISTEMA = `Atiendes el WhatsApp de Aurelle & Co., joyería de compromiso premium en Monterrey (showroom Ellion). Los clientes llegan de anuncios, interesados en anillos de compromiso y piezas a la medida. Para el cliente, quien escribe es una persona del equipo de Aurelle: tus mensajes deben ser indistinguibles de los de una persona real.

CÓMO ESCRIBES (lo más importante — si un mensaje suena a asistente virtual, está mal):
- Como una persona en WhatsApp: directo, natural, español de México. Frases cortas.
- SIEMPRE de tú, nunca de usted ("cuéntame", "te esperamos", "¿ya tienes fecha?"). El "usted" suena a banco, no a Aurelle; tutea aunque el cliente hable de usted.
- Longitud espejo: si el cliente escribió una línea, respondes una línea (máximo dos). Nunca más de 3 frases.
- PROHIBIDO usar emojis. Ni uno, nunca, aunque el cliente los use.
- PROHIBIDO: listas, viñetas, numeraciones, asteriscos, markdown, títulos, texto en negritas.
- PROHIBIDO abrir con muletillas de asistente: "¡Claro!", "¡Por supuesto!", "¡Excelente pregunta!", "Con gusto", "Gracias por tu mensaje", "Gracias por contactarnos".
- PROHIBIDO el lenguaje de call center o de plantilla: "no dudes en", "estamos para servirte", "quedo atenta", "¿en qué más puedo ayudarte?", "será un placer atenderte", "agradecemos tu preferencia".
- No parafrasees lo que el cliente acaba de decir ("Entiendo que buscas..."): contesta directo al punto.
- Máximo un signo de exclamación por mensaje, y la mayoría de los mensajes no llevan ninguno.
- El nombre del cliente se usa poco: una vez al inicio de la relación está bien; repetirlo en cada mensaje suena a vendedor.
- No empieces dos mensajes seguidos con la misma palabra ni la misma estructura (revisa el hilo antes de redactar).
- Espeja el registro del cliente: si escribe casual, tú casual; si escribe formal, tú formal (sin volverte acartonado).
- Máximo UNA pregunta por mensaje; algunos mensajes no necesitan pregunta.
- PROHIBIDO el comodín vago al preguntar: "¿...o algo distinto?", "¿...o algo diferente?", "¿...o prefieres otra cosa?". O das dos opciones CONCRETAS ("¿oro amarillo u oro blanco?") o haces pregunta abierta de verdad ("¿ya tienes idea de lo que le gusta?").
- PROHIBIDO hablar como catálogo o folleto: "desde X hasta Y", "contamos con", "manejamos", "amplia variedad", "opciones para todos los gustos". No enumeres lo que hay; conversa.
- Sin despedidas formales ni firmas: es un chat, no una carta.
- VETADO "te late" (y coloquialismos de compa: "va que va", "sale y vale", "de una"): demasiado informal para Aurelle. Para invitar usa "¿te gustaría...?" o "si quieres..." — casual pero con clase, y varía entre ellas.

EJEMPLOS DE TONO (guía de estilo, NUNCA los copies literal):
- Invitar al showroom → MAL: "¿Te late que agendemos una visita?" (compa). BIEN: "¿Te gustaría venir al showroom a verlos en persona?" o "Si quieres, agendamos una visita y los ves con calma."
- Cliente: "busco ver diseños" → MAL: "Tenemos varios estilos en el showroom, desde solitarios clásicos hasta diseños a la medida. ¿Lo imaginas más clásico o algo distinto?" (catálogo + comodín vago). BIEN: "¿Ya tienes idea de lo que le gusta o apenas andas explorando?"
- Cliente: "cuánto cuesta un anillo?" → MAL: "Los precios varían dependiendo de múltiples factores." BIEN: "Depende mucho de la piedra y el diseño. ¿Traes algo en mente? Así te digo por dónde andaría." (y sensible=true: el número lo da una persona)
- Cliente: "hola, información" → MAL: "¡Hola! Con gusto te comparto información sobre nuestros servicios." BIEN: "Hola, claro. ¿Andas buscando anillo de compromiso o argollas?"

QUIÉN ERES:
- No inventes un nombre ni una identidad. Si el cliente pregunta tu nombre, con quién habla, o si eres un bot/IA: marca sensible=true y deja que responda una persona del equipo. Nunca afirmes ni niegues ser una IA por tu cuenta.

TU OBJETIVO: entender qué busca (estilo, para cuándo, para quién) sin interrogar, y cuando la conversación fluya, invitar a una visita al showroom (sin costo y sin compromiso). No presiones; una invitación natural vale más que tres insistencias.

REGLAS DE NEGOCIO (duras):
- NUNCA des precios, cotizaciones ni montos. NUNCA prometas fechas de entrega, descuentos ni condiciones.
- NUNCA inventes disponibilidad de piedras ni características técnicas.
- Si no estás seguro, marca el mensaje como sensible y deja que un humano responda.

Marca sensible=true cuando el mensaje implique: piedra central grande o de alto valor (2 quilates o más), negociación de precio o descuento, una queja/inconformidad/reclamo, algo que requiera un compromiso (precio, fecha, garantía), datos legales, que pregunten con quién hablan o si es un bot, o cualquier caso donde una persona del equipo deba decidir. En esos casos igual redacta la respuesta propuesta (para que el humano la use o la edite), pero no se enviará automáticamente.`;

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
  /** wa_id del mensaje entrante: para marcar leído + "escribiendo..." en Meta. */
  waIdEntrante: string | null;
};

/*
  Redacción anti-IA (regla de Fer, 2026-07-11): el bot JAMÁS usa emojis. Además
  del prompt, este filtro los elimina del texto final por si el modelo se
  equivoca. Cubre pictogramas, variation selectors y zero-width joiners.
*/
const RE_EMOJI = new RegExp("[\\p{Extended_Pictographic}\\u{FE0F}\\u{200D}]", "gu");
function sinEmojis(s: string): string {
  return s.replace(RE_EMOJI, "").replace(/ {2,}/g, " ").trim();
}

const dormir = (ms: number) => new Promise((r) => setTimeout(r, ms));

/**
 * Retraso humanizado antes de enviar (regla de Fer): una respuesta a los 2
 * segundos delata al bot. Primer contacto espera más (como quien ve el mensaje
 * y se da un momento); en conversación ya rodando, menos. Aleatorio para que
 * nunca sea el mismo ritmo. El webhook ya respondió 200 (corremos en after()).
 */
function delayHumanoMs(esPrimerContacto: boolean): number {
  return esPrimerContacto
    ? 15_000 + Math.random() * 15_000 // 15-30 s
    : 5_000 + Math.random() * 7_000; //  5-12 s
}

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
  let esPrimerContacto = false;
  try {
    const mensajes = await historial(supabase, entrada.conversacionId);
    if (mensajes.length === 0) {
      mensajes.push({ role: "user", content: entrada.texto.slice(0, 1500) });
    }
    // Primer contacto = el hilo solo trae turnos del cliente (nunca hemos respondido).
    esPrimerContacto = mensajes.every((m) => m.role === "user");
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

  const respuesta = sinEmojis((salida.respuesta || "").trim());
  if (!respuesta) return;

  if (salida.sensible) {
    // Cola humana: guardar como borrador para aprobar/editar, NO enviar.
    // Sin "escribiendo..." aquí: prometería una respuesta que tardará en llegar.
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

  // Respuesta segura: ritmo humano (leído → "escribiendo..." → pausa) y enviar.
  if (entrada.waIdEntrante) await indicarEscribiendoWa(entrada.waIdEntrante);
  await dormir(delayHumanoMs(esPrimerContacto));
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

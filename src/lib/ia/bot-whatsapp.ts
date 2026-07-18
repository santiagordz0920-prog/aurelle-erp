import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { getAnthropic, iaConfigurada, MODELO_IA } from "./anthropic";
import { enviarTextoWa, indicarEscribiendoWa } from "@/lib/whatsapp";
import { proximosHorarios, apartarHorario } from "@/lib/data/agenda-bot";

/*
  Copiloto de WhatsApp con IA — MODELO ASISTIDO (decisión Santiago + socio,
  2026-07-18): el bot NUNCA responde solo al cliente; hace el trabajo pesado y
  deja todo listo para que un socio lo apruebe/mande. Al llegar un mensaje:
   1. Lee el hilo reciente como contexto.
   2. Pide a Claude que clasifique + redacte una respuesta sugerida en tono Aurelle,
      mantenga la ficha del lead y proponga una TAREA accionable si aplica.
   3. La respuesta SIEMPRE se guarda como BORRADOR ('borrador_ia') para aprobar/
      editar/enviar desde el Inbox (`RESPUESTAS_REQUIEREN_APROBACION`).
   4. La `tarea_sugerida` se deja como tarea sugerida en /hoy (ligada al lead).
  El auto-envío de lo "seguro" queda tras una llave por si algún día lo reactivan.
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
- VETADO "te acomoda" / "¿qué día te acomoda?". Para agendar: propón un horario disponible concreto (te lo damos en el contexto AGENDA) y remata con "¿te gustaría?" o "¿puedes ese día?"; si el cliente prefiere otro, "¿qué día podrías?".
- VETADO "andar" como verbo de "estar/ir" ("¿andas buscando?", "¿apenas andas explorando?", "por dónde andaría", "ando viendo"): demasiado casual. Di "¿estás buscando?", "¿apenas estás explorando?", "por ahí estaría", "estoy viendo".

DATOS DEL NEGOCIO (los ÚNICOS hechos de lugar/horario que puedes afirmar; nada de inventar):
- El showroom está en Plaza Ellion, Av. Gómez Morín, San Pedro Garza García. Di "nuestro showroom en San Pedro" — NUNCA "showroom Ellion" (Ellion es la plaza, no nuestra marca) y NUNCA digas que estamos en Monterrey.
- Si preguntan ubicación o cómo llegar, manda directo la dirección con este link (tal cual, es el único link que puedes enviar): https://maps.app.goo.gl/545b4PT4WK5bHsTh6 — NO preguntes "por qué zona te queda mejor" ni nada parecido: el showroom no se mueve.
- VETADO presentar el link con "aquí la ubicación" / "aquí está la ubicación" (suena a bot). Formas naturales, varía: "es esta la ubicación:", "te paso la ubicación:", "esta es la ubicación exacta:".
- Horario de visitas: todos los días de 10 de la mañana a 8 de la noche. Las horas SIEMPRE en palabras con am/pm o mañana/tarde/noche ("de 10 am a 8 pm", "a las 5 de la tarde") — NUNCA formato de 24 horas ("10:00 a 20:00", "a las 19").

EJEMPLOS DE TONO (guía de estilo, NUNCA los copies literal):
- Invitar al showroom → MAL: "¿Te late que agendemos una visita?" (compa). BIEN: "¿Te gustaría venir al showroom a verlos en persona?" o "Si quieres, agendamos una visita y los ves con calma."
- Proponer horario → MAL: "¿Qué día te acomoda para venir?" (vetado y en frío). BIEN: "Si quieres, mañana a las 5 tenemos espacio. ¿Puedes?" (usando un horario REAL de AGENDA; la fecha en palabras naturales, no "2026-07-12").
- Preguntan ubicación → MAL: "Estamos en el showroom Ellion, en Monterrey. Aquí la ubicación: [link]" (nombre inventado, ciudad mal, "aquí la ubicación" vetado). BIEN: "Estamos en Plaza Ellion, sobre Gómez Morín en San Pedro. Es esta la ubicación: https://maps.app.goo.gl/545b4PT4WK5bHsTh6"
- Preguntan horario → MAL: "Abrimos todos los días de 10 a 20." BIEN: "Abrimos todos los días de 10 am a 8 pm."
- Cliente: "busco ver diseños" → MAL: "Tenemos varios estilos en el showroom, desde solitarios clásicos hasta diseños a la medida. ¿Lo imaginas más clásico o algo distinto?" (catálogo + comodín vago). BIEN: "¿Ya tienes idea de lo que le gusta o apenas estás explorando?"
- Cliente: "cuánto cuesta un anillo?" → MAL: "Los precios varían dependiendo de múltiples factores." BIEN: "Depende mucho de la piedra y el diseño. ¿Traes algo en mente? Así te digo por dónde estaría." (y sensible=true: el número lo da una persona)
- Cliente: "hola, información" → MAL: "¡Hola! Con gusto te comparto información sobre nuestros servicios." BIEN: "Hola, claro. ¿Estás buscando anillo de compromiso o argollas?"

QUIÉN ERES:
- No inventes un nombre ni una identidad. Si el cliente pregunta tu nombre, con quién habla, o si eres un bot/IA: marca sensible=true y deja que responda una persona del equipo. Nunca afirmes ni niegues ser una IA por tu cuenta.

TU OBJETIVO: entender qué busca (estilo, para cuándo, para quién) sin interrogar, y cuando la conversación fluya, invitar a una visita al showroom (sin costo y sin compromiso). No presiones; una invitación natural vale más que tres insistencias.

REGLAS DE NEGOCIO (duras):
- NUNCA des precios, cotizaciones ni montos. NUNCA prometas fechas de entrega, descuentos ni condiciones.
- NUNCA inventes disponibilidad de piedras ni características técnicas.
- Si no estás seguro, marca el mensaje como sensible y deja que un humano responda.

FICHA DEL CRM (además de responder, mantienes al día la ficha del lead):
- resumen_interes: en cada mensaje devuelve un resumen corto y concreto de qué busca este cliente con TODO lo aprendido en el hilo hasta ahora (tipo de pieza, estilo, piedra, metal, para quién, para cuándo, presupuesto si él lo mencionó, y cualquier detalle útil para venderle). Escríbelo para que un vendedor lo entienda de un vistazo, p. ej. "Anillo de compromiso, oro blanco con diamante ovalado, propone en septiembre, novia de estilo minimalista". Actualízalo si este mensaje agrega información; si aún no se sabe nada, cadena vacía.
- nombre_cliente: SOLO si el cliente ha dicho su propio nombre en la conversación (p. ej. "soy Ana García"), ponlo tal cual lo dijo (completo si lo dio completo). NUNCA pongas el nombre de la pareja ni un nombre supuesto; si no lo ha dicho, cadena vacía.
- tarea_sugerida: si de la conversación se desprende una ACCIÓN concreta que el equipo debería hacer, proponla en una frase corta que empiece con verbo ("Mandar cotización a {nombre}", "Agendar cita con {nombre}", "Mandar render a {nombre}", "Mandar ubicación a {nombre}", "Llamar a {nombre} para confirmar cita"). Una sola, la más importante. Si aún no hay una acción clara (apenas saludó, pregunta general), cadena vacía. No inventes acciones que el cliente no haya insinuado.

TU RESPUESTA ES UNA SUGERENCIA PARA EL EQUIPO: nunca se envía sola. Un socio la revisa, la edita si hace falta y la manda. Aun así, redáctala lista para enviarse tal cual (no como instrucción para el equipo, sino como el mensaje que recibiría el cliente).

Marca sensible=true cuando el mensaje implique: piedra central grande o de alto valor (2 quilates o más), negociación de precio o descuento, una queja/inconformidad/reclamo, algo que requiera un compromiso (precio, fecha, garantía), datos legales, que pregunten con quién hablan o si es un bot, o cualquier caso donde una persona del equipo deba decidir. En esos casos igual redacta la respuesta propuesta (para que el humano la use o la edite), pero no se enviará automáticamente.`;

/** Esquema de salida; `horario_sugerido` se restringe a los slots ofrecidos. */
function esquemaBot(horariosIso: string[]) {
  return {
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
      horario_sugerido: {
        type: "string",
        enum: [...horariosIso, "ninguno"],
        description:
          "El ISO del horario de AGENDA que usaste en la respuesta, o 'ninguno' si no propusiste horario.",
      },
      resumen_interes: {
        type: "string",
        description:
          "Qué busca este lead, con todo lo aprendido en el hilo (ver FICHA DEL CRM). Vacío si aún no se sabe nada.",
      },
      nombre_cliente: {
        type: "string",
        description:
          "El nombre del cliente SOLO si él mismo lo dijo en la conversación, tal como lo dijo. Vacío si no lo ha dicho.",
      },
      tarea_sugerida: {
        type: "string",
        description:
          "Si la conversación implica una ACCIÓN concreta del equipo (mandar cotización, agendar cita, mandar render/fotos, mandar ubicación, llamar para confirmar), propónla en una frase corta y accionable que empiece con verbo, p. ej. 'Mandar cotización a {nombre}' o 'Agendar cita con {nombre}'. Vacío si no hay una acción clara todavía.",
      },
    },
    required: [
      "intencion",
      "sensible",
      "motivo",
      "respuesta",
      "horario_sugerido",
      "resumen_interes",
      "nombre_cliente",
      "tarea_sugerida",
    ],
  };
}

type SalidaBot = {
  intencion: string;
  sensible: boolean;
  motivo: string;
  respuesta: string;
  horario_sugerido?: string;
  resumen_interes?: string;
  nombre_cliente?: string;
  tarea_sugerida?: string;
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

/*
  Ficha viva del CRM (feedback de Santiago 2026-07-11): con cada mensaje el bot
  devuelve el resumen de qué busca el lead (cliente.interes, visible at-a-glance
  en /clientes) y, si el cliente dijo su nombre en el chat, se actualiza el
  nombre de contacto (los del riel nacen como "WhatsApp 81..." o el alias del
  perfil). Guardas del nombre: solo si difiere del actual y el actual no lo
  contiene ya (que "soy Ana" no degrade una ficha que ya dice "Ana García").
*/
async function actualizarFichaLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entrada: EntradaBot,
  salida: SalidaBot,
): Promise<void> {
  if (!entrada.clienteId) return;
  const patch: Record<string, string> = {};

  const interes = sinEmojis((salida.resumen_interes || "").trim()).slice(0, 400);
  if (interes) patch.interes = interes;

  const nombre = sinEmojis((salida.nombre_cliente || "").trim()).slice(0, 80);
  const actual = (entrada.clienteNombre || "").trim();
  if (
    nombre.length >= 2 &&
    nombre.toLowerCase() !== actual.toLowerCase() &&
    !actual.toLowerCase().includes(nombre.toLowerCase())
  ) {
    patch.nombre = nombre;
  }

  if (Object.keys(patch).length === 0) return;
  try {
    await supabase.from("cliente").update(patch).eq("id", entrada.clienteId);
  } catch {
    // La ficha es secundaria: si falla, la respuesta al cliente sigue su curso.
  }
}

/*
  Tarea inteligente (modelo asistido, 2026-07-18): cuando la conversación implica
  una acción del equipo (mandar cotización, agendar, mandar render/ubicación,
  llamar), la IA la propone en `tarea_sugerida` y aquí se deja como TAREA SUGERIDA
  ligada al lead (aparece en /hoy con badge "Sugerida", aceptar/descartar en un
  toque). Idempotente: no duplica una tarea sugerida pendiente con el mismo título
  para el mismo cliente (el bot corre en cada mensaje).
*/
async function sugerirTareaLead(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  entrada: EntradaBot,
  salida: SalidaBot,
): Promise<void> {
  if (!entrada.clienteId) return;
  const titulo = sinEmojis((salida.tarea_sugerida || "").trim()).slice(0, 120);
  if (titulo.length < 4) return;
  try {
    const { data: existentes } = await supabase
      .from("tarea")
      .select("id")
      .eq("entidad_tipo", "cliente")
      .eq("entidad_id", entrada.clienteId)
      .eq("estado", "pendiente")
      .eq("origen", "sugerida")
      .ilike("titulo", titulo)
      .limit(1);
    if (existentes && existentes.length > 0) return; // ya existe esa sugerencia

    const { data: cli } = await supabase
      .from("cliente")
      .select("sucursal_id")
      .eq("id", entrada.clienteId)
      .maybeSingle();

    await supabase.from("tarea").insert({
      titulo,
      detalle: "Sugerida por la IA a partir de la conversación de WhatsApp.",
      entidad_tipo: "cliente",
      entidad_id: entrada.clienteId,
      origen: "sugerida",
      sucursal_id: cli?.sucursal_id ?? "00000000-0000-0000-0000-000000000001",
    });
  } catch {
    // La tarea sugerida es secundaria: si falla, no rompe el riel.
  }
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

    /*
      ¿Hay una respuesta del bot atorada esperando aprobación en este hilo?
      (Bug 2026-07-11: con un borrador de horario sin aprobar, cada mensaje
      nuevo del cliente generaba OTRO borrador con horario — nunca se enviaba
      nada y el bot enmudecía hasta que un socio aprobara.) Con borrador
      pendiente el bot sigue conversando: no ofrece horarios nuevos y, si el
      cliente insiste en agendar, le dice que en un momento le confirma.
    */
    const { data: pendientes } = await supabase
      .from("mensaje")
      .select("cuerpo")
      .eq("conversacion_id", entrada.conversacionId)
      .eq("estado_entrega", "borrador_ia")
      .order("created_at", { ascending: false })
      .limit(1);
    const borradorPendiente: string | null = pendientes?.[0]?.cuerpo ?? null;

    // Horarios reales disponibles (citas + candado entre chats): el bot propone
    // uno concreto en vez de preguntar "¿qué día podrías?" en frío. Con un
    // borrador pendiente NO se ofrecen (evita apilar propuestas sin enviar).
    const horarios = borradorPendiente
      ? []
      : await proximosHorarios(supabase, entrada.conversacionId, 2);
    const agenda = borradorPendiente
      ? `RESPUESTA PENDIENTE DE APROBACIÓN (contexto interno; el cliente NO la ha visto, para él no existe): "${borradorPendiente.slice(0, 400)}". El equipo la está revisando antes de enviarla. Lo ÚNICO en pausa mientras tanto es proponer horario de cita: en ESTE mensaje no propongas ni menciones ningún horario o día concreto (horario_sugerido="ninguno" y JAMÁS inventes horarios) y no repitas lo que dice esa respuesta pendiente. Fuera de eso, SIGUE la conversación completamente normal: contesta sus preguntas, da información y platica como siempre. Solo si el cliente pregunta directo por el horario o se impacienta por la cita, dile natural que estás checando la agenda y en un momento le confirmas — eso por sí solo NO es motivo de sensible=true (las demás reglas de sensible siguen aplicando).`
      : horarios.length > 0
        ? `AGENDA (horarios del showroom REALMENTE disponibles ahora; si invitas a agendar, propón el primero — el segundo es tu alternativa si el cliente dice que no puede; JAMÁS inventes otros horarios ni confirmes una cita como cerrada, solo propón):\n${horarios
            .map((h) => `- ${h.iso} = ${h.etiqueta}`)
            .join("\n")}`
        : "AGENDA: no hay horarios disponibles a la mano; si el cliente quiere agendar, dile que le confirmas horario en un momento (y marca sensible=true para que el equipo lo agende).";

    const anthropic = getAnthropic();
    const resp = await anthropic.messages.create({
      model: MODELO_IA,
      max_tokens: 700,
      system: `${SISTEMA}\n\nContexto: ${contexto}\n\n${agenda}`,
      output_config: {
        format: { type: "json_schema", schema: esquemaBot(horarios.map((h) => h.iso)) },
      },
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

  // Ficha viva: interés del lead + nombre real si lo dio (aunque la respuesta
  // termine en borrador, la ficha ya aprendió lo de este mensaje).
  await actualizarFichaLead(supabase, entrada, salida);

  // Tarea inteligente: si la conversación implica una acción del equipo
  // (mandar cotización, agendar, etc.), déjala como tarea sugerida en /hoy.
  await sugerirTareaLead(supabase, entrada, salida);

  const respuesta = sinEmojis((salida.respuesta || "").trim());
  if (!respuesta) return;

  const proponeHorario = Boolean(
    salida.horario_sugerido && salida.horario_sugerido !== "ninguno",
  );

  // Si propuso un horario, apártalo: otro chat simultáneo ya no lo recibirá.
  // Aplica también a borradores (reserva el slot mientras el humano aprueba).
  if (proponeHorario) {
    await apartarHorario(supabase, entrada.conversacionId, salida.horario_sugerido!);
  }

  /*
    MODELO ASISTIDO (decisión de Santiago + socio, 2026-07-18): el bot NUNCA
    responde solo al cliente. TODA respuesta se guarda como BORRADOR sugerido
    para que un socio la apruebe/edite/mande desde el Inbox. La IA sigue haciendo
    el trabajo pesado (entender, redactar el borrador, mantener la ficha, sugerir
    la tarea), pero la voz con el cliente es del equipo. Para regresar al
    auto-envío de lo seguro, poner RESPUESTAS_REQUIEREN_APROBACION en false.
  */
  const RESPUESTAS_REQUIEREN_APROBACION = true;
  const HORARIOS_REQUIEREN_APROBACION = true;

  if (
    RESPUESTAS_REQUIEREN_APROBACION ||
    salida.sensible ||
    (proponeHorario && HORARIOS_REQUIEREN_APROBACION)
  ) {
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

  // (Solo si el auto-envío está activado) respuesta segura: ritmo humano y enviar.
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

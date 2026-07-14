import "server-only";
import type Anthropic from "@anthropic-ai/sdk";
import { getAnthropic, iaConfigurada, MODELO_IA } from "./anthropic";
import { getUsuarioActual } from "@/lib/session";
import {
  HERRAMIENTAS,
  HERRAMIENTAS_SENSIBLES,
  ejecutarHerramienta,
  prepararAccionSensible,
  type Enlace,
  type AccionPendiente,
} from "./asistente-herramientas";

/*
  Asistente interno del ERP (Plan Maestro §3.19). Un copiloto de Claude DENTRO
  del ERP para que Santiago y Fer lo operen con texto: consultar el negocio y
  dar de alta cosas en el módulo correcto en lenguaje natural.

  A diferencia del bot de WhatsApp (que habla con CLIENTES), este habla con el
  EQUIPO y ejecuta acciones vía "tool use": Claude decide qué herramienta usar,
  el ERP la ejecuta con el mismo código de siempre (ver asistente-herramientas.ts)
  y con la sesión del usuario (RLS manda). Corre en un route handler protegido.
*/

const SISTEMA = `Eres el asistente interno del ERP de Aurelle & Co. (joyería de compromiso premium en Monterrey). Ayudas a Santiago (CEO) y a Fer (COO) a OPERAR y CONSULTAR el sistema con texto, en español de México.

QUIÉN ERES:
- Un copiloto interno del equipo (NO el bot que atiende a clientes por WhatsApp). Hablas con los dueños del negocio, con confianza y sin rodeos.
- Tienes herramientas para consultar datos reales del ERP y para dar de alta cosas (clientes, tareas, notas, citas). Úsalas: nunca inventes cifras, saldos, nombres ni ids — si necesitas un dato, consúltalo con la herramienta correspondiente.

CÓMO TRABAJAS:
- Para actuar sobre un cliente (nota, cita, tarea ligada) primero necesitas su id: búscalo con buscar_cliente. Si hay varios que coinciden, pregunta a cuál se refiere antes de actuar; no adivines.
- Si al usuario le falta un dato obligatorio para una alta, pídeselo en una frase corta en vez de inventarlo.
- Después de ejecutar una acción, confirma en una línea qué hiciste (con el nombre/dato clave). Si algo falla, di el motivo tal como lo devuelve la herramienta.
- Para consultas, responde directo y claro; puedes usar listas cortas. Montos en pesos mexicanos.

ACCIONES QUE PIDEN CONFIRMACIÓN (dinero o cosas delicadas): registrar un pago, cambiar el contacto de un cliente, mover su etapa de pipeline, reprogramar o cancelar una cita, y convertir una cotización en pedido. Cuando uses una de estas herramientas, el sistema NO la ejecuta de inmediato: le muestra al usuario un botón para confirmar. Por eso, al proponer una de estas acciones, di en una frase qué vas a hacer (sin dar por hecho que ya está) y deja que confirme; NO afirmes que quedó registrada/cambiada. Si la herramienta devuelve un error de validación, explícalo y pide el dato que falte.

LÍMITES (respétalos):
- Solo puedes hacer lo que tus herramientas permiten: consultas, altas simples (cliente, tarea, nota, cita) y las acciones con confirmación de arriba (pago, contacto, etapa, reprogramar/cancelar cita, convertir cotización en pedido).
- No borras clientes ni pedidos, no tocas producción ni migraciones, y no editas nada para lo que no tengas una herramienta específica.
- La información de Finanzas/márgenes es solo-admin: si una consulta vuelve vacía por permisos, dilo con naturalidad. Registrar pagos también es solo-admin (la base lo impone por RLS).

TONO: cálido, breve, directo. Sin emojis. Sin muletillas de asistente ("¡Claro!", "con gusto"). Ve al punto.`;

export type TurnoChat = { role: "user" | "assistant"; content: string };

export type RespuestaAsistente = {
  respuesta: string;
  enlaces: Enlace[];
  /** Acción sensible propuesta que espera el "sí" del usuario (§3.19 v2). */
  pendiente?: AccionPendiente;
};

/** Cuántas rondas de herramientas permitimos antes de cortar (evita bucles). */
const MAX_RONDAS = 6;

/*
  Contexto de pantalla (§3.19 v2): si el usuario está viendo la ficha de algo,
  el asistente entiende "este pedido / este cliente" sin que lo nombre. Del path
  actual extrae la entidad y su id, y lo inyecta al prompt para que las
  herramientas (registrar_pago, agregar_nota, …) usen ese id directo.
*/
const UUID = "[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}";
const PANTALLAS: { re: RegExp; texto: (id: string) => string }[] = [
  { re: new RegExp(`^/ventas/pedidos/(${UUID})`), texto: (id) => `el PEDIDO con id=${id}` },
  { re: new RegExp(`^/ventas/cotizaciones/(${UUID})`), texto: (id) => `la COTIZACIÓN con id=${id}` },
  { re: new RegExp(`^/taller/inventario/(${UUID})`), texto: (id) => `el ITEM de inventario con id=${id}` },
  { re: new RegExp(`^/clientes/(${UUID})`), texto: (id) => `la ficha del CLIENTE con id=${id}` },
];

export function contextoDePantalla(path?: string): string | null {
  if (!path) return null;
  for (const { re, texto } of PANTALLAS) {
    const m = path.match(re);
    if (m) return texto(m[1]);
  }
  return null;
}

/**
 * Corre una vuelta del asistente sobre el historial del chat. Ejecuta el loop de
 * tool use (Claude pide herramienta → la ejecutamos → le devolvemos el resultado)
 * hasta que Claude responde en texto o se agotan las rondas.
 *
 * `path` = ruta que el usuario está viendo (para el contexto de pantalla).
 */
export async function correrAsistente(
  historial: TurnoChat[],
  path?: string,
): Promise<RespuestaAsistente> {
  if (!iaConfigurada()) {
    return {
      respuesta:
        "El asistente no está configurado (falta la API de IA). Avísale a Santiago para activarlo.",
      enlaces: [],
    };
  }

  // El usuario debe estar logueado: fija identidad/rol para las herramientas (RLS).
  const usuario = await getUsuarioActual();
  const anthropic = getAnthropic();

  const messages: Anthropic.MessageParam[] = historial
    .filter((t) => t.content.trim())
    .map((t) => ({ role: t.role, content: t.content.slice(0, 4000) }));

  const enlaces: Enlace[] = [];
  let pendiente: AccionPendiente | undefined;

  const hoy = new Date().toLocaleDateString("es-MX", {
    timeZone: "America/Monterrey",
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
  const pantalla = contextoDePantalla(path);
  const system =
    `${SISTEMA}\n\nContexto: hablas con ${usuario.nombre} (rol: ${usuario.rol}). Hoy es ${hoy}.` +
    (pantalla
      ? `\nEl usuario está viendo ahora ${pantalla}. Si dice "este/esta" o "aquí" (p. ej. "regístrale un pago", "súbele una nota"), se refiere a eso: usa ese id directo, sin volver a buscarlo.`
      : "");

  for (let ronda = 0; ronda < MAX_RONDAS; ronda++) {
    const resp = await anthropic.messages.create({
      model: MODELO_IA,
      max_tokens: 1024,
      system,
      tools: HERRAMIENTAS,
      messages,
    });

    if (resp.stop_reason === "tool_use") {
      // Guarda el turno del asistente (texto + peticiones de herramienta) tal cual.
      messages.push({ role: "assistant", content: resp.content });

      const resultados: Anthropic.ToolResultBlockParam[] = [];
      for (const bloque of resp.content) {
        if (bloque.type !== "tool_use") continue;
        const entrada = bloque.input as Record<string, unknown>;

        // Acción sensible (dinero/edición): NO se ejecuta aquí. Se prepara y se
        // deja pendiente de confirmación del usuario (botón en el widget).
        if (HERRAMIENTAS_SENSIBLES.has(bloque.name)) {
          let contenido: string;
          if (pendiente) {
            // Solo una propuesta a la vez: pide hacerlas de una en una.
            contenido =
              "Ya hay una acción esperando confirmación. Propón las acciones delicadas de una en una.";
          } else {
            const prep: { pendiente?: AccionPendiente; error?: string } =
              await prepararAccionSensible(bloque.name, entrada).catch(() => ({
                error: "No se pudo preparar la acción.",
              }));
            if (prep.pendiente) {
              pendiente = prep.pendiente;
              contenido = `Propuesta lista y mostrada al usuario para que confirme: "${prep.pendiente.resumen}". AÚN NO se ejecuta; no digas que ya quedó hecho.`;
            } else {
              contenido = prep.error ?? "No se pudo preparar la acción.";
            }
          }
          resultados.push({ type: "tool_result", tool_use_id: bloque.id, content: contenido });
          continue;
        }

        let salida: { texto: string; enlace?: Enlace };
        try {
          salida = await ejecutarHerramienta(bloque.name, entrada);
        } catch {
          salida = { texto: "Ocurrió un error al ejecutar esa acción." };
        }
        if (salida.enlace) enlaces.push(salida.enlace);
        resultados.push({
          type: "tool_result",
          tool_use_id: bloque.id,
          content: salida.texto,
        });
      }
      messages.push({ role: "user", content: resultados });
      continue; // otra ronda: Claude ya tiene los resultados
    }

    // Respuesta final en texto.
    const texto = resp.content
      .filter((b): b is Anthropic.TextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return {
      respuesta: texto || (pendiente ? "¿Confirmo esto?" : "Listo."),
      enlaces,
      pendiente,
    };
  }

  return {
    respuesta:
      "Me enredé haciendo esto en varios pasos. ¿Me lo dices de otra forma o lo partimos en pedazos más chicos?",
    enlaces,
    pendiente,
  };
}

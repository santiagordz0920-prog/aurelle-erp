import "server-only";
import crypto from "crypto";

/*
  Cliente de WhatsApp Business Cloud API (Meta). El riel oficial: los mensajes
  entrantes llegan por webhook y las respuestas salen por esta API (§3.1).

  Variables de entorno (se configuran en Vercel — NUNCA en el repo):
  - WHATSAPP_ACCESS_TOKEN   → token permanente (System User) de Meta.
  - WHATSAPP_PHONE_NUMBER_ID → id del número emisor (panel de WhatsApp de Meta).
  - WHATSAPP_VERIFY_TOKEN   → cadena que TÚ eliges; la misma va en Meta al dar de
                              alta el webhook (para el handshake GET).
  - WHATSAPP_APP_SECRET     → secreto de la app de Meta; valida la firma de cada
                              POST del webhook (X-Hub-Signature-256). Opcional pero
                              recomendado: si está, se exige firma válida.
  - WHATSAPP_API_VERSION    → opcional, default 'v21.0'.
*/

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

/** ¿Está el riel listo para ENVIAR? (token + número). */
export function whatsappConfigurado(): boolean {
  return Boolean(process.env.WHATSAPP_ACCESS_TOKEN && process.env.WHATSAPP_PHONE_NUMBER_ID);
}

export type EnvioWa = { ok: boolean; wa_id?: string; error?: string };

/**
 * Envía un mensaje de texto libre por la Cloud API. Solo válido dentro de la
 * ventana de 24 h desde el último mensaje del cliente; fuera de ella, Meta exige
 * plantilla pre-aprobada (ver `enviarPlantillaWa`). Devuelve el `wa_id` de Meta
 * para guardarlo en el mensaje saliente y casar los webhooks de estado.
 */
export async function enviarTextoWa(telefono: string, texto: string): Promise<EnvioWa> {
  if (!whatsappConfigurado()) {
    return { ok: false, error: "WhatsApp no configurado (sin token/número)." };
  }
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "text",
        text: { body: texto, preview_url: false },
      }),
    });
    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message ?? `HTTP ${res.status}`;
      return { ok: false, error: msg };
    }
    return { ok: true, wa_id: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red al enviar." };
  }
}

/**
 * Envía una plantilla pre-aprobada por Meta (para escribir FUERA de la ventana de
 * 24 h: recordatorios, felicitaciones, "tu render está listo"). `componentes` son
 * los parámetros de las variables de la plantilla.
 */
export async function enviarPlantillaWa(
  telefono: string,
  plantilla: string,
  idioma: string,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  componentes?: any[],
): Promise<EnvioWa> {
  if (!whatsappConfigurado()) {
    return { ok: false, error: "WhatsApp no configurado (sin token/número)." };
  }
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    const res = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        to: telefono,
        type: "template",
        template: {
          name: plantilla,
          language: { code: idioma },
          ...(componentes ? { components: componentes } : {}),
        },
      }),
    });
    const data = await res.json();
    if (!res.ok) return { ok: false, error: data?.error?.message ?? `HTTP ${res.status}` };
    return { ok: true, wa_id: data?.messages?.[0]?.id };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : "Error de red al enviar." };
  }
}

/**
 * Marca leído Y enciende el indicador "escribiendo..." en el WhatsApp del
 * cliente (dura hasta 25 s o hasta que enviemos el mensaje). Junto con el
 * retraso humanizado del bot, hace que la respuesta se sienta de una persona:
 * palomitas azules → "escribiendo..." → mensaje.
 */
export async function indicarEscribiendoWa(waMessageId: string): Promise<void> {
  if (!whatsappConfigurado()) return;
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: waMessageId,
        typing_indicator: { type: "text" },
      }),
    });
  } catch {
    // No es crítico: si falla, solo no se ve el "escribiendo...".
  }
}

/** Marca como leídos los mensajes en Meta (los ✓✓ azules del lado del cliente). */
export async function marcarLeidoWa(waMessageId: string): Promise<void> {
  if (!whatsappConfigurado()) return;
  const url = `https://graph.facebook.com/${API_VERSION}/${process.env.WHATSAPP_PHONE_NUMBER_ID}/messages`;
  try {
    await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.WHATSAPP_ACCESS_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messaging_product: "whatsapp",
        status: "read",
        message_id: waMessageId,
      }),
    });
  } catch {
    // No es crítico: si falla, el mensaje sigue guardado; solo no se marca leído en Meta.
  }
}

/**
 * Verifica la firma X-Hub-Signature-256 de un POST del webhook contra el cuerpo
 * crudo, usando WHATSAPP_APP_SECRET. Si no hay secreto configurado, no se exige
 * (devuelve true) — pero en producción CONVIENE configurarlo.
 */
export function firmaWebhookValida(cuerpoCrudo: string, firmaHeader: string | null): boolean {
  const secret = process.env.WHATSAPP_APP_SECRET;
  if (!secret) return true; // sin secreto configurado no se valida (dev / arranque)
  if (!firmaHeader) return false;
  const esperado =
    "sha256=" + crypto.createHmac("sha256", secret).update(cuerpoCrudo).digest("hex");
  try {
    return crypto.timingSafeEqual(Buffer.from(esperado), Buffer.from(firmaHeader));
  } catch {
    return false;
  }
}

/* ── Parseo del payload del webhook ──────────────────────────────────────────
   Meta manda entry[].changes[].value con:
   - messages[]: mensajes entrantes (con from, id, type, text.body, …)
   - statuses[]: cambios de estado de salientes (sent/delivered/read/failed)
   - contacts[]: perfil del remitente (profile.name)
   Lo aplanamos a algo simple para el receptor. */

export type MensajeEntrante = {
  wa_id: string;
  telefono: string;
  nombre_perfil: string | null;
  tipo: "texto" | "imagen" | "documento" | "audio" | "plantilla";
  cuerpo: string | null;
  media_id: string | null;
  timestamp: string | null;
};

export type EstadoSaliente = {
  wa_id: string;
  estado: string; // sent | delivered | read | failed
};

const TIPO_WA_A_LOCAL: Record<string, MensajeEntrante["tipo"]> = {
  text: "texto",
  image: "imagen",
  document: "documento",
  audio: "audio",
  voice: "audio",
  sticker: "imagen",
  video: "imagen",
};

/** Aplana el payload del webhook a mensajes entrantes + estados salientes. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function parsearWebhook(payload: any): {
  entrantes: MensajeEntrante[];
  estados: EstadoSaliente[];
} {
  const entrantes: MensajeEntrante[] = [];
  const estados: EstadoSaliente[] = [];
  const entries = payload?.entry ?? [];
  for (const entry of entries) {
    for (const change of entry?.changes ?? []) {
      const value = change?.value ?? {};
      // Mapa telefono→nombre de perfil (contacts).
      const perfiles = new Map<string, string>();
      for (const c of value?.contacts ?? []) {
        if (c?.wa_id && c?.profile?.name) perfiles.set(c.wa_id, c.profile.name);
      }
      for (const m of value?.messages ?? []) {
        const tipoLocal = TIPO_WA_A_LOCAL[m?.type] ?? "texto";
        const cuerpo =
          m?.type === "text"
            ? (m?.text?.body ?? null)
            : (m?.[m?.type]?.caption ?? null);
        const media_id =
          m?.type && m?.[m.type]?.id ? m[m.type].id : null;
        entrantes.push({
          wa_id: m?.id,
          telefono: m?.from,
          nombre_perfil: perfiles.get(m?.from) ?? null,
          tipo: tipoLocal,
          cuerpo,
          media_id,
          timestamp: m?.timestamp ?? null,
        });
      }
      for (const s of value?.statuses ?? []) {
        if (s?.id && s?.status) estados.push({ wa_id: s.id, estado: s.status });
      }
    }
  }
  return { entrantes, estados };
}

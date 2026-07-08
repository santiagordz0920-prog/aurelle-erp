import { NextResponse, after } from "next/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { firmaWebhookValida, parsearWebhook } from "@/lib/whatsapp";
import { registrarEntrante, actualizarEstadoSaliente } from "@/lib/data/inbox-riel";
import { responderConBot, type EntradaBot } from "@/lib/ia/bot-whatsapp";

/*
  Webhook de WhatsApp Cloud API (§3.1). Ruta PÚBLICA (Meta llama sin sesión;
  agregada a `esPublica` en el middleware).

  - GET: handshake de verificación. Meta manda hub.mode/hub.verify_token/
    hub.challenge; si el verify_token coincide con WHATSAPP_VERIFY_TOKEN,
    devolvemos el challenge en texto plano.
  - POST: entrega de eventos. Validamos la firma (WHATSAPP_APP_SECRET), guardamos
    los mensajes entrantes (crea cliente+conversación) y actualizamos estados de
    los salientes. Respondemos 200 SIEMPRE y rápido (Meta reintenta si no).
*/

export async function GET(request: Request) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  if (mode === "subscribe" && token && token === process.env.WHATSAPP_VERIFY_TOKEN) {
    return new NextResponse(challenge ?? "", { status: 200 });
  }
  return new NextResponse("Forbidden", { status: 403 });
}

export async function POST(request: Request) {
  const crudo = await request.text();

  // Firma de Meta: si WHATSAPP_APP_SECRET está configurado, se exige válida.
  const firma = request.headers.get("x-hub-signature-256");
  if (!firmaWebhookValida(crudo, firma)) {
    return NextResponse.json({ error: "firma inválida" }, { status: 401 });
  }

  // Sin Supabase (dev) no persistimos; respondemos 200 para no romper el handshake.
  if (!supabaseConfigurado()) {
    return NextResponse.json({ ok: true, nota: "sin supabase" });
  }

  let payload: unknown;
  try {
    payload = JSON.parse(crudo);
  } catch {
    return NextResponse.json({ ok: true, nota: "cuerpo no-json" });
  }

  const { entrantes, estados } = parsearWebhook(payload);

  // Estados de salientes (sent/delivered/read/failed).
  for (const e of estados) {
    try {
      await actualizarEstadoSaliente(e);
    } catch {
      // no crítico
    }
  }

  // Mensajes entrantes: guardar (rápido) y juntar los que el bot debe atender.
  const paraBot: EntradaBot[] = [];
  for (const m of entrantes) {
    try {
      const res = await registrarEntrante(m);
      if (res && !res.duplicado && m.tipo === "texto" && m.cuerpo) {
        paraBot.push({
          conversacionId: res.conversacionId,
          clienteId: res.clienteId,
          clienteNombre: res.clienteNombre,
          telefono: m.telefono,
          texto: m.cuerpo,
        });
      }
    } catch {
      // Un mensaje que falla no debe tumbar el resto ni la respuesta 200.
    }
  }

  // El bot (IA + envío) corre DESPUÉS de responder 200: Meta reintenta si
  // tardamos, y la IA puede tomar segundos. `after` ejecuta tras la respuesta.
  if (paraBot.length > 0) {
    after(async () => {
      for (const e of paraBot) {
        try {
          await responderConBot(e);
        } catch {
          // El mensaje ya está guardado; un humano puede responder desde el Inbox.
        }
      }
    });
  }

  return NextResponse.json({ ok: true, entrantes: entrantes.length, estados: estados.length });
}

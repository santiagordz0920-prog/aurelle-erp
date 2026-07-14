import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { ESTADOS_ACTIVOS, type EstadoCadencia } from "@/lib/cadencias";

/*
  Cron DIARIO de cadencias (F1; Vercel Hobby solo permite crons diarios). Re-arma
  la cadencia de los leads que quedaron PAUSADOS por la regla de oro cuando su
  conversación se enfrió: si el último mensaje del hilo tiene ≥24 h y no hay
  borrador de IA pendiente, se reanuda el seguimiento programando el próximo
  toque del estado actual. Protegido por CRON_SECRET; usa service_role (sin
  sesión). Idempotente: solo toca pausados. La lista "Toques de hoy" se calcula
  al vuelo (proximo_toque_at <= now), así que no depende de la frecuencia del
  cron; solo el re-armado de pausados corre una vez al día.
*/
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ ok: true, reanudadas: 0, nota: "sin supabase" });
  }

  const supabase = createAdminClient();
  const hace24h = new Date(Date.now() - 24 * 3_600_000).toISOString();

  // Candidatos: leads en cadencia activa, pausados, no escalados.
  const { data: pausados, error } = await supabase
    .from("cliente")
    .select("id, telefono, estado_cadencia, cadencia_toque_n")
    .eq("cadencia_pausada", true)
    .eq("escalado", false)
    .not("estado_cadencia", "is", null)
    .in("estado_cadencia", ESTADOS_ACTIVOS)
    .limit(500);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  let reanudadas = 0;
  for (const lead of pausados ?? []) {
    // ¿La conversación ya se enfrió? Último mensaje del cliente ≥24 h y sin borrador.
    const { data: conv } = await supabase
      .from("conversacion")
      .select("id, ultimo_at")
      .eq("cliente_id", lead.id)
      .order("ultimo_at", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (conv?.ultimo_at && conv.ultimo_at > hace24h) continue; // sigue viva

    if (conv?.id) {
      const { data: borrador } = await supabase
        .from("mensaje")
        .select("id")
        .eq("conversacion_id", conv.id)
        .eq("estado_entrega", "borrador_ia")
        .limit(1)
        .maybeSingle();
      if (borrador) continue; // hay algo esperando aprobación humana
    }

    // Reanuda: próximo toque = el que sigue al último enviado, en su offset.
    const estado = lead.estado_cadencia as EstadoCadencia;
    const enviadoN = lead.cadencia_toque_n ?? 0;
    const { data: filas } = await supabase
      .from("plantilla_cadencia")
      .select("toque_n, offset_horas")
      .eq("estado_cadencia", estado)
      .eq("activa", true)
      .order("toque_n");
    const siguiente = (filas ?? []).find((f) => f.toque_n > enviadoN);
    const actualOffset =
      enviadoN === 0 ? 0 : (filas ?? []).find((f) => f.toque_n === enviadoN)?.offset_horas ?? 0;
    const esperaH = siguiente ? Math.max(0, siguiente.offset_horas - actualOffset) : 0;
    const proximo = new Date(Date.now() + esperaH * 3_600_000).toISOString();

    await supabase
      .from("cliente")
      .update({ cadencia_pausada: false, proximo_toque_at: proximo })
      .eq("id", lead.id);
    reanudadas += 1;
  }

  return NextResponse.json({ ok: true, reanudadas });
}

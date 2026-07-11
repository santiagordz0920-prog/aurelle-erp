import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/config";

/*
  Cron nocturno de seguimiento (§4): genera tareas automáticas por atasco de
  producción (≥7 días en una etapa) y por contrato sin firmar (>48 h). Lo llama
  Vercel Cron (config en vercel.json). Protegido por CRON_SECRET. Usa service_role
  porque no hay sesión; la función SQL es idempotente (no duplica si ya hay tarea
  pendiente de seguimiento), así que correrlo de más es seguro.
*/
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ ok: true, creadas: 0, nota: "sin supabase" });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("generar_tareas_seguimiento");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  // Tareas recurrentes (§3.15): plantillas semanales/mensuales (0032).
  const { data: recurrentes, error: errRec } = await supabase.rpc("generar_tareas_recurrentes");
  if (errRec) {
    return NextResponse.json({ error: errRec.message }, { status: 500 });
  }
  return NextResponse.json({
    ok: true,
    creadas: (data as number) ?? 0,
    recurrentes: (recurrentes as number) ?? 0,
  });
}

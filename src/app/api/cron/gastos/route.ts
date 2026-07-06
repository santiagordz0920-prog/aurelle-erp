import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/config";

/*
  Cron mensual: postea los gastos recurrentes al ledger (§3.11). Lo llama Vercel
  Cron (config en vercel.json). Protegido por CRON_SECRET para que nadie más lo
  dispare. Usa el cliente service_role porque no hay sesión de usuario; la
  función SQL es idempotente por mes, así que correrlo de más no duplica.
*/
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ ok: true, posteados: 0, nota: "sin supabase" });
  }

  const supabase = createAdminClient();
  const { data, error } = await supabase.rpc("postear_gastos_recurrentes");
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  return NextResponse.json({ ok: true, posteados: (data as number) ?? 0 });
}

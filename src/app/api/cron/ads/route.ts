import { NextResponse } from "next/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { metaAdsConfigurado } from "@/lib/meta-ads";
import { sincronizarGastoAds } from "@/lib/data/ads-sync";

/*
  Cron diario: sincroniza el gasto de Meta Ads por campaña (mes en curso + mes
  anterior) hacia gasto_publicitario → el CAC de /crecimiento se actualiza solo.
  Lo llama Vercel Cron (vercel.json); protegido por CRON_SECRET. Idempotente:
  actualiza montos existentes, no duplica filas.
*/
export async function GET(request: Request) {
  const auth = request.headers.get("authorization");
  const secret = process.env.CRON_SECRET;
  if (!secret || auth !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "no autorizado" }, { status: 401 });
  }
  if (!supabaseConfigurado()) {
    return NextResponse.json({ ok: true, nota: "sin supabase" });
  }
  if (!metaAdsConfigurado()) {
    // Aún sin conectar la cuenta publicitaria: el cron no es un error, solo no hay nada que hacer.
    return NextResponse.json({ ok: true, nota: "meta ads sin configurar" });
  }
  try {
    const res = await sincronizarGastoAds();
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Error al sincronizar Meta Ads." },
      { status: 500 },
    );
  }
}

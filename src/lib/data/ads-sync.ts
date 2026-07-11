import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { metaAdsConfigurado, obtenerGastoMeta } from "@/lib/meta-ads";

/*
  Sincronizador del gasto de Meta Ads → gasto_publicitario (0029). Corre desde
  el cron diario (/api/cron/ads) o el botón manual de /crecimiento. service_role
  porque el cron no tiene sesión (la tabla es solo-admin vía RLS para usuarios).

  Idempotencia SIN migración: la llave natural es (periodo, canal='ads',
  detalle=nombre de campaña). Si la fila existe (manual o de un sync anterior),
  se ACTUALIZA el monto con el de la API — Meta es la fuente de verdad del canal
  'ads'; la captura manual queda para expo/referido/otros.
*/

export type ResultadoSyncAds = {
  creados: number;
  actualizados: number;
  campanas: number;
};

const SUCURSAL_DEFAULT = "00000000-0000-0000-0000-000000000001";

export async function sincronizarGastoAds(): Promise<ResultadoSyncAds> {
  if (!metaAdsConfigurado()) {
    throw new Error(
      "Meta Ads sin configurar: faltan META_ADS_ACCESS_TOKEN y/o META_AD_ACCOUNT_ID en Vercel.",
    );
  }
  const filas = await obtenerGastoMeta();
  const supabase = createAdminClient();

  let creados = 0;
  let actualizados = 0;
  for (const f of filas) {
    const { data: existente } = await supabase
      .from("gasto_publicitario")
      .select("id, monto")
      .eq("periodo", f.periodo)
      .eq("canal", "ads")
      .eq("detalle", f.campana)
      .limit(1)
      .maybeSingle();

    if (existente) {
      if (Number(existente.monto) !== f.monto) {
        const { error } = await supabase
          .from("gasto_publicitario")
          .update({ monto: f.monto })
          .eq("id", existente.id);
        if (!error) actualizados += 1;
      }
    } else if (f.monto > 0) {
      const { error } = await supabase.from("gasto_publicitario").insert({
        periodo: f.periodo,
        canal: "ads",
        detalle: f.campana,
        monto: f.monto,
        sucursal_id: SUCURSAL_DEFAULT,
      });
      if (!error) creados += 1;
    }
  }
  return { creados, actualizados, campanas: filas.length };
}

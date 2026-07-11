import "server-only";

/*
  Cliente de la Marketing API de Meta (§3.13): jala el GASTO real por campaña de
  la cuenta publicitaria para alimentar `gasto_publicitario` (0029) y que el CAC
  de /crecimiento se calcule solo (adiós captura manual del canal 'ads').

  Variables de entorno (se configuran en Vercel — NUNCA en el repo):
  - META_ADS_ACCESS_TOKEN → token del System User con permiso ads_read sobre la
    cuenta publicitaria (mismo System User del riel de WhatsApp).
  - META_AD_ACCOUNT_ID    → id de la cuenta publicitaria (con o sin prefijo act_).
*/

const API_VERSION = process.env.WHATSAPP_API_VERSION || "v21.0";

export function metaAdsConfigurado(): boolean {
  return Boolean(process.env.META_ADS_ACCESS_TOKEN && process.env.META_AD_ACCOUNT_ID);
}

/** periodo = primer día del mes (YYYY-MM-01), como usa gasto_publicitario. */
export type GastoCampanaMeta = { periodo: string; campana: string; monto: number };

function cuentaAds(): string {
  const id = (process.env.META_AD_ACCOUNT_ID || "").trim();
  return id.startsWith("act_") ? id : `act_${id}`;
}

async function insightsDelPreset(
  preset: "this_month" | "last_month",
): Promise<GastoCampanaMeta[]> {
  const url = new URL(
    `https://graph.facebook.com/${API_VERSION}/${cuentaAds()}/insights`,
  );
  url.searchParams.set("level", "campaign");
  url.searchParams.set("fields", "campaign_name,spend");
  url.searchParams.set("date_preset", preset);
  url.searchParams.set("limit", "100");
  url.searchParams.set("access_token", process.env.META_ADS_ACCESS_TOKEN!);

  const res = await fetch(url, { cache: "no-store" });
  const data = await res.json();
  if (!res.ok) {
    throw new Error(data?.error?.message ?? `Meta Ads HTTP ${res.status}`);
  }

  const filas: GastoCampanaMeta[] = [];
  for (const r of data?.data ?? []) {
    const monto = Number(r?.spend ?? 0);
    const nombre = String(r?.campaign_name ?? "").trim();
    // Meta regresa date_start del rango; el periodo del ERP es el mes (día 1).
    const periodo = String(r?.date_start ?? "").slice(0, 7);
    if (!nombre || !periodo || !Number.isFinite(monto)) continue;
    filas.push({ periodo: `${periodo}-01`, campana: nombre, monto });
  }
  return filas;
}

/**
 * Gasto por campaña del mes en curso Y del mes anterior (para cerrar el mes
 * pasado aunque el sync corra los primeros días del nuevo). Idempotente aguas
 * abajo: el sincronizador actualiza el monto si la fila ya existe.
 */
export async function obtenerGastoMeta(): Promise<GastoCampanaMeta[]> {
  const [actual, anterior] = await Promise.all([
    insightsDelPreset("this_month"),
    insightsDelPreset("last_month"),
  ]);
  return [...anterior, ...actual];
}

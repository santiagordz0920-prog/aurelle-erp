import type { CanalFuente } from "@/lib/clientes";

/* Gasto publicitario de muestra — solo modo local. NUNCA en producción. */
export type GastoPublicitario = {
  id: string;
  periodo: string; // YYYY-MM-DD (1er día del mes)
  canal: CanalFuente;
  detalle: string | null;
  monto: number;
};

function mesActual(dia = 1): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(dia).padStart(2, "0")}`;
}

export const GASTOS_PUB_MUESTRA: GastoPublicitario[] = [
  { id: "g0000000-0000-0000-0000-000000000001", periodo: mesActual(), canal: "ads", detalle: "Fase 1 SPGG", monto: 18000 },
  { id: "g0000000-0000-0000-0000-000000000002", periodo: mesActual(), canal: "expo", detalle: "Expo novias MTY", monto: 6000 },
];

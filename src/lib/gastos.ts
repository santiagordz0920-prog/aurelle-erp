/* Constantes de dominio de Gastos recurrentes (§3.11). Solo-admin. */

export type GastoRecurrente = {
  id: string;
  concepto: string;
  monto: number;
  categoria: string | null;
  periodicidad: string; // 'mensual' (v1)
  dia_cargo: number; // 1–28
  activo: boolean;
  ultimo_posteo: string | null; // primer día del mes ya posteado
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

/** ¿Ya se posteó este gasto en el mes actual? */
export function posteadoEsteMes(g: GastoRecurrente): boolean {
  if (!g.ultimo_posteo) return false;
  const mes = new Date();
  const primero = new Date(mes.getFullYear(), mes.getMonth(), 1)
    .toISOString()
    .slice(0, 10);
  return g.ultimo_posteo >= primero;
}

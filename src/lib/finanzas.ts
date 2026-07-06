/* Constantes y lógica de dominio de Finanzas (§3.9). SOLO-ADMIN siempre. */

import type { LineaNegocio } from "./pedidos";

export type CategoriaMovimiento =
  | "deuda"
  | "gasto"
  | "capital"
  | "ingreso"
  | "costo"
  | "pago_deuda";

export type MovimientoFinanciero = {
  id: string;
  fecha: string;
  categoria: CategoriaMovimiento;
  concepto: string;
  monto: number;
  linea_negocio: LineaNegocio | null;
  pedido_id: string | null;
  pago_id: string | null;
  origen: string;
  folio_factura: string | null;
  registrado_por: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const CATEGORIA_MOVIMIENTO: Record<
  CategoriaMovimiento,
  { etiqueta: string; clase: string; signo: 1 | -1 }
> = {
  ingreso: { etiqueta: "Ingreso", clase: "bg-success/15 text-success", signo: 1 },
  capital: { etiqueta: "Capital", clase: "bg-accent-soft text-accent", signo: 1 },
  costo: { etiqueta: "Costo", clase: "bg-warning/15 text-warning", signo: -1 },
  gasto: { etiqueta: "Gasto", clase: "bg-warning/15 text-warning", signo: -1 },
  deuda: { etiqueta: "Deuda", clase: "bg-destructive/15 text-destructive", signo: 1 },
  pago_deuda: { etiqueta: "Pago de deuda", clase: "bg-muted text-muted-foreground", signo: -1 },
};

/** Meta de ventas mensual (el trigger de la marca de plata, §3.9). */
export const META_MENSUAL_MXN = 100000;

export const CATEGORIAS: CategoriaMovimiento[] = [
  "ingreso",
  "costo",
  "gasto",
  "capital",
  "deuda",
  "pago_deuda",
];

/** Monto con signo según la naturaleza de la categoría (para P&L / neto). */
export function montoConSigno(m: MovimientoFinanciero): number {
  return m.monto * CATEGORIA_MOVIMIENTO[m.categoria].signo;
}

/* ── Cuentas por pagar (§3.9/§3.10) ─────────────────────────────────────────*/
export type EstadoCxP = "pendiente" | "pagada" | "cancelada";

export type CuentaPorPagar = {
  id: string;
  consignante_id: string | null;
  consignante_nombre?: string | null;
  proveedor_id?: string | null;
  proveedor_nombre?: string | null;
  item_id: string | null;
  pedido_id: string | null;
  concepto: string;
  monto: number;
  estado: EstadoCxP;
  fecha_vencimiento: string | null;
  pagada_at: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const ESTADO_CXP: Record<EstadoCxP, { etiqueta: string; clase: string }> = {
  pendiente: { etiqueta: "Pendiente", clase: "bg-warning/15 text-warning" },
  pagada: { etiqueta: "Pagada", clase: "bg-success/15 text-success" },
  cancelada: { etiqueta: "Cancelada", clase: "bg-muted text-muted-foreground line-through" },
};

/* Constantes de dominio de Comisiones (§3.9/§3.17). Área Dinero → solo-admin. */

export type TipoComision = "planner" | "referidor" | "otro";
export type EstadoComision = "devengada" | "pagada" | "cancelada";

export type Comision = {
  id: string;
  pedido_id: string | null;
  pedido_cliente?: string | null;
  beneficiario: string;
  tipo: TipoComision;
  porcentaje: number;
  monto: number;
  estado: EstadoComision;
  pagada_at: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const TIPO_COMISION: Record<TipoComision, string> = {
  planner: "Wedding planner",
  referidor: "Referidor",
  otro: "Otro",
};

export const ESTADO_COMISION: Record<
  EstadoComision,
  { etiqueta: string; clase: string }
> = {
  devengada: { etiqueta: "Por pagar", clase: "bg-warning/15 text-warning" },
  pagada: { etiqueta: "Pagada", clase: "bg-success/15 text-success" },
  cancelada: { etiqueta: "Cancelada", clase: "bg-muted text-muted-foreground line-through" },
};

/** Monto de comisión = % sobre la utilidad real (nunca sobre el total). */
export function calcularComision(utilidad: number, porcentaje: number): number {
  if (utilidad <= 0) return 0;
  return Math.round((utilidad * porcentaje) / 100);
}

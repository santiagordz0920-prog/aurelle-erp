/* Constantes y lógica de dominio de Postventa (§3.7). Cliente-safe. */

export type TipoServicio = "limpieza" | "ajuste_talla" | "reparacion" | "rerodinado" | "otro";

export const TIPO_SERVICIO: Record<TipoServicio, string> = {
  limpieza: "Limpieza",
  ajuste_talla: "Ajuste de talla",
  reparacion: "Reparación",
  rerodinado: "Re-rodinado",
  otro: "Otro",
};
export const TIPOS_SERVICIO: TipoServicio[] = [
  "limpieza",
  "ajuste_talla",
  "reparacion",
  "rerodinado",
  "otro",
];

export type ServicioPieza = {
  id: string;
  pieza_id: string;
  tipo: TipoServicio;
  descripcion: string | null;
  costo: number;
  fecha: string;
  created_at: string;
};

export type PiezaEntregada = {
  id: string;
  pedido_id: string;
  cliente_id: string | null;
  cliente_nombre?: string | null;
  entregada_at: string;
  garantia_meses: number;
  garantia_hasta: string | null;
  aniversario_entrega: string | null;
  aniversario_boda: string | null;
  notas: string | null;
  servicios?: ServicioPieza[];
};

/** Fecha (YYYY-MM-DD) sumando `meses` a una fecha ISO. Para la garantía. */
export function fechaMasMeses(iso: string, meses: number): string {
  const d = new Date(iso);
  d.setMonth(d.getMonth() + meses);
  return d.toISOString().slice(0, 10);
}

/** Solo la parte de fecha (YYYY-MM-DD) de un ISO. */
export function soloFecha(iso: string): string {
  return iso.slice(0, 10);
}

/** Días hasta una fecha YYYY-MM-DD (negativo si ya pasó). null si no hay fecha. */
export function diasHasta(fecha: string | null, hoy = new Date()): number | null {
  if (!fecha) return null;
  const objetivo = new Date(fecha + "T00:00:00");
  const base = new Date(hoy.toISOString().slice(0, 10) + "T00:00:00");
  return Math.round((objetivo.getTime() - base.getTime()) / 86400000);
}

/** Etiqueta relativa de una garantía (vigente / por vencer / vencida). */
export function estadoGarantia(garantiaHasta: string | null): {
  etiqueta: string;
  clase: string;
} {
  const dias = diasHasta(garantiaHasta);
  if (dias == null) return { etiqueta: "Sin garantía", clase: "text-muted-foreground" };
  if (dias < 0) return { etiqueta: "Vencida", clase: "text-muted-foreground" };
  if (dias <= 30) return { etiqueta: `Por vencer (${dias}d)`, clase: "text-warning" };
  return { etiqueta: "Vigente", clase: "text-success" };
}

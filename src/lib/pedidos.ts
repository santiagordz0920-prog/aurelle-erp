/* Constantes y lógica de dominio de Pedidos (§3.4). */

export type LineaNegocio = "bridal" | "concierge";
export type EstadoPedido =
  | "por_confirmar"
  | "confirmado"
  | "en_produccion"
  | "listo_entrega"
  | "entregado"
  | "cancelado";
export type MetodoPago = "efectivo" | "transferencia" | "tarjeta" | "otro";
export type TipoPago = "anticipo_1" | "anticipo_2" | "parcialidad" | "liquidacion";

export type Pago = {
  id: string;
  pedido_id: string;
  monto: number;
  fecha: string;
  metodo: MetodoPago;
  tipo: TipoPago;
  notas: string | null;
  registrado_por: string | null;
  created_at: string;
};

export type Pedido = {
  id: string;
  cliente_id: string;
  cliente_nombre?: string | null;
  cotizacion_id: string | null;
  linea_negocio: LineaNegocio;
  estado: EstadoPedido;
  total: number;
  fecha_compromiso: string | null;
  override_candado: boolean;
  entregado_at: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
  // Derivados / relaciones
  pagos?: Pago[];
  pagado?: number;
  saldo?: number;
  costo_real?: number | null; // solo admin
  margen_sellado?: number | null; // solo admin
};

export const LINEA_NEGOCIO: Record<LineaNegocio, string> = {
  bridal: "Bridal",
  concierge: "Concierge",
};

export const ESTADO_PEDIDO: Record<
  EstadoPedido,
  { etiqueta: string; clase: string }
> = {
  por_confirmar: { etiqueta: "Por confirmar", clase: "bg-muted text-muted-foreground" },
  confirmado: { etiqueta: "Confirmado", clase: "bg-secondary text-secondary-foreground" },
  en_produccion: { etiqueta: "En producción", clase: "bg-accent-soft text-accent" },
  listo_entrega: { etiqueta: "Listo para entrega", clase: "bg-accent-soft text-accent" },
  entregado: { etiqueta: "Entregado", clase: "bg-primary text-primary-foreground" },
  cancelado: { etiqueta: "Cancelado", clase: "bg-muted text-muted-foreground line-through" },
};

export const ESTADOS_PEDIDO: EstadoPedido[] = [
  "por_confirmar",
  "confirmado",
  "en_produccion",
  "listo_entrega",
  "entregado",
  "cancelado",
];

export const TIPO_PAGO: Record<TipoPago, string> = {
  anticipo_1: "Anticipo 1",
  anticipo_2: "Anticipo 2 (30%)",
  parcialidad: "Parcialidad",
  liquidacion: "Liquidación",
};

export const METODO_PAGO: Record<MetodoPago, string> = {
  efectivo: "Efectivo",
  transferencia: "Transferencia",
  tarjeta: "Tarjeta",
  otro: "Otro",
};

/* Semáforo de fecha compromiso (§3.4). */
export function semaforo(
  fecha: string | null,
  estado: EstadoPedido,
): { color: "verde" | "amarillo" | "rojo"; etiqueta: string; clase: string } {
  if (estado === "entregado" || estado === "cancelado" || !fecha) {
    return { color: "verde", etiqueta: "—", clase: "bg-secondary text-secondary-foreground" };
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const compromiso = new Date(fecha + "T00:00:00");
  const dias = Math.round((compromiso.getTime() - hoy.getTime()) / 86400000);
  const enEtapaFinal = estado === "listo_entrega";
  if (dias < 0) {
    return { color: "rojo", etiqueta: `Vencido ${-dias}d`, clase: "bg-destructive text-destructive-foreground" };
  }
  if (dias <= 7 && !enEtapaFinal) {
    return { color: "amarillo", etiqueta: `${dias}d restantes`, clase: "bg-warning/15 text-warning" };
  }
  return { color: "verde", etiqueta: `${dias}d restantes`, clase: "bg-success/15 text-success" };
}

/** ¿Se puede comprar materiales? (candado de anticipo 2, §3.4). */
export function puedeComprarMateriales(pedido: Pedido): boolean {
  if (pedido.override_candado) return true;
  return (pedido.pagos ?? []).some((p) => p.tipo === "anticipo_2");
}

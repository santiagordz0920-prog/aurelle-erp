/* Constantes de dominio de Compras (§3.10). Área Dinero → solo-admin. */

export type TipoCompra = "inventario" | "gasto";
export type CondicionCompra = "contado" | "credito";

export type Compra = {
  id: string;
  proveedor_id: string | null;
  proveedor_nombre?: string | null;
  fecha: string;
  concepto: string;
  tipo: TipoCompra;
  condicion_pago: CondicionCompra;
  monto: number;
  fecha_vencimiento: string | null;
  notas: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const TIPO_COMPRA: Record<TipoCompra, string> = {
  inventario: "Inventario",
  gasto: "Gasto",
};

export const CONDICION_COMPRA: Record<
  CondicionCompra,
  { etiqueta: string; clase: string }
> = {
  contado: { etiqueta: "Contado", clase: "bg-success/15 text-success" },
  credito: { etiqueta: "Crédito", clase: "bg-warning/15 text-warning" },
};

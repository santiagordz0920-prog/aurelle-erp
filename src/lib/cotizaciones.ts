/* Constantes de dominio del Cotizador (§3.3). */

export type Metal = "oro" | "platino" | "paladio" | "plata";
export type EstadoCotizacion =
  | "borrador"
  | "enviada"
  | "seguimiento"
  | "aceptada"
  | "vencida";

export type CotizacionLinea = {
  id: string;
  cotizacion_id: string;
  descripcion: string;
  metal: Metal | null;
  quilataje: string | null;
  item_inventario_id: string | null;
  especificacion: string | null;
  precio: number;
  orden: number;
};

export type Cotizacion = {
  id: string;
  cliente_id: string | null;
  cliente_nombre?: string | null;
  estado: EstadoCotizacion;
  total: number;
  notas: string | null;
  valida_hasta: string | null;
  pdf_url: string | null;
  pedido_id: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
  lineas?: CotizacionLinea[];
  costo_estimado?: number | null; // solo admin
};

export type PrecioMetal = {
  id: string;
  metal: Metal;
  pureza: string | null;
  precio_gramo_mxn: number;
  tipo_cambio_usd_mxn: number | null;
  fecha: string;
  fuente: string;
};

export const METAL: Record<Metal, string> = {
  oro: "Oro",
  platino: "Platino",
  paladio: "Paladio",
  plata: "Plata",
};

export const ESTADO_COTIZACION: Record<
  EstadoCotizacion,
  { etiqueta: string; clase: string }
> = {
  borrador: { etiqueta: "Borrador", clase: "bg-muted text-muted-foreground" },
  enviada: { etiqueta: "Enviada", clase: "bg-secondary text-secondary-foreground" },
  seguimiento: { etiqueta: "Seguimiento", clase: "bg-accent-soft text-accent" },
  aceptada: { etiqueta: "Aceptada", clase: "bg-primary text-primary-foreground" },
  vencida: { etiqueta: "Vencida", clase: "bg-muted text-muted-foreground line-through" },
};

export const ESTADOS_COTIZACION: EstadoCotizacion[] = [
  "borrador",
  "enviada",
  "seguimiento",
  "aceptada",
  "vencida",
];

/* Constantes de dominio de Inventario (§3.6). */

export type TipoItem =
  | "piedra_color"
  | "diamante"
  | "montura"
  | "pieza_terminada"
  | "churumbela";
export type PropiedadItem = "propio" | "consignacion";
export type EstadoItem =
  | "disponible"
  | "reservado"
  | "consumido"
  | "vendido"
  | "devuelto";

export type ItemInventario = {
  id: string;
  sku: string;
  tipo: TipoItem;
  nombre: string;
  descripcion: string | null;
  quilates: number | null;
  color: string | null;
  claridad: string | null;
  corte: string | null;
  propiedad: PropiedadItem;
  consignante_id: string | null;
  consignante_nombre?: string | null;
  ubicacion: string | null;
  estado: EstadoItem;
  foto_url: string | null;
  certificado_url: string | null;
  pedido_id: string | null;
  sucursal_id: string;
  costo?: number | null; // solo presente para admin (RLS oculta a otros)
  created_at: string;
  updated_at: string;
};

export const TIPO_ITEM: Record<TipoItem, string> = {
  piedra_color: "Piedra de color",
  diamante: "Diamante",
  montura: "Montura",
  pieza_terminada: "Pieza terminada",
  churumbela: "Churumbela",
};

export const PROPIEDAD_ITEM: Record<PropiedadItem, string> = {
  propio: "Propio",
  consignacion: "Consignación",
};

export const ESTADOS_ITEM: EstadoItem[] = [
  "disponible",
  "reservado",
  "consumido",
  "vendido",
  "devuelto",
];

export const ESTADO_ITEM: Record<
  EstadoItem,
  { etiqueta: string; clase: string }
> = {
  disponible: { etiqueta: "Disponible", clase: "bg-secondary text-secondary-foreground" },
  reservado: { etiqueta: "Reservado", clase: "bg-accent-soft text-accent" },
  consumido: { etiqueta: "Consumido", clase: "bg-muted text-muted-foreground" },
  vendido: { etiqueta: "Vendido", clase: "bg-primary text-primary-foreground" },
  devuelto: { etiqueta: "Devuelto", clase: "bg-muted text-muted-foreground" },
};

/** Formatea dinero MXN. */
export function pesos(n: number | null | undefined): string {
  if (n == null) return "—";
  return new Intl.NumberFormat("es-MX", {
    style: "currency",
    currency: "MXN",
    maximumFractionDigits: 0,
  }).format(n);
}

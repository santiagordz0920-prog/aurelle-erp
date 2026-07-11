/* Constantes y lógica de dominio de Tareas (§3.15). */

export type PrioridadTarea = "baja" | "media" | "alta";
export type EstadoTarea = "pendiente" | "hecha";
export type OrigenTarea = "manual" | "sugerida";
export type EntidadTarea =
  | "cliente"
  | "pedido"
  | "cotizacion"
  | "item_inventario"
  | "expo"
  | "proveedor";

export type Tarea = {
  id: string;
  titulo: string;
  detalle: string | null;
  responsable_id: string | null;
  responsable_nombre?: string | null;
  prioridad: PrioridadTarea;
  estado: EstadoTarea;
  fecha_vencimiento: string | null;
  entidad_tipo: EntidadTarea | null;
  entidad_id: string | null;
  origen: OrigenTarea;
  descartada?: boolean;
  completada_at: string | null;
  creada_por: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const PRIORIDAD_TAREA: Record<
  PrioridadTarea,
  { etiqueta: string; clase: string; orden: number }
> = {
  alta: { etiqueta: "Alta", clase: "bg-destructive/15 text-destructive", orden: 0 },
  media: { etiqueta: "Media", clase: "bg-warning/15 text-warning", orden: 1 },
  baja: { etiqueta: "Baja", clase: "bg-secondary text-secondary-foreground", orden: 2 },
};

export const PRIORIDADES: PrioridadTarea[] = ["alta", "media", "baja"];

/** Etiqueta y ruta de la entidad vinculada, para enlazar desde la tarea. */
export const ENTIDAD_TAREA: Record<
  EntidadTarea,
  { etiqueta: string; ruta: (id: string) => string | null }
> = {
  cliente: { etiqueta: "Cliente", ruta: (id) => `/clientes/${id}` },
  pedido: { etiqueta: "Pedido", ruta: (id) => `/ventas/pedidos/${id}` },
  cotizacion: { etiqueta: "Cotización", ruta: (id) => `/ventas/cotizaciones/${id}` },
  item_inventario: { etiqueta: "Inventario", ruta: (id) => `/taller/inventario/${id}` },
  expo: { etiqueta: "Expo", ruta: () => null },
  proveedor: { etiqueta: "Proveedor", ruta: () => null },
};

/** Estado temporal de una tarea pendiente respecto a hoy (para el semáforo). */
export function vencimiento(
  fecha: string | null,
  estado: EstadoTarea,
): { estado: "vencida" | "hoy" | "proxima" | "sin_fecha"; etiqueta: string; clase: string } {
  if (estado === "hecha" || !fecha) {
    return { estado: "sin_fecha", etiqueta: fecha ? "" : "Sin fecha", clase: "text-muted-foreground" };
  }
  const hoy = new Date();
  hoy.setHours(0, 0, 0, 0);
  const venc = new Date(fecha + "T00:00:00");
  const dias = Math.round((venc.getTime() - hoy.getTime()) / 86400000);
  if (dias < 0) return { estado: "vencida", etiqueta: `Vencida ${-dias}d`, clase: "text-destructive" };
  if (dias === 0) return { estado: "hoy", etiqueta: "Hoy", clase: "text-warning" };
  return { estado: "proxima", etiqueta: `En ${dias}d`, clase: "text-muted-foreground" };
}

/** ¿La tarea entra en "Hoy"? Pendiente y (vencida, para hoy, o sin fecha). */
export function esDeHoy(t: Tarea): boolean {
  if (t.estado !== "pendiente") return false;
  if (!t.fecha_vencimiento) return true;
  const v = vencimiento(t.fecha_vencimiento, t.estado).estado;
  return v === "vencida" || v === "hoy";
}

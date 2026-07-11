import type { Tarea } from "@/lib/tareas";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";
const SANTIAGO = "00000000-0000-0000-0000-0000000000aa";
const FER = "00000000-0000-0000-0000-0000000000bb";

function hoyMas(dias: number): string {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  return d.toISOString().slice(0, 10);
}

export const TAREAS_MUESTRA: Tarea[] = [
  {
    id: "d1000000-0000-0000-0000-000000000001",
    titulo: "Llamar a Ana por la aprobación del CAD",
    detalle: "Confirmar el render del solitario antes de casting.",
    responsable_id: SANTIAGO,
    responsable_nombre: "Santiago",
    prioridad: "alta",
    estado: "pendiente",
    fecha_vencimiento: hoyMas(0),
    entidad_tipo: "cliente",
    entidad_id: "10000000-0000-0000-0000-000000000001",
    origen: "manual",
    completada_at: null,
    creada_por: SANTIAGO,
    sucursal_id: S,
    created_at: "2026-07-05T16:00:00Z",
    updated_at: "2026-07-05T16:00:00Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000002",
    titulo: "Cobrar parcialidad pendiente del pedido de Carla",
    detalle: null,
    responsable_id: FER,
    responsable_nombre: "Fer",
    prioridad: "media",
    estado: "pendiente",
    fecha_vencimiento: hoyMas(-2),
    entidad_tipo: "pedido",
    entidad_id: "f2000000-0000-0000-0000-000000000002",
    origen: "manual",
    completada_at: null,
    creada_por: SANTIAGO,
    sucursal_id: S,
    created_at: "2026-07-03T16:00:00Z",
    updated_at: "2026-07-03T16:00:00Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000003",
    titulo: "Conteo físico de vitrinas",
    detalle: "Semanal. Cruzar contra inventario.",
    responsable_id: FER,
    responsable_nombre: "Fer",
    prioridad: "baja",
    estado: "pendiente",
    fecha_vencimiento: hoyMas(3),
    entidad_tipo: null,
    entidad_id: null,
    origen: "manual",
    completada_at: null,
    creada_por: FER,
    sucursal_id: S,
    created_at: "2026-07-04T16:00:00Z",
    updated_at: "2026-07-04T16:00:00Z",
  },
  {
    id: "d1000000-0000-0000-0000-000000000004",
    titulo: "Revisar precios de metales vs mercado",
    detalle: "Mensual.",
    responsable_id: SANTIAGO,
    responsable_nombre: "Santiago",
    prioridad: "media",
    estado: "hecha",
    fecha_vencimiento: hoyMas(-5),
    entidad_tipo: null,
    entidad_id: null,
    origen: "manual",
    completada_at: "2026-07-04T18:00:00Z",
    creada_por: SANTIAGO,
    sucursal_id: S,
    created_at: "2026-06-30T16:00:00Z",
    updated_at: "2026-07-04T18:00:00Z",
  },
  {
    // Sugerida por el cron nocturno (§3.15) — muestra el flujo aceptar/descartar.
    id: "d1000000-0000-0000-0000-000000000005",
    titulo: "Cotización sin respuesta: Carla Mendoza",
    detalle: "La cotización se envió hace 6 días y sigue sin respuesta. Da seguimiento al cliente.",
    responsable_id: null,
    responsable_nombre: null,
    prioridad: "media",
    estado: "pendiente",
    fecha_vencimiento: null,
    entidad_tipo: "cotizacion",
    entidad_id: "c1000000-0000-0000-0000-000000000001",
    origen: "sugerida",
    descartada: false,
    completada_at: null,
    creada_por: null,
    sucursal_id: S,
    created_at: hoyMas(0) + "T09:00:00Z",
    updated_at: hoyMas(0) + "T09:00:00Z",
  },
];

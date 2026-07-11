import type { TareaRecurrente } from "@/lib/recurrentes";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

export const RECURRENTES_MUESTRA: TareaRecurrente[] = [
  {
    id: "aa000000-0000-0000-0000-000000000001",
    titulo: "Revisar precios de metales vs mercado",
    detalle: "Actualizar el feed si hay desfase.",
    responsable_id: null,
    responsable_nombre: null,
    prioridad: "media",
    cadencia: "mensual",
    dia: 1,
    activo: true,
    sucursal_id: S,
  },
  {
    id: "aa000000-0000-0000-0000-000000000002",
    titulo: "Conteo físico de vitrinas",
    detalle: "Cruzar contra inventario.",
    responsable_id: null,
    responsable_nombre: null,
    prioridad: "baja",
    cadencia: "semanal",
    dia: 1,
    activo: true,
    sucursal_id: S,
  },
];

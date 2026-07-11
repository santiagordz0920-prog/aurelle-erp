/* Dominio de tareas recurrentes (§3.15, 0032). Cliente-safe. */
import type { PrioridadTarea } from "@/lib/tareas";

export type CadenciaTarea = "semanal" | "mensual";

export type TareaRecurrente = {
  id: string;
  titulo: string;
  detalle: string | null;
  responsable_id: string | null;
  responsable_nombre?: string | null;
  prioridad: PrioridadTarea;
  cadencia: CadenciaTarea;
  dia: number;
  activo: boolean;
  sucursal_id: string;
};

export const DIAS_SEMANA = ["Lunes", "Martes", "Miércoles", "Jueves", "Viernes", "Sábado", "Domingo"];

/** Texto legible de la cadencia ("Cada mes · día 1" / "Cada semana · Lunes"). */
export function cadenciaTexto(c: CadenciaTarea, dia: number): string {
  if (c === "semanal") return `Cada semana · ${DIAS_SEMANA[dia - 1] ?? "Lunes"}`;
  return `Cada mes · día ${dia}`;
}

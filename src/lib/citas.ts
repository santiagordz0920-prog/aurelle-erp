/* Constantes y lógica de dominio de Citas (§3.2). */

export type TipoCita =
  | "primera_visita"
  | "seguimiento"
  | "cierre"
  | "entrega"
  | "postventa"
  | "noche_privada";
export type SalaCita = "piso_ventas" | "closing_room";
export type EstadoCita = "agendada" | "confirmada" | "completada" | "cancelada";
export type ResultadoCita = "no_asistio" | "asistio" | "cotizo" | "cerro";

export type Cita = {
  id: string;
  cliente_id: string;
  cliente_nombre?: string | null;
  cliente_telefono?: string | null;
  tipo: TipoCita;
  sala: SalaCita;
  inicio: string; // ISO timestamptz
  duracion_min: number;
  estado: EstadoCita;
  resultado: ResultadoCita | null;
  pedido_id: string | null;
  notas: string | null;
  creada_por: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const TIPO_CITA: Record<TipoCita, { etiqueta: string; duracion: number }> = {
  primera_visita: { etiqueta: "Primera visita", duracion: 60 },
  seguimiento: { etiqueta: "Seguimiento", duracion: 45 },
  cierre: { etiqueta: "Cierre", duracion: 90 },
  entrega: { etiqueta: "Entrega de pieza", duracion: 45 },
  postventa: { etiqueta: "Postventa / servicio", duracion: 30 },
  noche_privada: { etiqueta: "Noche privada", duracion: 120 },
};

export const SALA_CITA: Record<SalaCita, string> = {
  piso_ventas: "Piso de ventas",
  closing_room: "Closing room",
};

export const ESTADO_CITA: Record<EstadoCita, { etiqueta: string; clase: string }> = {
  agendada: { etiqueta: "Agendada", clase: "bg-secondary text-secondary-foreground" },
  confirmada: { etiqueta: "Confirmada", clase: "bg-accent-soft text-accent" },
  completada: { etiqueta: "Completada", clase: "bg-primary text-primary-foreground" },
  cancelada: { etiqueta: "Cancelada", clase: "bg-muted text-muted-foreground line-through" },
};

export const RESULTADO_CITA: Record<ResultadoCita, { etiqueta: string; clase: string }> = {
  no_asistio: { etiqueta: "No asistió", clase: "bg-destructive/15 text-destructive" },
  asistio: { etiqueta: "Asistió", clase: "bg-secondary text-secondary-foreground" },
  cotizo: { etiqueta: "Cotizó", clase: "bg-accent-soft text-accent" },
  cerro: { etiqueta: "Cerró", clase: "bg-success/15 text-success" },
};

export const TIPOS_CITA: TipoCita[] = [
  "primera_visita",
  "seguimiento",
  "cierre",
  "entrega",
  "postventa",
  "noche_privada",
];
export const SALAS_CITA: SalaCita[] = ["piso_ventas", "closing_room"];
export const RESULTADOS_CITA: ResultadoCita[] = ["asistio", "cotizo", "cerro", "no_asistio"];

/** Fin de la cita a partir de inicio + duración. */
export function finCita(inicio: string, duracionMin: number): Date {
  return new Date(new Date(inicio).getTime() + duracionMin * 60000);
}

/*
  Rango [desde, hasta) del día de Monterrey que contiene `ref`, como instantes ISO
  en UTC (Z). Vercel corre en UTC: calcular "hoy" con setHours() usa el día UTC y
  deja fuera las citas de la tarde/noche (p. ej. 6pm Monterrey = 00:00 UTC del día
  siguiente, cae en "mañana"). Anclamos a Monterrey (UTC-6 fijo; MX sin horario de
  verano desde 2022). Devolver Z hace que la comparación funcione igual contra
  timestamptz (Supabase, por instante) y contra strings ISO Z (modo muestra).
*/
const TZ_MTY = "America/Monterrey";

/** Fecha calendario (YYYY-MM-DD) en horario de Monterrey para un instante dado. */
export function fechaMonterrey(ref: Date = new Date()): string {
  return ref.toLocaleDateString("en-CA", { timeZone: TZ_MTY });
}

/** Rango del día de Monterrey [desde, hasta) como instantes ISO en UTC. */
export function rangoDiaMonterrey(ref: Date = new Date()): { desde: string; hasta: string } {
  const hoy = fechaMonterrey(ref);
  const manana = fechaMonterrey(new Date(ref.getTime() + 86400000));
  return {
    desde: new Date(`${hoy}T00:00:00-06:00`).toISOString(),
    hasta: new Date(`${manana}T00:00:00-06:00`).toISOString(),
  };
}

/** ¿Se traslapan dos citas de la MISMA sala? (para el candado anti doble-reserva). */
export function seTraslapan(
  aInicio: string,
  aDur: number,
  bInicio: string,
  bDur: number,
): boolean {
  const a0 = new Date(aInicio).getTime();
  const a1 = a0 + aDur * 60000;
  const b0 = new Date(bInicio).getTime();
  const b1 = b0 + bDur * 60000;
  return a0 < b1 && b0 < a1;
}

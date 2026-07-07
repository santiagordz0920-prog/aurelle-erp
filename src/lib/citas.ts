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

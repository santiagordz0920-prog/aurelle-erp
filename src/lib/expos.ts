/* Dominio de Expos (§3.14). Cliente-safe. */

export type EstadoExpo = "candidata" | "contratada" | "ejecutada" | "cancelada";

export const ESTADO_EXPO: Record<EstadoExpo, { etiqueta: string; clase: string }> = {
  candidata: { etiqueta: "Candidata", clase: "bg-secondary text-secondary-foreground" },
  contratada: { etiqueta: "Contratada", clase: "bg-accent-soft text-accent" },
  ejecutada: { etiqueta: "Ejecutada", clase: "bg-success/15 text-success" },
  cancelada: { etiqueta: "Cancelada", clase: "bg-muted text-muted-foreground" },
};
export const ESTADOS_EXPO: EstadoExpo[] = ["candidata", "contratada", "ejecutada", "cancelada"];

export type Expo = {
  id: string;
  nombre: string;
  ciudad: string | null;
  fecha_inicio: string | null;
  fecha_fin: string | null;
  estado: EstadoExpo;
  costo: number;
  contacto: string | null;
  notas: string | null;
  sucursal_id: string;
  // ROI (calculado): leads/visitas/cierres/ingreso de los clientes con fuente=esta expo.
  leads?: number;
  visitaron?: number;
  cerraron?: number;
  ingreso?: number;
};

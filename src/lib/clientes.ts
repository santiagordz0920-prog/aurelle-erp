/*
  Constantes de dominio del CRM (§3.1). Etiquetas en español, orden del pipeline
  y clases de color por estado. Un solo lugar para que UI y datos coincidan.
*/

export type CanalFuente = "ads" | "expo" | "referido" | "organico";
export type EstadoPipeline =
  | "nuevo"
  | "conversando"
  | "cita_agendada"
  | "visito"
  | "cotizado"
  | "cerrado"
  | "perdido";

export type Cliente = {
  id: string;
  nombre: string;
  telefono: string | null;
  fecha_nacimiento: string | null;
  fecha_boda: string | null;
  pareja_nombre: string | null;
  fuente_canal: CanalFuente | null;
  fuente_detalle: string | null;
  referido_por_cliente_id: string | null;
  referido_por_externo: string | null;
  etiquetas: string[];
  estado_pipeline: EstadoPipeline;
  motivo_perdida: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export type NotaCliente = {
  id: string;
  cliente_id: string;
  autor_id: string | null;
  autor_nombre?: string | null;
  texto: string;
  created_at: string;
};

export const CANAL_FUENTE: Record<CanalFuente, string> = {
  ads: "Ads",
  expo: "Expo",
  referido: "Referido",
  organico: "Orgánico",
};

// Orden del pipeline de lead (§3.1). El último 'perdido' se maneja aparte.
export const PIPELINE_ORDEN: EstadoPipeline[] = [
  "nuevo",
  "conversando",
  "cita_agendada",
  "visito",
  "cotizado",
  "cerrado",
];

export const ESTADO_PIPELINE: Record<
  EstadoPipeline,
  { etiqueta: string; clase: string }
> = {
  nuevo: { etiqueta: "Nuevo", clase: "bg-secondary text-secondary-foreground" },
  conversando: {
    etiqueta: "Conversando",
    clase: "bg-secondary text-secondary-foreground",
  },
  cita_agendada: {
    etiqueta: "Cita agendada",
    clase: "bg-accent-soft text-accent",
  },
  visito: { etiqueta: "Visitó", clase: "bg-accent-soft text-accent" },
  cotizado: { etiqueta: "Cotizado", clase: "bg-accent-soft text-accent" },
  cerrado: {
    etiqueta: "Cerrado",
    clase: "bg-primary text-primary-foreground",
  },
  perdido: {
    etiqueta: "Perdido",
    clase: "bg-muted text-muted-foreground line-through",
  },
};

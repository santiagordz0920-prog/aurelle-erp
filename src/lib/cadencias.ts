/* Dominio de Follow-ups / cadencias (§ docs/DISENO_FUNNEL_MENSAJES.md).
   Constantes y lógica pura (client-safe): estados, arquetipos, transiciones y
   render de mensajes. El calendario de toques (offsets) vive en la tabla
   `plantilla_cadencia`; aquí van las etiquetas y las reglas de transición. */

export type EstadoCadencia =
  | "nuevo"
  | "caliente"
  | "citado"
  | "cotizado"
  | "no_asistio"
  | "frio"
  | "cliente"
  | "descartado";

export type ArquetipoToque =
  | "continuidad"
  | "valor"
  | "invitacion"
  | "urgencia"
  | "incentivo"
  | "cierre_suave"
  | "confirmacion"
  | "recordatorio"
  | "reactivacion";

export const ESTADO_CADENCIA: Record<
  EstadoCadencia,
  { etiqueta: string; clase: string }
> = {
  nuevo: { etiqueta: "Nuevo", clase: "bg-secondary text-secondary-foreground" },
  caliente: { etiqueta: "Caliente", clase: "bg-accent-soft text-accent" },
  citado: { etiqueta: "Citado", clase: "bg-accent-soft text-accent" },
  cotizado: { etiqueta: "Cotizado", clase: "bg-accent-soft text-accent" },
  no_asistio: { etiqueta: "No asistió", clase: "bg-destructive/15 text-destructive" },
  frio: { etiqueta: "Frío", clase: "bg-muted text-muted-foreground" },
  cliente: { etiqueta: "Cliente", clase: "bg-primary text-primary-foreground" },
  descartado: { etiqueta: "Descartado", clase: "bg-muted text-muted-foreground line-through" },
};

export const ARQUETIPO_TOQUE: Record<ArquetipoToque, string> = {
  continuidad: "Continuidad",
  valor: "Valor",
  invitacion: "Invitación",
  urgencia: "Urgencia verificable",
  incentivo: "Incentivo",
  cierre_suave: "Cierre suave",
  confirmacion: "Confirmación",
  recordatorio: "Recordatorio",
  reactivacion: "Reactivación",
};

/** Orden de columnas del kanban. */
export const ESTADOS_CADENCIA: EstadoCadencia[] = [
  "nuevo",
  "caliente",
  "citado",
  "cotizado",
  "no_asistio",
  "frio",
  "cliente",
  "descartado",
];

/** Estados que reciben toques automáticos (los demás son terminales/manuales). */
export const ESTADOS_ACTIVOS: EstadoCadencia[] = [
  "nuevo",
  "caliente",
  "citado",
  "cotizado",
  "no_asistio",
  "frio",
];

/**
 * A dónde cae el lead cuando se agota su cadencia sin respuesta (§1 del diseño):
 * casi todos → FRIO; FRIO → DESCARTADO. CITADO no se agota por silencio (lo
 * mueve el resultado de la cita), CLIENTE/DESCARTADO son terminales.
 */
export function estadoTrasAgotarCadencia(estado: EstadoCadencia): EstadoCadencia | null {
  switch (estado) {
    case "nuevo":
    case "caliente":
    case "cotizado":
    case "no_asistio":
      return "frio";
    case "frio":
      return "descartado";
    default:
      return null; // citado / cliente / descartado: no se agota por silencio
  }
}

/**
 * Mapea la etapa del pipeline existente al estado de cadencia inicial, para
 * activar el follow-up sin capturar dos veces (DECISIONES: no hay tabla `lead`).
 */
export function cadenciaDesdePipeline(
  pipeline: string,
): EstadoCadencia {
  switch (pipeline) {
    case "nuevo":
      return "nuevo";
    case "conversando":
      return "caliente";
    case "cita_agendada":
      return "citado";
    case "visito":
    case "cotizado":
      return "cotizado";
    case "cerrado":
      return "cliente";
    case "perdido":
      return "descartado";
    default:
      return "nuevo";
  }
}

/** Regla de oro: un entrante reactiva a un lead frío/no-asistió → caliente. */
export function estadoTrasEntrante(estado: EstadoCadencia | null): EstadoCadencia | null {
  if (estado === "frio" || estado === "no_asistio") return "caliente";
  return estado;
}

/** Rellena los placeholders del texto de una plantilla con datos del lead. */
export function renderMensaje(
  texto: string,
  datos: { nombre?: string | null; interes?: string | null; horario?: string | null; fecha?: string | null },
): string {
  return texto
    .replaceAll("{nombre}", (datos.nombre || "").trim() || "hola")
    .replaceAll("{interes}", (datos.interes || "").trim() || "tu pieza")
    .replaceAll("{horario}", (datos.horario || "").trim() || "esta semana")
    .replaceAll("{fecha}", (datos.fecha || "").trim() || "pronto");
}

/** Link wa.me para mandar el toque desde el WhatsApp de la persona (F1). */
export function waMeLink(telefono: string | null | undefined, texto: string): string | null {
  if (!telefono) return null;
  const num = telefono.replace(/[^0-9]/g, "");
  if (num.length < 10) return null;
  return `https://wa.me/${num}?text=${encodeURIComponent(texto)}`;
}

/*
  Constantes de dominio del CRM (§3.1). Etiquetas en español, orden del pipeline
  y clases de color por estado. Un solo lugar para que UI y datos coincidan.
*/

export type CanalFuente = "ads" | "expo" | "referido" | "organico";
export type MetodoContacto = "telefono" | "correo" | "instagram" | "facebook" | "otro";
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
  correo: string | null;
  instagram: string | null;
  facebook: string | null;
  otro_contacto: string | null;
  contacto_preferido: MetodoContacto | null;
  interes: string | null;
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

export const METODO_CONTACTO: Record<MetodoContacto, string> = {
  telefono: "WhatsApp",
  correo: "Correo",
  instagram: "Instagram",
  facebook: "Messenger",
  otro: "Otro",
};

// Orden de fallback cuando no hay contacto_preferido marcado.
const ORDEN_CONTACTO: MetodoContacto[] = [
  "telefono",
  "correo",
  "instagram",
  "facebook",
  "otro",
];

export function valorContacto(
  c: Pick<Cliente, "telefono" | "correo" | "instagram" | "facebook" | "otro_contacto">,
  metodo: MetodoContacto,
): string | null {
  switch (metodo) {
    case "telefono":
      return c.telefono;
    case "correo":
      return c.correo;
    case "instagram":
      return c.instagram;
    case "facebook":
      return c.facebook;
    case "otro":
      return c.otro_contacto;
  }
}

/**
 * El contacto PRINCIPAL del cliente: el preferido si está marcado y tiene
 * valor; si no, el primero con valor en el orden de fallback. Es el único que
 * muestra el CRM en listas — los demás solo se registran en la ficha.
 */
export function contactoPrincipal(
  c: Pick<
    Cliente,
    "telefono" | "correo" | "instagram" | "facebook" | "otro_contacto" | "contacto_preferido"
  >,
): { metodo: MetodoContacto; valor: string } | null {
  if (c.contacto_preferido) {
    const v = valorContacto(c, c.contacto_preferido);
    if (v) return { metodo: c.contacto_preferido, valor: v };
  }
  for (const m of ORDEN_CONTACTO) {
    const v = valorContacto(c, m);
    if (v) return { metodo: m, valor: v };
  }
  return null;
}

/** Teléfono sin separadores: solo dígitos y "+" (WhatsApp lo copia con espacios). */
export function normalizarTelefono(tel: string): string {
  return tel.replace(/[^0-9+]/g, "");
}

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

/*
  Constantes de dominio de Contactos del gremio (tercerización de procesos).
  `tipo` es texto libre en la BD; estas son las opciones sugeridas en la UI.
*/

export type ContactoUtil = {
  id: string;
  nombre: string;
  tipo: string | null;
  contacto: string | null;
  especialidad: string | null;
  tiempo_entrega: string | null;
  precios_estimados: string | null;
  notas: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

/** Opciones sugeridas (el campo admite texto libre para tipos nuevos). */
export const TIPOS_CONTACTO_UTIL = [
  "joyero",
  "vaciador",
  "montador",
  "grabador",
  "otro",
] as const;

export const TIPO_CONTACTO_ETIQUETA: Record<string, string> = {
  joyero: "Joyeros",
  vaciador: "Vaciadores",
  montador: "Montadores",
  grabador: "Grabadores",
  otro: "Otros",
};

/** Etiqueta de grupo para un tipo (los tipos libres se muestran tal cual). */
export function etiquetaTipo(tipo: string | null): string {
  if (!tipo) return "Sin clasificar";
  return TIPO_CONTACTO_ETIQUETA[tipo] ?? tipo;
}

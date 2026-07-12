/* Constantes de dominio de Contactos útiles (tercerización de procesos).
   Vive en Taller y es visible para todos los usuarios: los precios son
   estimados de terceros, no finanzas de Aurelle. */

export type TipoContactoUtil = "joyero" | "vaciador" | "montador" | "otro";

export type ContactoUtil = {
  id: string;
  nombre: string;
  tipo: TipoContactoUtil;
  contacto: string | null;
  especialidad: string | null;
  tiempo_entrega: string | null;
  precio_estimado: string | null;
  notas: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
};

export const TIPOS_CONTACTO_UTIL: {
  valor: TipoContactoUtil;
  etiqueta: string;
  plural: string;
}[] = [
  { valor: "joyero", etiqueta: "Joyero", plural: "Joyeros" },
  { valor: "vaciador", etiqueta: "Vaciador", plural: "Vaciadores" },
  { valor: "montador", etiqueta: "Montador", plural: "Montadores" },
  { valor: "otro", etiqueta: "Otro", plural: "Otros" },
];

export function etiquetaTipoContacto(tipo: TipoContactoUtil): string {
  return TIPOS_CONTACTO_UTIL.find((t) => t.valor === tipo)?.etiqueta ?? tipo;
}

export function pluralTipoContacto(tipo: TipoContactoUtil): string {
  return TIPOS_CONTACTO_UTIL.find((t) => t.valor === tipo)?.plural ?? tipo;
}

/** Orden fijo para agrupar el directorio por oficio. */
export const ORDEN_TIPOS_CONTACTO: TipoContactoUtil[] = [
  "joyero",
  "vaciador",
  "montador",
  "otro",
];

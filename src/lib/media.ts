/*
  Biblioteca de media (§3.8) — constantes y dominio. Los archivos viven en
  Supabase Storage (bucket privado `media`); esta capa define los tipos, las
  etiquetas de la galería (para marketing / referencia en citas) y helpers de
  presentación. Las URLs de visualización son firmadas y de corta vida: se
  generan en la capa de datos (server), nunca se exponen públicamente.
*/

export type TipoMedia = "render" | "cad" | "foto_etapa" | "foto_final" | "referencia" | "otro";

export type Media = {
  id: string;
  tipo: TipoMedia;
  storage_path: string;
  nombre: string | null;
  cliente_id: string | null;
  pedido_id: string | null;
  item_id: string | null;
  orden_id: string | null;
  etapa: string | null;
  version: number;
  aprobado: boolean;
  etiquetas: string[];
  subido_por: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
  /** URL firmada de corta vida (o placeholder en modo muestra). La pone la capa de datos. */
  url?: string | null;
};

export const TIPO_MEDIA: Record<TipoMedia, { etiqueta: string; clase: string }> = {
  render: { etiqueta: "Render", clase: "bg-accent-soft text-accent" },
  cad: { etiqueta: "CAD", clase: "bg-secondary text-secondary-foreground" },
  foto_etapa: { etiqueta: "Foto de etapa", clase: "bg-secondary text-secondary-foreground" },
  foto_final: { etiqueta: "Foto final", clase: "bg-primary text-primary-foreground" },
  referencia: { etiqueta: "Referencia", clase: "bg-muted text-muted-foreground" },
  otro: { etiqueta: "Otro", clase: "bg-muted text-muted-foreground" },
};

export const TIPOS_MEDIA: TipoMedia[] = [
  "render",
  "cad",
  "foto_etapa",
  "foto_final",
  "referencia",
  "otro",
];

/* Etiquetas curadas para la galería (marketing / "algo así como esta" en citas).
   No es un enum en BD (etiquetas es text[]): esta lista alimenta el filtro y el
   selector, pero se pueden capturar libres si hiciera falta. */
export const ETIQUETAS_MEDIA: { grupo: string; opciones: string[] }[] = [
  { grupo: "Estilo", opciones: ["solitario", "halo", "trilogy", "pave", "vintage", "eternity", "churumbela"] },
  { grupo: "Metal", opciones: ["oro_blanco", "oro_amarillo", "oro_rosa", "platino"] },
  { grupo: "Piedra", opciones: ["diamante", "moissanita", "zafiro", "esmeralda", "rubi"] },
];

/** Todas las etiquetas en una lista plana (para validar / poblar filtros). */
export const TODAS_ETIQUETAS: string[] = ETIQUETAS_MEDIA.flatMap((g) => g.opciones);

/** Etiqueta legible de un tag (reemplaza guion bajo por espacio, capitaliza). */
export function etiquetaBonita(tag: string): string {
  const t = tag.replace(/_/g, " ");
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Extensiones de imagen que se muestran inline; el resto (p. ej. CAD) se descarga. */
export function esImagen(nombreOPath: string | null): boolean {
  if (!nombreOPath) return false;
  return /\.(png|jpe?g|webp|gif|avif)$/i.test(nombreOPath);
}

/*
  Mensaje en tono Aurelle para compartir un archivo por WhatsApp (envío asistido:
  lo manda una persona). Incluye la liga firmada solo si es http(s) — en modo
  muestra la url es un data-URI que WhatsApp no puede abrir, así que se omite.
*/
export function mensajeCompartirMedia(
  tipo: TipoMedia,
  clienteNombre: string | null,
  url: string | null,
): string {
  const hola = clienteNombre ? `Hola ${clienteNombre}, ` : "Hola, ";
  const liga = url && /^https?:\/\//i.test(url) ? ` ${url}` : "";
  const cuerpo =
    tipo === "render"
      ? "te comparto el diseño de tu pieza para tu revisión 💍. Cualquier ajuste lo afinamos antes de producción."
      : tipo === "foto_etapa"
        ? "te comparto un avance de tu pieza en el taller ✨."
        : tipo === "foto_final"
          ? "¡tu pieza está lista! Te comparto una foto ✨."
          : "te comparto un archivo de tu pieza.";
  return `${hola}${cuerpo}${liga} — Aurelle & Co.`;
}

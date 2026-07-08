import type { Media } from "@/lib/media";

/*
  DATOS DE MUESTRA — solo modo local (sin Supabase). Como no hay Storage en local,
  la `url` es un placeholder SVG en data-URI con una etiqueta legible: sirve para
  ver la galería con contenido realista sin subir archivos. En producción NUNCA se
  usan; la url real es una URL firmada de Supabase Storage.
*/
const S = "00000000-0000-0000-0000-000000000001";
const ANA = "10000000-0000-0000-0000-000000000001";
const CARLA = "10000000-0000-0000-0000-000000000003";
const PEDIDO_ANA = "f2000000-0000-0000-0000-000000000001";

/** Placeholder SVG (data-URI) con dos tonos de la marca y una etiqueta. */
function placeholder(texto: string, tono: "verde" | "dorado" | "crema"): string {
  const fondo = tono === "verde" ? "#2f4a3c" : tono === "dorado" ? "#c8a45c" : "#efe9dd";
  const tinta = tono === "crema" ? "#2f4a3c" : "#f6f2e9";
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='400' height='400'>
  <rect width='400' height='400' fill='${fondo}'/>
  <text x='50%' y='50%' fill='${tinta}' font-family='Georgia, serif' font-size='24'
    text-anchor='middle' dominant-baseline='middle'>${texto}</text>
</svg>`;
  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`;
}

function hace(dias: number): string {
  return new Date(Date.now() - dias * 86400000).toISOString();
}

export const MEDIA_MUESTRA: Media[] = [
  {
    id: "b0000000-0000-0000-0000-000000000001",
    tipo: "render",
    storage_path: "muestra/ana-render-v1.svg",
    nombre: "Render v1 — solitario",
    cliente_id: ANA,
    pedido_id: PEDIDO_ANA,
    item_id: null,
    orden_id: null,
    etapa: null,
    version: 1,
    aprobado: false,
    etiquetas: ["solitario", "oro_blanco", "diamante"],
    subido_por: null,
    sucursal_id: S,
    created_at: hace(9),
    updated_at: hace(9),
    url: placeholder("Render v1", "crema"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000002",
    tipo: "render",
    storage_path: "muestra/ana-render-v2.svg",
    nombre: "Render v2 — aprobado",
    cliente_id: ANA,
    pedido_id: PEDIDO_ANA,
    item_id: null,
    orden_id: null,
    etapa: null,
    version: 2,
    aprobado: true,
    etiquetas: ["solitario", "oro_blanco", "diamante"],
    subido_por: null,
    sucursal_id: S,
    created_at: hace(6),
    updated_at: hace(6),
    url: placeholder("Render v2 ✓", "verde"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000003",
    tipo: "foto_etapa",
    storage_path: "muestra/ana-engaste.svg",
    nombre: "Engaste en proceso",
    cliente_id: ANA,
    pedido_id: PEDIDO_ANA,
    item_id: null,
    orden_id: null,
    etapa: "engaste",
    version: 1,
    aprobado: false,
    etiquetas: ["solitario", "oro_blanco"],
    subido_por: null,
    sucursal_id: S,
    created_at: hace(2),
    updated_at: hace(2),
    url: placeholder("Engaste", "dorado"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000004",
    tipo: "foto_final",
    storage_path: "muestra/carla-final.svg",
    nombre: "Pieza terminada",
    cliente_id: CARLA,
    pedido_id: null,
    item_id: null,
    orden_id: null,
    etapa: null,
    version: 1,
    aprobado: false,
    etiquetas: ["halo", "oro_amarillo", "zafiro"],
    subido_por: null,
    sucursal_id: S,
    created_at: hace(20),
    updated_at: hace(20),
    url: placeholder("Pieza final", "verde"),
  },
  {
    id: "b0000000-0000-0000-0000-000000000005",
    tipo: "foto_final",
    storage_path: "muestra/galeria-eternity.svg",
    nombre: "Eternity — muestra de galería",
    cliente_id: null,
    pedido_id: null,
    item_id: null,
    orden_id: null,
    etapa: null,
    version: 1,
    aprobado: false,
    etiquetas: ["eternity", "platino", "diamante"],
    subido_por: null,
    sucursal_id: S,
    created_at: hace(40),
    updated_at: hace(40),
    url: placeholder("Eternity", "dorado"),
  },
];

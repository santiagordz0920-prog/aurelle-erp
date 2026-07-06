import type { Conversacion, Mensaje } from "@/lib/inbox";

/* Datos de muestra — solo modo local. NUNCA en producción. */
const S = "00000000-0000-0000-0000-000000000001";

function haceMin(min: number): string {
  return new Date(Date.now() - min * 60000).toISOString();
}

export const MENSAJES_MUESTRA: Mensaje[] = [
  {
    id: "m1", conversacion_id: "cv1", direccion: "entrante", tipo: "texto",
    cuerpo: "Hola, vi su anuncio. Quiero un anillo de compromiso 💍",
    media_url: null, es_ia: false, estado_entrega: null, wa_id: null, autor_id: null,
    created_at: haceMin(180),
  },
  {
    id: "m2", conversacion_id: "cv1", direccion: "saliente", tipo: "texto",
    cuerpo: "¡Hola Ana! Con gusto te acompaño. ¿Tienes en mente algún estilo o presupuesto?",
    media_url: null, es_ia: true, estado_entrega: "leido", wa_id: null, autor_id: null,
    created_at: haceMin(170),
  },
  {
    id: "m3", conversacion_id: "cv1", direccion: "entrante", tipo: "texto",
    cuerpo: "Algo ovalado, oro blanco. Presupuesto ~150 mil.",
    media_url: null, es_ia: false, estado_entrega: null, wa_id: null, autor_id: null,
    created_at: haceMin(60),
  },
  {
    id: "m4", conversacion_id: "cv2", direccion: "entrante", tipo: "texto",
    cuerpo: "Buenas, ¿tienen churumbelas?",
    media_url: null, es_ia: false, estado_entrega: null, wa_id: null, autor_id: null,
    created_at: haceMin(30),
  },
];

export const CONVERSACIONES_MUESTRA: Conversacion[] = [
  {
    id: "cv1",
    cliente_id: "10000000-0000-0000-0000-000000000001",
    cliente_nombre: "Ana López",
    telefono: "528112345678",
    estado: "abierta",
    no_leidos: 1,
    ultimo_at: haceMin(60),
    sucursal_id: S,
    created_at: haceMin(180),
    updated_at: haceMin(60),
  },
  {
    id: "cv2",
    cliente_id: "10000000-0000-0000-0000-000000000003",
    cliente_nombre: "Carla Mendoza",
    telefono: "528187654321",
    estado: "abierta",
    no_leidos: 1,
    ultimo_at: haceMin(30),
    sucursal_id: S,
    created_at: haceMin(30),
    updated_at: haceMin(30),
  },
];

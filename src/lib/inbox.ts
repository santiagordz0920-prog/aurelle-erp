/* Constantes y tipos del Inbox de WhatsApp (§3.1). */

export type EstadoConversacion = "abierta" | "cerrada";
export type DireccionMensaje = "entrante" | "saliente";
export type TipoMensaje = "texto" | "imagen" | "documento" | "audio" | "plantilla";

export type Mensaje = {
  id: string;
  conversacion_id: string;
  direccion: DireccionMensaje;
  tipo: TipoMensaje;
  cuerpo: string | null;
  media_url: string | null;
  es_ia: boolean;
  estado_entrega: string | null;
  wa_id: string | null;
  autor_id: string | null;
  created_at: string;
};

export type Conversacion = {
  id: string;
  cliente_id: string | null;
  cliente_nombre?: string | null;
  telefono: string;
  estado: EstadoConversacion;
  no_leidos: number;
  ultimo_at: string | null;
  sucursal_id: string;
  created_at: string;
  updated_at: string;
  // Derivados / relaciones
  ultimo_cuerpo?: string | null;
  mensajes?: Mensaje[];
};

export const TIPO_MENSAJE_ETIQUETA: Record<TipoMensaje, string> = {
  texto: "Texto",
  imagen: "📷 Imagen",
  documento: "📄 Documento",
  audio: "🎤 Audio",
  plantilla: "Plantilla",
};

/** Hora corta (Monterrey) de un mensaje. */
export function horaMensaje(iso: string): string {
  return new Date(iso).toLocaleTimeString("es-MX", {
    timeZone: "America/Monterrey",
    hour: "2-digit",
    minute: "2-digit",
  });
}

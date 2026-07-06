/*
  Mensajería asistida (interina, pre-riel oficial). Plantillas en tono Aurelle +
  helper para abrir WhatsApp con el texto pre-llenado (wa.me). El envío lo hace
  un humano desde la app → sin automatización que Meta pueda castigar (decisión
  2026-07-06). Cuando el riel oficial esté vivo, estas plantillas alimentan la
  cola de aprobación / lifecycle.

  Nota: estas NO son las "plantillas de Meta" (esas se aprueban aparte para envío
  proactivo por la API). Estas son texto canned para envío manual.
*/

export type PlantillaMensaje = {
  id: string;
  etiqueta: string;
  descripcion: string;
  cuerpo: (ctx: { nombre: string; pareja?: string | null }) => string;
};

const firma = "— Aurelle & Co.";

export const PLANTILLAS_MENSAJE: PlantillaMensaje[] = [
  {
    id: "bienvenida",
    etiqueta: "Bienvenida",
    descripcion: "Primer contacto con un lead nuevo.",
    cuerpo: ({ nombre }) =>
      `Hola ${nombre}, qué gusto saludarte. Soy del equipo de Aurelle, joyería de compromiso en Monterrey. Me encantaría acompañarte a encontrar la pieza perfecta. ¿Me cuentas un poco de lo que tienes en mente? ${firma}`,
  },
  {
    id: "seguimiento_visita",
    etiqueta: "Seguimiento post-visita",
    descripcion: "Después de una visita al showroom que no cerró.",
    cuerpo: ({ nombre }) =>
      `Hola ${nombre}, fue un placer recibirte en Ellion. Me quedé pensando en tu proyecto y quiero asegurarme de resolver cualquier duda que te haya quedado. Estoy a tus órdenes cuando quieras dar el siguiente paso. ${firma}`,
  },
  {
    id: "recordatorio_pago",
    etiqueta: "Recordatorio de pago",
    descripcion: "Anticipo o parcialidad pendiente, con tacto.",
    cuerpo: ({ nombre }) =>
      `Hola ${nombre}, un recordatorio amable sobre el saldo de tu pieza. Cuando gustes te comparto los datos o coordinamos el pago; cualquier facilidad la vemos con gusto. ${firma}`,
  },
  {
    id: "confirmacion_cita",
    etiqueta: "Confirmar cita",
    descripcion: "Confirmación de una visita agendada.",
    cuerpo: ({ nombre }) =>
      `Hola ${nombre}, te confirmamos tu cita en nuestro showroom Ellion. Si necesitas mover el horario, con toda confianza me avisas. Te esperamos. ${firma}`,
  },
  {
    id: "render_listo",
    etiqueta: "Render listo",
    descripcion: "Avisar que el diseño está listo para revisar.",
    cuerpo: ({ nombre }) =>
      `Hola ${nombre}, ¡tu render está listo! Quedó precioso. Te lo comparto para que lo revises con calma; cualquier ajuste lo afinamos antes de producción. ${firma}`,
  },
  {
    id: "cumpleanos",
    etiqueta: "Cumpleaños",
    descripcion: "Felicitación breve y cálida.",
    cuerpo: ({ nombre }) =>
      `¡Feliz cumpleaños, ${nombre}! Te deseamos un día tan especial como tú. Con cariño, ${firma}`,
  },
  {
    id: "aniversario",
    etiqueta: "Aniversario de boda",
    descripcion: "Reactivación en el aniversario (churumbela/eternity).",
    cuerpo: ({ nombre, pareja }) =>
      `Hola ${nombre}, ¡feliz aniversario${pareja ? ` a ${pareja} y a ti` : ""}! Celebrar el amor que ayudamos a sellar nos llena. Si quieren conmemorarlo con una pieza, tenemos ideas hermosas para ustedes. ${firma}`,
  },
  {
    id: "libre",
    etiqueta: "Mensaje libre",
    descripcion: "Empieza en blanco y escribe tú.",
    cuerpo: () => "",
  },
];

/** Normaliza un teléfono MX a formato wa.me (dígitos, con lada 52). */
export function telefonoWa(telefono: string): string | null {
  const d = telefono.replace(/\D/g, "");
  if (!d) return null;
  if (d.startsWith("52")) return d;
  if (d.length === 10) return `52${d}`; // celular MX sin lada país
  return d; // ya trae lada país u otro formato; se usa tal cual
}

/** Link que abre WhatsApp con el texto pre-llenado (lo envía un humano). */
export function linkWhatsApp(telefono: string, texto: string): string | null {
  const num = telefonoWa(telefono);
  if (!num) return null;
  const q = texto ? `?text=${encodeURIComponent(texto)}` : "";
  return `https://wa.me/${num}${q}`;
}

/*
  Fechas clave del CRM (§3.1 lifecycle): cumpleaños y aniversarios de boda
  próximos, para un saludo asistido por WhatsApp. Sin migración: corre sobre el
  `cliente` (0004). El envío lo hace un humano con las plantillas cumpleaños /
  aniversario — la cadencia automática por cron llega con el riel oficial.
*/

const TZ = "America/Monterrey";

export type TipoFechaClave = "cumpleanos" | "aniversario";

export type FechaClave = {
  cliente_id: string;
  cliente_nombre: string;
  telefono: string | null;
  tipo: TipoFechaClave;
  pareja: string | null;
  fecha: string; // fecha original (ISO date)
  dias: number; // días hasta la próxima ocurrencia (0 = hoy)
  anios: number | null; // años que se cumplen (edad para cumpleaños); null si no aplica
};

/** Hoy a medianoche en horario de Monterrey (cuenta días sin corrimiento de zona). */
export function hoyMonterrey(): Date {
  const partes = new Intl.DateTimeFormat("en-CA", {
    timeZone: TZ,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
  const [y, m, d] = partes.split("-").map(Number);
  const hoy = new Date(y, m - 1, d);
  hoy.setHours(0, 0, 0, 0);
  return hoy;
}

/** Días hasta la próxima ocurrencia anual de una fecha (0 = hoy, 1 = mañana…). */
export function diasHastaAniversario(isoFecha: string, hoy = hoyMonterrey()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoFecha);
  if (!m) return null;
  const mes = Number(m[2]);
  const dia = Number(m[3]);
  let prox = new Date(hoy.getFullYear(), mes - 1, dia);
  prox.setHours(0, 0, 0, 0);
  if (prox.getTime() < hoy.getTime()) {
    prox = new Date(hoy.getFullYear() + 1, mes - 1, dia);
    prox.setHours(0, 0, 0, 0);
  }
  return Math.round((prox.getTime() - hoy.getTime()) / 86400000);
}

/** Años que se cumplen en la próxima ocurrencia (edad para cumpleaños). */
export function aniosEnProxima(isoFecha: string, hoy = hoyMonterrey()): number | null {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoFecha);
  if (!m) return null;
  const anioOrigen = Number(m[1]);
  const dias = diasHastaAniversario(isoFecha, hoy);
  if (dias === null) return null;
  const anioProx = new Date(hoy.getTime() + dias * 86400000).getFullYear();
  const n = anioProx - anioOrigen;
  return n > 0 && n < 150 ? n : null;
}

/** Etiqueta humana de cuándo cae ("hoy", "mañana", "en 5 días"). */
export function etiquetaDias(dias: number): string {
  if (dias === 0) return "hoy";
  if (dias === 1) return "mañana";
  return `en ${dias} días`;
}

/** Fecha corta legible (día y mes), sin corrimiento de zona. */
export function fechaCorta(isoFecha: string): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(isoFecha);
  if (!m) return isoFecha;
  return new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3])).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
  });
}

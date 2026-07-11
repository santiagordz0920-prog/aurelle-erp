import "server-only";

/*
  Disponibilidad del showroom para el BOT (pedido de Fer 2026-07-11): en vez de
  preguntar "¿qué día podrías?", el bot propone horarios concretos que de verdad
  están libres. Reglas:
  - Horario de visitas: TODOS los días, 10:00-20:00 Monterrey (última cita
    empieza 19:00). Citas de 60 min en piso_ventas.
  - Libre = no se traslapa con una cita agendada/confirmada de esa sala NI está
    sugerido en otra conversación en las últimas 24 h (tabla sugerencia_horario,
    0035 — candado entre chats simultáneos).
  - Nunca se sugiere algo a menos de 3 h de anticipación.
  Si la tabla 0035 aún no existe en prod, el candado entre chats se omite con
  gracia (la disponibilidad contra citas reales sigue funcionando).
*/

const ABRE_H = 10; // 10:00 Monterrey
const ULTIMA_CITA_H = 19; // última cita empieza 19:00 (cierran 20:00)
const DURACION_MIN = 60;
const SALA = "piso_ventas";
const ANTICIPACION_MS = 3 * 60 * 60 * 1000; // no sugerir a <3 h
const VIGENCIA_SUGERENCIA_MS = 24 * 60 * 60 * 1000;
const OFFSET_MTY = "-06:00"; // MX sin horario de verano desde 2022

export type HorarioCandidato = { iso: string; etiqueta: string };

/** "martes 15 de julio, 5:00 p.m." (hora Monterrey), para el prompt del bot. */
export function etiquetaHorario(iso: string): string {
  return new Date(iso).toLocaleString("es-MX", {
    timeZone: "America/Monterrey",
    weekday: "long",
    day: "numeric",
    month: "long",
    hour: "numeric",
    minute: "2-digit",
  });
}

/** Fecha YYYY-MM-DD del día de Monterrey `dias` días después de ahora. */
function fechaMty(dias: number): string {
  const d = new Date(Date.now() + dias * 24 * 60 * 60 * 1000);
  return d.toLocaleDateString("en-CA", { timeZone: "America/Monterrey" });
}

/**
 * Próximos `n` horarios libres del showroom (ISO), saltando citas reales y
 * slots ya sugeridos en otros chats.
 */
export async function proximosHorarios(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversacionId: string,
  n = 2,
): Promise<HorarioCandidato[]> {
  const ahora = Date.now();
  const desdeIso = new Date(ahora).toISOString();

  // Citas ocupadas de la sala en los próximos 8 días.
  const { data: citas } = await supabase
    .from("cita")
    .select("inicio, duracion_min")
    .eq("sala", SALA)
    .in("estado", ["agendada", "confirmada"])
    .gte("inicio", desdeIso)
    .lte("inicio", new Date(ahora + 8 * 24 * 60 * 60 * 1000).toISOString());

  // Slots sugeridos en OTRAS conversaciones (vigentes). Si la tabla no existe
  // aún (0035 sin aplicar), seguimos sin este candado.
  let sugeridos: { inicio: string; conversacion_id: string }[] = [];
  const { data: sug, error: errSug } = await supabase
    .from("sugerencia_horario")
    .select("inicio, conversacion_id")
    .gte("created_at", new Date(ahora - VIGENCIA_SUGERENCIA_MS).toISOString());
  if (!errSug && sug) sugeridos = sug;

  const ocupado = (slotMs: number): boolean => {
    const slotFin = slotMs + DURACION_MIN * 60 * 1000;
    for (const c of citas ?? []) {
      const ini = new Date(c.inicio).getTime();
      const fin = ini + (c.duracion_min ?? 60) * 60 * 1000;
      if (slotMs < fin && ini < slotFin) return true;
    }
    for (const s of sugeridos) {
      if (s.conversacion_id === conversacionId) continue; // su propio apartado no estorba
      if (new Date(s.inicio).getTime() === slotMs) return true;
    }
    return false;
  };

  // Todos los slots libres de la ventana, calificados por qué tan buenos son
  // para CERRAR cita (no el primero cronológico: eso proponía sábado 7 pm).
  const libres: { ms: number; iso: string; puntaje: number; fecha: string }[] = [];
  for (let dia = 0; dia <= 7; dia++) {
    const fecha = fechaMty(dia);
    for (let h = ABRE_H; h <= ULTIMA_CITA_H; h++) {
      const iso = `${fecha}T${String(h).padStart(2, "0")}:00:00${OFFSET_MTY}`;
      const ms = new Date(iso).getTime();
      if (ms < ahora + ANTICIPACION_MS) continue;
      if (ocupado(ms)) continue;
      libres.push({ ms, iso, fecha, puntaje: puntajeSlot(ms, dia) });
    }
  }
  libres.sort((a, b) => b.puntaje - a.puntaje);

  // Principal = el mejor calificado; los siguientes, el mejor de OTRO día cada
  // uno (dos opciones del mismo día no le sirven a quien no puede ese día).
  const candidatos: HorarioCandidato[] = [];
  const fechasUsadas = new Set<string>();
  for (const s of libres) {
    if (candidatos.length >= n) break;
    if (fechasUsadas.has(s.fecha)) continue;
    fechasUsadas.add(s.fecha);
    candidatos.push({ iso: new Date(s.ms).toISOString(), etiqueta: etiquetaHorario(s.iso) });
  }
  return candidatos;
}

/*
  Calificación de un slot (mayor = mejor). Pesos iniciales acordados con Fer
  (2026-07-11) — SE ITERAN con datos reales (qué horarios convierten y a cuáles
  sí llegan; cuando haya volumen, esto se vuelve data-driven):
  - Franjas doradas: media mañana-mediodía (11-13) y tarde (16-18) — cómodas
    para el equipo y las más probables para el cliente.
  - Franja de comida (14-15) floja; 10 am regular; 7 pm mala (nadie quiere ir
    a esa hora y al equipo le cierra el día).
  - Sábado brilla al mediodía y se castiga en la noche; domingo un escalón
    abajo y también castigado en la noche. Entre semana, 5-6 pm suma (después
    de la oficina).
  - Lo pronto convierte más: bonus que decae por día de distancia.
*/
const PUNTAJE_HORA: Record<number, number> = {
  10: 6, 11: 9, 12: 9, 13: 8, 14: 4, 15: 4, 16: 8, 17: 9, 18: 7, 19: 2,
};

function puntajeSlot(ms: number, diasDesdeHoy: number): number {
  const mty = new Date(ms - 6 * 60 * 60 * 1000); // reloj Monterrey (UTC-6 fijo)
  const hora = mty.getUTCHours();
  const dow = mty.getUTCDay(); // 0=dom, 6=sáb

  let p = PUNTAJE_HORA[hora] ?? 3;
  if (dow === 6) {
    if (hora >= 17) p -= 4; // sábado en la noche: espantoso (palabras de Fer)
    if (hora >= 11 && hora <= 13) p += 1; // sábado al mediodía: el clásico
  } else if (dow === 0) {
    p -= 1; // domingo, un escalón abajo
    if (hora >= 17) p -= 4;
  } else if (hora === 17 || hora === 18) {
    p += 1; // entre semana saliendo de la oficina
  }
  p += Math.max(0, 3 - diasDesdeHoy * 0.5); // lo pronto convierte más
  return p;
}

/**
 * Aparta un horario para esta conversación (candado entre chats). Borra
 * primero las sugerencias vencidas para liberar el unique index. Si el insert
 * falla (carrera con otro chat o tabla sin aplicar), no rompe el flujo.
 */
export async function apartarHorario(
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  supabase: any,
  conversacionId: string,
  inicioIso: string,
): Promise<void> {
  try {
    await supabase
      .from("sugerencia_horario")
      .delete()
      .lt("created_at", new Date(Date.now() - VIGENCIA_SUGERENCIA_MS).toISOString());
    await supabase.from("sugerencia_horario").insert({
      conversacion_id: conversacionId,
      sala: SALA,
      inicio: inicioIso,
    });
  } catch {
    // Carrera perdida o 0035 sin aplicar: el mensaje ya salió; no es crítico.
  }
}

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

  const candidatos: HorarioCandidato[] = [];
  for (let dia = 0; dia <= 7 && candidatos.length < n; dia++) {
    const fecha = fechaMty(dia);
    for (let h = ABRE_H; h <= ULTIMA_CITA_H && candidatos.length < n; h++) {
      const iso = `${fecha}T${String(h).padStart(2, "0")}:00:00${OFFSET_MTY}`;
      const ms = new Date(iso).getTime();
      if (ms < ahora + ANTICIPACION_MS) continue;
      if (ocupado(ms)) continue;
      candidatos.push({ iso: new Date(ms).toISOString(), etiqueta: etiquetaHorario(iso) });
    }
  }
  return candidatos;
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

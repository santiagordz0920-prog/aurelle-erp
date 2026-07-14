import { NextResponse } from "next/server";
import { correrAsistente, type TurnoChat } from "@/lib/ia/asistente";
import {
  confirmarAccion,
  HERRAMIENTAS_SENSIBLES,
  type AccionPendiente,
} from "@/lib/ia/asistente-herramientas";

/*
  Endpoint del asistente interno del ERP (§3.19). El widget flotante manda el
  historial del chat; aquí corremos el loop de tool use con la SESIÓN DEL USUARIO
  (RLS): esta ruta NO es pública (el middleware exige sesión), así que el
  asistente ve exactamente lo que el usuario logueado puede ver.

  Tool use puede encadenar varias llamadas al modelo; damos margen de tiempo.
*/
export const maxDuration = 60;

export async function POST(req: Request) {
  let cuerpo: { mensajes?: TurnoChat[]; confirmar?: AccionPendiente; path?: string };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
  }

  // Confirmación de una acción sensible: la ejecuta de forma determinista (el
  // usuario ya apretó "Confirmar"; no vuelve a pasar por el modelo). Corre con
  // la sesión del usuario, así que RLS re-valida los permisos (p.ej. pagos =
  // solo-admin) aunque el payload venga del cliente.
  if (cuerpo.confirmar) {
    const p = cuerpo.confirmar;
    if (
      !p ||
      typeof p.herramienta !== "string" ||
      !HERRAMIENTAS_SENSIBLES.has(p.herramienta) ||
      typeof p.args !== "object" ||
      p.args == null
    ) {
      return NextResponse.json({ error: "Acción a confirmar no válida." }, { status: 400 });
    }
    try {
      const r = await confirmarAccion(p);
      return NextResponse.json({ respuesta: r.texto, enlaces: r.enlace ? [r.enlace] : [] });
    } catch {
      return NextResponse.json(
        { error: "No pude ejecutar la acción. Intenta de nuevo." },
        { status: 500 },
      );
    }
  }

  const mensajes = Array.isArray(cuerpo.mensajes) ? cuerpo.mensajes : [];
  const limpios: TurnoChat[] = mensajes
    .filter(
      (m): m is TurnoChat =>
        m != null &&
        (m.role === "user" || m.role === "assistant") &&
        typeof m.content === "string",
    )
    .slice(-20); // ventana de contexto acotada

  if (limpios.length === 0 || limpios[limpios.length - 1].role !== "user") {
    return NextResponse.json({ error: "Falta el mensaje del usuario." }, { status: 400 });
  }

  const path = typeof cuerpo.path === "string" ? cuerpo.path : undefined;
  try {
    const { respuesta, enlaces, pendiente } = await correrAsistente(limpios, path);
    return NextResponse.json({ respuesta, enlaces, pendiente });
  } catch {
    return NextResponse.json(
      { error: "No pude procesar eso ahora. Intenta de nuevo en un momento." },
      { status: 500 },
    );
  }
}

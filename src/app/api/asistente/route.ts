import { NextResponse } from "next/server";
import { correrAsistente, type TurnoChat } from "@/lib/ia/asistente";

/*
  Endpoint del asistente interno del ERP (§3.19). El widget flotante manda el
  historial del chat; aquí corremos el loop de tool use con la SESIÓN DEL USUARIO
  (RLS): esta ruta NO es pública (el middleware exige sesión), así que el
  asistente ve exactamente lo que el usuario logueado puede ver.

  Tool use puede encadenar varias llamadas al modelo; damos margen de tiempo.
*/
export const maxDuration = 60;

export async function POST(req: Request) {
  let cuerpo: { mensajes?: TurnoChat[] };
  try {
    cuerpo = await req.json();
  } catch {
    return NextResponse.json({ error: "Cuerpo no válido." }, { status: 400 });
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

  try {
    const { respuesta, enlaces } = await correrAsistente(limpios);
    return NextResponse.json({ respuesta, enlaces });
  } catch {
    return NextResponse.json(
      { error: "No pude procesar eso ahora. Intenta de nuevo en un momento." },
      { status: 500 },
    );
  }
}

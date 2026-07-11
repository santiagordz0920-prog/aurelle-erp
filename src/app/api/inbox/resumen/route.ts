import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";

/*
  Resumen del Inbox para el widget flotante (visible en toda la app): qué
  conversaciones necesitan atención — mensajes sin leer o borradores de la IA
  esperando aprobación. Ruta autenticada (RLS filtra por sucursal/rol); el
  widget la sondea cada ~25 s.
*/

export type ItemResumenInbox = {
  id: string;
  nombre: string | null;
  telefono: string;
  no_leidos: number;
  borradores: number;
  ultimo_at: string | null;
};

export async function GET() {
  if (!supabaseConfigurado()) {
    return NextResponse.json({ items: [], pendientes: 0 });
  }
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) {
    return NextResponse.json({ error: "sin sesión" }, { status: 401 });
  }

  // Borradores de IA pendientes de aprobar, agrupados por conversación.
  const { data: borradores } = await supabase
    .from("mensaje")
    .select("conversacion_id")
    .eq("estado_entrega", "borrador_ia")
    .limit(200);
  const porConv = new Map<string, number>();
  for (const b of borradores ?? []) {
    porConv.set(b.conversacion_id, (porConv.get(b.conversacion_id) ?? 0) + 1);
  }

  // Conversaciones con no-leídos + las que tienen borrador (aunque estén leídas).
  const { data: convs } = await supabase
    .from("conversacion")
    .select("id, telefono, no_leidos, ultimo_at, cliente(nombre)")
    .or(
      porConv.size > 0
        ? `no_leidos.gt.0,id.in.(${[...porConv.keys()].join(",")})`
        : "no_leidos.gt.0",
    )
    .order("ultimo_at", { ascending: false })
    .limit(10);

  const items: ItemResumenInbox[] = (convs ?? []).map((c) => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const cli = c.cliente as any;
    return {
      id: c.id,
      nombre: Array.isArray(cli) ? (cli[0]?.nombre ?? null) : (cli?.nombre ?? null),
      telefono: c.telefono,
      no_leidos: c.no_leidos,
      borradores: porConv.get(c.id) ?? 0,
      ultimo_at: c.ultimo_at,
    };
  });

  const pendientes = items.reduce(
    (s, i) => s + (i.no_leidos > 0 ? 1 : 0) + (i.borradores > 0 ? 1 : 0),
    0,
  );
  return NextResponse.json({ items, pendientes });
}

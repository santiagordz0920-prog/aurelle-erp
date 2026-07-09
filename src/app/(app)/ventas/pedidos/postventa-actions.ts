"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { fechaMasMeses, soloFecha, type TipoServicio } from "@/lib/postventa";
import { PIEZAS_MUESTRA, SERVICIOS_MUESTRA } from "@/lib/data/postventa-muestra";
import { PEDIDOS_MUESTRA } from "@/lib/data/pedidos-muestra";
import { CLIENTES_MUESTRA } from "@/lib/data/clientes-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const GARANTIA_MESES_DEFAULT = 12;

/*
  Reacción §4 "Pedido entregado → Postventa crea registro (garantía + aniversarios)".
  Idempotente por `pedido_id` único: si ya existe la pieza, no hace nada. Se llama
  desde `entregarPedido`.
*/
export async function crearPiezaEntregadaSiNoExiste(pedidoId: string): Promise<void> {
  const ahora = new Date().toISOString();
  const garantiaHasta = fechaMasMeses(ahora, GARANTIA_MESES_DEFAULT);
  const aniversarioEntrega = soloFecha(ahora);

  if (!supabaseConfigurado()) {
    if (PIEZAS_MUESTRA.some((p) => p.pedido_id === pedidoId)) return;
    const pedido = PEDIDOS_MUESTRA.find((p) => p.id === pedidoId);
    const cliente = pedido ? CLIENTES_MUESTRA.find((c) => c.id === pedido.cliente_id) : undefined;
    PIEZAS_MUESTRA.unshift({
      id: `pe000000-0000-0000-0000-0000000000${(PIEZAS_MUESTRA.length + 10).toString().slice(-2)}`,
      pedido_id: pedidoId,
      cliente_id: pedido?.cliente_id ?? null,
      cliente_nombre: cliente?.nombre ?? pedido?.cliente_nombre ?? null,
      entregada_at: ahora,
      garantia_meses: GARANTIA_MESES_DEFAULT,
      garantia_hasta: garantiaHasta,
      aniversario_entrega: aniversarioEntrega,
      aniversario_boda: cliente?.fecha_boda ?? null,
      notas: null,
      servicios: [],
    });
    return;
  }

  const supabase = await createClient();
  // Idempotencia: ¿ya hay pieza para este pedido?
  const { data: existe } = await supabase
    .from("pieza_entregada")
    .select("id")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (existe) return;

  const { data: pedido } = await supabase
    .from("pedido")
    .select("cliente_id, sucursal_id, cliente:cliente_id(fecha_boda)")
    .eq("id", pedidoId)
    .maybeSingle();
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const rel = pedido as any;
  const fechaBoda = Array.isArray(rel?.cliente)
    ? (rel.cliente[0]?.fecha_boda ?? null)
    : (rel?.cliente?.fecha_boda ?? null);

  await supabase.from("pieza_entregada").insert({
    pedido_id: pedidoId,
    cliente_id: pedido?.cliente_id ?? null,
    entregada_at: ahora,
    garantia_meses: GARANTIA_MESES_DEFAULT,
    garantia_hasta: garantiaHasta,
    aniversario_entrega: aniversarioEntrega,
    aniversario_boda: fechaBoda,
    sucursal_id: pedido?.sucursal_id ?? undefined,
  });
  revalidatePath(`/ventas/pedidos/${pedidoId}`);
  revalidatePath("/clientes/postventa");
}

const servicioSchema = z.object({
  pieza_id: z.string().uuid(),
  pedido_id: z.string().uuid(),
  tipo: z.enum(["limpieza", "ajuste_talla", "reparacion", "rerodinado", "otro"]),
  descripcion: z.string().trim().optional(),
  costo: z.coerce.number().min(0, "El costo no puede ser negativo."),
});

/** Registra un servicio en el historial de una pieza (0 = cortesía). */
export async function registrarServicio(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = servicioSchema.safeParse({
    pieza_id: formData.get("pieza_id"),
    pedido_id: formData.get("pedido_id"),
    tipo: formData.get("tipo"),
    descripcion: formData.get("descripcion"),
    costo: formData.get("costo"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos inválidos." };
  const d = parsed.data;

  if (!supabaseConfigurado()) {
    SERVICIOS_MUESTRA.unshift({
      id: `sv000000-0000-0000-0000-0000000000${(SERVICIOS_MUESTRA.length + 10).toString().slice(-2)}`,
      pieza_id: d.pieza_id,
      tipo: d.tipo as TipoServicio,
      descripcion: d.descripcion || null,
      costo: d.costo,
      fecha: new Date().toISOString().slice(0, 10),
      created_at: new Date().toISOString(),
    });
    revalidatePath(`/ventas/pedidos/${d.pedido_id}`);
    return { ok: true };
  }

  const usuario = await getUsuarioActual();
  const supabase = await createClient();
  const { error } = await supabase.from("servicio_pieza").insert({
    pieza_id: d.pieza_id,
    tipo: d.tipo,
    descripcion: d.descripcion || null,
    costo: d.costo,
    registrado_por: usuario.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el servicio." };
  revalidatePath(`/ventas/pedidos/${d.pedido_id}`);
  return { ok: true };
}

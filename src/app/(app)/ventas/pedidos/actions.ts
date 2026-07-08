"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { EstadoPedido, LineaNegocio, Pago } from "@/lib/pedidos";
import { PEDIDOS_MUESTRA } from "@/lib/data/pedidos-muestra";
import { COTIZACIONES_MUESTRA } from "@/lib/data/cotizaciones-muestra";
import { ITEMS_MUESTRA } from "@/lib/data/inventario-muestra";
import { crearContratoSiNoExiste } from "./documentos-actions";

export type ResultadoAccion = { ok: boolean; error?: string };

function revalidarPedido(id: string) {
  revalidatePath("/ventas/pedidos");
  revalidatePath(`/ventas/pedidos/${id}`);
}

/* ── Conversión desde cotización (un clic) ──────────────────────────────────
   Copia cliente y total; enlaza cotizacion.pedido_id. Línea de negocio arranca
   en 'bridal' (obligatoria) y se ajusta luego en el pedido. */
export async function crearPedidoDesdeCotizacion(
  cotizacionId: string,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    const c = COTIZACIONES_MUESTRA.find((x) => x.id === cotizacionId);
    if (!c) return { ok: false, error: "Cotización no encontrada." };
    if (c.pedido_id) redirect(`/ventas/pedidos/${c.pedido_id}`);
    const nuevoId = `f2000000-0000-0000-0000-0000000009${(PEDIDOS_MUESTRA.length + 10)
      .toString()
      .slice(-2)}`;
    PEDIDOS_MUESTRA.unshift({
      id: nuevoId,
      cliente_id: c.cliente_id ?? "10000000-0000-0000-0000-000000000001",
      cliente_nombre: c.cliente_nombre ?? null,
      cotizacion_id: c.id,
      linea_negocio: "bridal",
      estado: "por_confirmar",
      total: c.total,
      fecha_compromiso: null,
      override_candado: false,
      entregado_at: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      costo_real: null,
      margen_sellado: null,
      pagos: [],
    });
    c.pedido_id = nuevoId;
    revalidatePath("/ventas/pedidos");
    revalidatePath(`/ventas/cotizaciones/${cotizacionId}`);
    redirect(`/ventas/pedidos/${nuevoId}`);
  }

  const supabase = await createClient();
  const { data: cot } = await supabase
    .from("cotizacion")
    .select("id, cliente_id, total, pedido_id")
    .eq("id", cotizacionId)
    .maybeSingle();
  if (!cot) return { ok: false, error: "Cotización no encontrada." };
  if (cot.pedido_id) redirect(`/ventas/pedidos/${cot.pedido_id}`);
  if (!cot.cliente_id)
    return { ok: false, error: "La cotización necesita un cliente para convertirse en pedido." };

  const { data: nuevo, error } = await supabase
    .from("pedido")
    .insert({
      cliente_id: cot.cliente_id,
      cotizacion_id: cot.id,
      linea_negocio: "bridal",
      total: cot.total,
      sucursal_id: usuario.sucursalId,
    })
    .select("id")
    .single();
  if (error || !nuevo) return { ok: false, error: "No se pudo crear el pedido." };

  await supabase.from("cotizacion").update({ pedido_id: nuevo.id }).eq("id", cot.id);
  revalidatePath("/ventas/pedidos");
  revalidatePath(`/ventas/cotizaciones/${cotizacionId}`);
  redirect(`/ventas/pedidos/${nuevo.id}`);
}

/* ── Registro de pago en 3 toques: monto / método / tipo ────────────────────*/
const pagoSchema = z.object({
  pedido_id: z.string().uuid(),
  monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
  metodo: z.enum(["efectivo", "transferencia", "tarjeta", "otro"]),
  tipo: z.enum(["anticipo_1", "anticipo_2", "parcialidad", "liquidacion"]),
  notas: z.string().trim().optional().nullable(),
});

export async function registrarPago(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = pagoSchema.safeParse({
    pedido_id: formData.get("pedido_id"),
    monto: formData.get("monto"),
    metodo: formData.get("metodo"),
    tipo: formData.get("tipo"),
    notas: (formData.get("notas") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === d.pedido_id);
    if (!p) return { ok: false, error: "Pedido no encontrado." };
    const pago: Pago = {
      id: `pg-${Date.now()}`,
      pedido_id: d.pedido_id,
      monto: d.monto,
      fecha: new Date().toISOString().slice(0, 10),
      metodo: d.metodo,
      tipo: d.tipo,
      notas: d.notas ?? null,
      registrado_por: usuario.id,
      created_at: new Date().toISOString(),
    };
    p.pagos = [...(p.pagos ?? []), pago];
    revalidarPedido(d.pedido_id);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("pago").insert({
    pedido_id: d.pedido_id,
    monto: d.monto,
    metodo: d.metodo,
    tipo: d.tipo,
    notas: d.notas ?? null,
    registrado_por: usuario.id,
  });
  if (error) return { ok: false, error: "No se pudo registrar el pago." };
  // Reacciones matriz §4 pendientes (Fase 2): asiento en Finanzas al pagar.
  revalidarPedido(d.pedido_id);
  return { ok: true };
}

/* ── Reserva de inventario ──────────────────────────────────────────────────*/
export async function reservarItem(
  pedidoId: string,
  itemId: string,
): Promise<ResultadoAccion> {
  if (!itemId) return { ok: false, error: "Elige un item." };

  if (!supabaseConfigurado()) {
    const item = ITEMS_MUESTRA.find((i) => i.id === itemId);
    if (!item) return { ok: false, error: "Item no encontrado." };
    if (item.estado !== "disponible")
      return { ok: false, error: "El item no está disponible." };
    item.estado = "reservado";
    item.pedido_id = pedidoId;
    revalidarPedido(pedidoId);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("item_inventario")
    .update({ estado: "reservado", pedido_id: pedidoId })
    .eq("id", itemId)
    .eq("estado", "disponible");
  if (error) return { ok: false, error: "No se pudo reservar el item." };
  // Reacciones matriz §4 pendientes (Fase 2): CxP a consignante si es consignación.
  revalidarPedido(pedidoId);
  return { ok: true };
}

/** Libera un item reservado (vuelve a disponible). */
export async function liberarItem(
  pedidoId: string,
  itemId: string,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const item = ITEMS_MUESTRA.find((i) => i.id === itemId);
    if (item) {
      item.estado = "disponible";
      item.pedido_id = null;
    }
    revalidarPedido(pedidoId);
    return { ok: true };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("item_inventario")
    .update({ estado: "disponible", pedido_id: null })
    .eq("id", itemId)
    .eq("pedido_id", pedidoId);
  if (error) return { ok: false, error: "No se pudo liberar el item." };
  revalidarPedido(pedidoId);
  return { ok: true };
}

/* ── Estado y línea de negocio ──────────────────────────────────────────────*/
export async function cambiarEstado(
  pedidoId: string,
  estado: EstadoPedido,
): Promise<ResultadoAccion> {
  // Entregar tiene su propia acción (sella margen). Aquí se evita.
  if (estado === "entregado") return entregarPedido(pedidoId);

  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === pedidoId);
    if (p) p.estado = estado;
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("pedido")
      .update({ estado })
      .eq("id", pedidoId);
    if (error) return { ok: false, error: "No se pudo actualizar el estado." };
  }
  // Reacción §4: al confirmar el pedido, se genera el contrato automáticamente
  // (idempotente: no duplica ni pisa uno firmado).
  if (estado === "confirmado") {
    await crearContratoSiNoExiste(pedidoId);
  }
  revalidarPedido(pedidoId);
  return { ok: true };
}

export async function cambiarLinea(
  pedidoId: string,
  linea: LineaNegocio,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === pedidoId);
    if (p) p.linea_negocio = linea;
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("pedido")
      .update({ linea_negocio: linea })
      .eq("id", pedidoId);
    if (error) return { ok: false, error: "No se pudo actualizar la línea." };
  }
  revalidarPedido(pedidoId);
  return { ok: true };
}

/* ── Candado de anticipo 2: override explícito de admin (auditado) ──────────*/
export async function overrideCandado(
  pedidoId: string,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin")
    return { ok: false, error: "Solo un administrador puede liberar el candado." };

  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === pedidoId);
    if (p) p.override_candado = true;
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("pedido")
      .update({
        override_candado: true,
        override_por: usuario.id,
        override_at: new Date().toISOString(),
      })
      .eq("id", pedidoId);
    if (error) return { ok: false, error: "No se pudo liberar el candado." };
  }
  revalidarPedido(pedidoId);
  return { ok: true };
}

/* ── Costo real acumulado (solo admin) ──────────────────────────────────────*/
const costoSchema = z.object({
  pedido_id: z.string().uuid(),
  costo_real: z.coerce.number().nonnegative("Costo no válido."),
});

export async function setCostoReal(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };
  const parsed = costoSchema.safeParse({
    pedido_id: formData.get("pedido_id"),
    costo_real: formData.get("costo_real"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;

  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === d.pedido_id);
    if (p) p.costo_real = d.costo_real;
    revalidarPedido(d.pedido_id);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pedido_costo")
    .upsert({ pedido_id: d.pedido_id, costo_real: d.costo_real });
  if (error) return { ok: false, error: "No se pudo guardar el costo." };
  revalidarPedido(d.pedido_id);
  return { ok: true };
}

/* ── Entregar: sella el margen real y cierra el ciclo ───────────────────────*/
export async function entregarPedido(
  pedidoId: string,
): Promise<ResultadoAccion> {
  const ahora = new Date().toISOString();

  if (!supabaseConfigurado()) {
    const p = PEDIDOS_MUESTRA.find((x) => x.id === pedidoId);
    if (!p) return { ok: false, error: "Pedido no encontrado." };
    p.estado = "entregado";
    p.entregado_at = ahora;
    if (p.costo_real != null && p.total > 0) {
      p.margen_sellado = Math.round(((p.total - p.costo_real) / p.total) * 100);
    }
    revalidarPedido(pedidoId);
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("pedido")
    .update({ estado: "entregado", entregado_at: ahora })
    .eq("id", pedidoId);
  if (error) return { ok: false, error: "No se pudo marcar como entregado." };

  // Sella el margen real si hay costo capturado (solo admin tiene la fila).
  const { data: pedido } = await supabase
    .from("pedido")
    .select("total")
    .eq("id", pedidoId)
    .maybeSingle();
  const { data: costo } = await supabase
    .from("pedido_costo")
    .select("costo_real")
    .eq("pedido_id", pedidoId)
    .maybeSingle();
  if (pedido && costo && Number(pedido.total) > 0) {
    const margen = Math.round(
      ((Number(pedido.total) - Number(costo.costo_real)) / Number(pedido.total)) * 100,
    );
    await supabase
      .from("pedido_costo")
      .update({ margen_sellado: margen })
      .eq("pedido_id", pedidoId);
  }
  // Reacciones matriz §4 pendientes (Fases 4/6): Postventa (garantía+aniversarios),
  // Finanzas (sella ciclo), Comisiones (si hay referidor), lifecycle (agradece).
  revalidarPedido(pedidoId);
  return { ok: true };
}

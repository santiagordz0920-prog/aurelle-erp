"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Compra } from "@/lib/compras";
import type { CuentaPorPagar, MovimientoFinanciero } from "@/lib/finanzas";
import type { ItemInventario } from "@/lib/inventario";
import { COMPRAS_MUESTRA } from "@/lib/data/compras-muestra";
import { CXP_MUESTRA, MOVIMIENTOS_MUESTRA } from "@/lib/data/finanzas-muestra";
import { ITEMS_MUESTRA } from "@/lib/data/inventario-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const compraSchema = z
  .object({
    proveedor_id: z.string().uuid().optional().nullable(),
    concepto: z.string().trim().min(2, "El concepto es obligatorio."),
    tipo: z.enum(["inventario", "gasto"]),
    condicion_pago: z.enum(["contado", "credito"]),
    monto: z.coerce.number().positive("El monto debe ser mayor a cero."),
    fecha: z.string().optional().nullable(),
    fecha_vencimiento: z.string().optional().nullable(),
    notas: z.string().trim().optional().nullable(),
    // Alta opcional en inventario (solo si tipo='inventario' y hay SKU).
    item_sku: z.string().trim().optional().nullable(),
    item_tipo: z
      .enum(["piedra_color", "diamante", "montura", "pieza_terminada", "churumbela"])
      .optional()
      .nullable(),
    item_nombre: z.string().trim().optional().nullable(),
  })
  .refine((d) => d.condicion_pago !== "credito" || !!d.fecha_vencimiento, {
    message: "Una compra a crédito necesita fecha de vencimiento.",
    path: ["fecha_vencimiento"],
  })
  .refine((d) => !d.item_sku || (d.tipo === "inventario" && !!d.item_nombre), {
    message: "Para dar de alta la pieza: tipo 'inventario', SKU y nombre.",
    path: ["item_sku"],
  });

export async function crearCompra(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  const parsed = compraSchema.safeParse({
    proveedor_id: (formData.get("proveedor_id") as string) || null,
    concepto: formData.get("concepto"),
    tipo: (formData.get("tipo") as string) || "inventario",
    condicion_pago: (formData.get("condicion_pago") as string) || "contado",
    monto: formData.get("monto"),
    fecha: (formData.get("fecha") as string) || null,
    fecha_vencimiento: (formData.get("fecha_vencimiento") as string) || null,
    notas: (formData.get("notas") as string) || null,
    item_sku: (formData.get("item_sku") as string) || null,
    item_tipo: (formData.get("item_tipo") as string) || null,
    item_nombre: (formData.get("item_nombre") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const fecha = d.fecha || new Date().toISOString().slice(0, 10);

  if (!supabaseConfigurado()) {
    const id = `c3000000-0000-0000-0000-0000000009${(COMPRAS_MUESTRA.length + 10).toString().slice(-2)}`;
    const compra: Compra = {
      id,
      proveedor_id: d.proveedor_id ?? null,
      proveedor_nombre: null,
      fecha,
      concepto: d.concepto,
      tipo: d.tipo,
      condicion_pago: d.condicion_pago,
      monto: d.monto,
      fecha_vencimiento: d.condicion_pago === "credito" ? (d.fecha_vencimiento ?? null) : null,
      notas: d.notas ?? null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    COMPRAS_MUESTRA.unshift(compra);
    // Reflejar el efecto del trigger en local (en prod lo hace la BD).
    const mov: MovimientoFinanciero = {
      id: `a0000000-0000-0000-0000-00000000c${(MOVIMIENTOS_MUESTRA.length + 10).toString().slice(-3)}`,
      fecha,
      categoria: d.tipo === "gasto" ? "gasto" : "costo",
      concepto: `Compra: ${d.concepto}`,
      monto: d.monto,
      linea_negocio: null,
      pedido_id: null,
      pago_id: null,
      origen: "compra",
      folio_factura: null,
      registrado_por: usuario.id,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    MOVIMIENTOS_MUESTRA.unshift(mov);
    if (d.condicion_pago === "credito") {
      const cxp: CuentaPorPagar = {
        id: `b0000000-0000-0000-0000-00000000c${(CXP_MUESTRA.length + 10).toString().slice(-3)}`,
        consignante_id: null,
        consignante_nombre: null,
        item_id: null,
        pedido_id: null,
        concepto: `Compra: ${d.concepto}`,
        monto: d.monto,
        estado: "pendiente",
        fecha_vencimiento: d.fecha_vencimiento ?? null,
        pagada_at: null,
        sucursal_id: usuario.sucursalId,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      CXP_MUESTRA.unshift(cxp);
    }
    // Alta opcional del item de inventario (costo = monto de la compra).
    if (d.tipo === "inventario" && d.item_sku && d.item_nombre) {
      const item: ItemInventario = {
        id: `e1000000-0000-0000-0000-00000000c${(ITEMS_MUESTRA.length + 10).toString().slice(-3)}`,
        sku: d.item_sku,
        tipo: d.item_tipo ?? "montura",
        nombre: d.item_nombre,
        descripcion: null,
        quilates: null,
        color: null,
        claridad: null,
        corte: null,
        propiedad: "propio",
        consignante_id: null,
        consignante_nombre: null,
        ubicacion: null,
        estado: "disponible",
        foto_url: null,
        certificado_url: null,
        pedido_id: null,
        sucursal_id: usuario.sucursalId,
        costo: d.monto,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      };
      ITEMS_MUESTRA.unshift(item);
    }
    revalidatePath("/dinero/compras");
    revalidatePath("/dinero");
    revalidatePath("/taller/inventario");
    return { ok: true };
  }

  const supabase = await createClient();
  // El trigger asiento_de_compra crea el asiento y la CxP en la misma transacción.
  const { data: compra, error } = await supabase
    .from("compra")
    .insert({
      proveedor_id: d.proveedor_id ?? null,
      fecha,
      concepto: d.concepto,
      tipo: d.tipo,
      condicion_pago: d.condicion_pago,
      monto: d.monto,
      fecha_vencimiento: d.condicion_pago === "credito" ? (d.fecha_vencimiento ?? null) : null,
      notas: d.notas ?? null,
      sucursal_id: usuario.sucursalId,
    })
    .select("id")
    .single();
  if (error || !compra) return { ok: false, error: "No se pudo registrar la compra." };

  // Alta opcional del item de inventario, ligado a la compra (costo = monto).
  if (d.tipo === "inventario" && d.item_sku && d.item_nombre) {
    const { data: item, error: eItem } = await supabase
      .from("item_inventario")
      .insert({
        sku: d.item_sku,
        tipo: d.item_tipo ?? "montura",
        nombre: d.item_nombre,
        propiedad: "propio",
        compra_id: compra.id,
        sucursal_id: usuario.sucursalId,
      })
      .select("id")
      .single();
    if (eItem) {
      const dup = eItem.code === "23505";
      return {
        ok: false,
        error: dup
          ? "La compra se guardó, pero ese SKU ya existe: da de alta la pieza manualmente."
          : "La compra se guardó, pero no se pudo dar de alta la pieza.",
      };
    }
    await supabase.from("item_costo").insert({ item_id: item.id, costo: d.monto });
  }

  revalidatePath("/dinero/compras");
  revalidatePath("/dinero");
  revalidatePath("/taller/inventario");
  return { ok: true };
}

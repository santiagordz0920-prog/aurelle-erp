"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Compra } from "@/lib/compras";
import type { CuentaPorPagar, MovimientoFinanciero } from "@/lib/finanzas";
import { COMPRAS_MUESTRA } from "@/lib/data/compras-muestra";
import { CXP_MUESTRA, MOVIMIENTOS_MUESTRA } from "@/lib/data/finanzas-muestra";

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
  })
  .refine((d) => d.condicion_pago !== "credito" || !!d.fecha_vencimiento, {
    message: "Una compra a crédito necesita fecha de vencimiento.",
    path: ["fecha_vencimiento"],
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
    revalidatePath("/dinero/compras");
    revalidatePath("/dinero");
    return { ok: true };
  }

  const supabase = await createClient();
  // El trigger asiento_de_compra crea el asiento y la CxP en la misma transacción.
  const { error } = await supabase.from("compra").insert({
    proveedor_id: d.proveedor_id ?? null,
    fecha,
    concepto: d.concepto,
    tipo: d.tipo,
    condicion_pago: d.condicion_pago,
    monto: d.monto,
    fecha_vencimiento: d.condicion_pago === "credito" ? (d.fecha_vencimiento ?? null) : null,
    notas: d.notas ?? null,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo registrar la compra." };
  revalidatePath("/dinero/compras");
  revalidatePath("/dinero");
  return { ok: true };
}

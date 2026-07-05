"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { itemSchema } from "@/lib/validaciones";
import type { EstadoItem } from "@/lib/inventario";
import { ITEMS_MUESTRA } from "@/lib/data/inventario-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

export async function crearItem(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = itemSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";
  let nuevoId: string;

  if (!supabaseConfigurado()) {
    nuevoId = `e1000000-0000-0000-0000-0000000009${(ITEMS_MUESTRA.length + 10).toString().slice(-2)}`;
    ITEMS_MUESTRA.unshift({
      id: nuevoId,
      sku: d.sku,
      tipo: d.tipo,
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      quilates: d.quilates ?? null,
      color: d.color ?? null,
      claridad: d.claridad ?? null,
      corte: d.corte ?? null,
      propiedad: d.propiedad,
      consignante_id: d.consignante ? "c-local" : null,
      consignante_nombre: d.consignante ?? null,
      ubicacion: d.ubicacion ?? null,
      estado: "disponible",
      foto_url: null,
      certificado_url: d.certificado_url ?? null,
      pedido_id: null,
      sucursal_id: usuario.sucursalId,
      costo: esAdmin ? (d.costo ?? 0) : undefined,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    revalidatePath("/taller/inventario");
    redirect(`/taller/inventario/${nuevoId}`);
  }

  const supabase = await createClient();

  // Consignante: buscar o crear por nombre en la sucursal.
  let consignanteId: string | null = null;
  if (d.propiedad === "consignacion" && d.consignante) {
    const { data: existente } = await supabase
      .from("consignante")
      .select("id")
      .eq("nombre", d.consignante)
      .maybeSingle();
    if (existente) {
      consignanteId = existente.id;
    } else {
      const { data: creado } = await supabase
        .from("consignante")
        .insert({ nombre: d.consignante, sucursal_id: usuario.sucursalId })
        .select("id")
        .single();
      consignanteId = creado?.id ?? null;
    }
  }

  const { data, error } = await supabase
    .from("item_inventario")
    .insert({
      sku: d.sku,
      tipo: d.tipo,
      nombre: d.nombre,
      descripcion: d.descripcion ?? null,
      quilates: d.quilates ?? null,
      color: d.color ?? null,
      claridad: d.claridad ?? null,
      corte: d.corte ?? null,
      propiedad: d.propiedad,
      consignante_id: consignanteId,
      ubicacion: d.ubicacion ?? null,
      certificado_url: d.certificado_url ?? null,
      sucursal_id: usuario.sucursalId,
    })
    .select("id")
    .single();
  if (error) {
    const dup = error.code === "23505";
    return {
      ok: false,
      error: dup ? "Ya existe un item con ese SKU." : "No se pudo guardar el item.",
    };
  }
  nuevoId = data.id;

  // Costo (solo admin; RLS también lo protege).
  if (esAdmin && d.costo != null) {
    await supabase.from("item_costo").insert({ item_id: nuevoId, costo: d.costo });
  }

  revalidatePath("/taller/inventario");
  redirect(`/taller/inventario/${nuevoId}`);
}

/** Cambia estado y/o ubicación de un item. */
export async function actualizarItem(
  itemId: string,
  cambios: { estado?: EstadoItem; ubicacion?: string },
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const i = ITEMS_MUESTRA.find((x) => x.id === itemId);
    if (i) {
      if (cambios.estado) i.estado = cambios.estado;
      if (cambios.ubicacion !== undefined) i.ubicacion = cambios.ubicacion;
    }
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("item_inventario")
      .update(cambios)
      .eq("id", itemId);
    if (error) return { ok: false, error: "No se pudo actualizar el item." };
  }
  revalidatePath("/taller/inventario");
  revalidatePath(`/taller/inventario/${itemId}`);
  return { ok: true };
}

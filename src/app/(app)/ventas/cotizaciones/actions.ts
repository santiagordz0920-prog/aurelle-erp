"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { EstadoCotizacion, Metal } from "@/lib/cotizaciones";
import { COTIZACIONES_MUESTRA } from "@/lib/data/cotizaciones-muestra";
import { PRECIOS_METAL_MUESTRA } from "@/lib/data/cotizaciones-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const lineaSchema = z.object({
  descripcion: z.string().trim().min(1),
  metal: z.string().optional().nullable(),
  quilataje: z.string().optional().nullable(),
  precio: z.coerce.number().nonnegative(),
});

const cotizacionSchema = z.object({
  cliente_id: z.string().uuid().optional().nullable(),
  valida_hasta: z.string().optional().nullable(),
  notas: z.string().optional().nullable(),
  costo_estimado: z.coerce.number().nonnegative().optional().nullable(),
  lineas: z.array(lineaSchema).min(1, "Agrega al menos una línea."),
});

export async function crearCotizacion(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  let lineasRaw: unknown;
  try {
    lineasRaw = JSON.parse((formData.get("lineas") as string) || "[]");
  } catch {
    return { ok: false, error: "Líneas no válidas." };
  }
  const parsed = cotizacionSchema.safeParse({
    cliente_id: (formData.get("cliente_id") as string) || null,
    valida_hasta: (formData.get("valida_hasta") as string) || null,
    notas: (formData.get("notas") as string) || null,
    costo_estimado: (formData.get("costo_estimado") as string) || null,
    lineas: lineasRaw,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const total = d.lineas.reduce((s, l) => s + l.precio, 0);
  const usuario = await getUsuarioActual();
  const esAdmin = usuario.rol === "admin";
  let nuevoId: string;

  if (!supabaseConfigurado()) {
    nuevoId = `f1000000-0000-0000-0000-0000000009${(COTIZACIONES_MUESTRA.length + 10).toString().slice(-2)}`;
    COTIZACIONES_MUESTRA.unshift({
      id: nuevoId,
      cliente_id: d.cliente_id ?? null,
      cliente_nombre: null,
      estado: "borrador",
      total,
      notas: d.notas ?? null,
      valida_hasta: d.valida_hasta ?? null,
      pdf_url: null,
      pedido_id: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      costo_estimado: esAdmin ? (d.costo_estimado ?? 0) : undefined,
      lineas: d.lineas.map((l, i) => ({
        id: `l-${i}`,
        cotizacion_id: nuevoId,
        descripcion: l.descripcion,
        metal: (l.metal as Metal) || null,
        quilataje: l.quilataje || null,
        item_inventario_id: null,
        especificacion: null,
        precio: l.precio,
        orden: i,
      })),
    });
    revalidatePath("/ventas/cotizaciones");
    redirect(`/ventas/cotizaciones/${nuevoId}`);
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("cotizacion")
    .insert({
      cliente_id: d.cliente_id ?? null,
      total,
      notas: d.notas ?? null,
      valida_hasta: d.valida_hasta ?? null,
      sucursal_id: usuario.sucursalId,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: "No se pudo crear la cotización." };
  nuevoId = data.id;

  await supabase.from("cotizacion_linea").insert(
    d.lineas.map((l, i) => ({
      cotizacion_id: nuevoId,
      descripcion: l.descripcion,
      metal: (l.metal as Metal) || null,
      quilataje: l.quilataje || null,
      precio: l.precio,
      orden: i,
    })),
  );

  if (esAdmin && d.costo_estimado != null) {
    await supabase
      .from("cotizacion_margen")
      .insert({ cotizacion_id: nuevoId, costo_estimado: d.costo_estimado });
  }

  revalidatePath("/ventas/cotizaciones");
  redirect(`/ventas/cotizaciones/${nuevoId}`);
}

export async function cambiarEstadoCotizacion(
  id: string,
  estado: EstadoCotizacion,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const c = COTIZACIONES_MUESTRA.find((x) => x.id === id);
    if (c) c.estado = estado;
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("cotizacion")
      .update({ estado })
      .eq("id", id);
    if (error) return { ok: false, error: "No se pudo actualizar." };
  }
  revalidatePath("/ventas/cotizaciones");
  revalidatePath(`/ventas/cotizaciones/${id}`);
  return { ok: true };
}

const precioSchema = z.object({
  metal: z.enum(["oro", "platino", "paladio", "plata"]),
  pureza: z.string().trim().optional().nullable(),
  precio_gramo_mxn: z.coerce.number().positive("Precio no válido."),
});

/** Captura manual del precio de metal (solo admin). */
export async function registrarPrecioMetal(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };
  const parsed = precioSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;

  if (!supabaseConfigurado()) {
    const i = PRECIOS_METAL_MUESTRA.findIndex(
      (p) => p.metal === d.metal && (p.pureza ?? "") === (d.pureza ?? ""),
    );
    const nuevo = {
      id: `p-${Date.now()}`,
      metal: d.metal,
      pureza: d.pureza ?? null,
      precio_gramo_mxn: d.precio_gramo_mxn,
      tipo_cambio_usd_mxn: null,
      fecha: new Date().toISOString().slice(0, 10),
      fuente: "manual",
    };
    if (i >= 0) PRECIOS_METAL_MUESTRA[i] = nuevo;
    else PRECIOS_METAL_MUESTRA.push(nuevo);
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("precio_metal").insert({
      metal: d.metal,
      pureza: d.pureza ?? null,
      precio_gramo_mxn: d.precio_gramo_mxn,
      sucursal_id: usuario.sucursalId,
    });
    if (error) return { ok: false, error: "No se pudo guardar el precio." };
  }
  revalidatePath("/ventas/cotizaciones");
  return { ok: true };
}

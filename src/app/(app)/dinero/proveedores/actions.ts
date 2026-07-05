"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import type { Proveedor } from "@/lib/proveedores";
import { PROVEEDORES_MUESTRA } from "@/lib/data/proveedores-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

const proveedorSchema = z.object({
  nombre: z.string().trim().min(2, "El nombre es obligatorio."),
  contacto: z.string().trim().optional().nullable(),
  categorias: z.string().optional().nullable(), // coma-separadas
  condiciones_pago: z.string().trim().optional().nullable(),
  notas: z.string().trim().optional().nullable(),
});

function parseCategorias(raw: string | null | undefined): string[] {
  if (!raw) return [];
  return Array.from(
    new Set(
      raw
        .split(",")
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean),
    ),
  );
}

export async function crearProveedor(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo admin." };

  const parsed = proveedorSchema.safeParse({
    nombre: formData.get("nombre"),
    contacto: (formData.get("contacto") as string) || null,
    categorias: (formData.get("categorias") as string) || null,
    condiciones_pago: (formData.get("condiciones_pago") as string) || null,
    notas: (formData.get("notas") as string) || null,
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const categorias = parseCategorias(d.categorias);

  if (!supabaseConfigurado()) {
    const nuevo: Proveedor = {
      id: `c2000000-0000-0000-0000-0000000009${(PROVEEDORES_MUESTRA.length + 10).toString().slice(-2)}`,
      nombre: d.nombre,
      contacto: d.contacto ?? null,
      categorias,
      condiciones_pago: d.condiciones_pago ?? null,
      notas: d.notas ?? null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };
    PROVEEDORES_MUESTRA.unshift(nuevo);
    revalidatePath("/dinero/proveedores");
    return { ok: true };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("proveedor").insert({
    nombre: d.nombre,
    contacto: d.contacto ?? null,
    categorias,
    condiciones_pago: d.condiciones_pago ?? null,
    notas: d.notas ?? null,
    sucursal_id: usuario.sucursalId,
  });
  if (error) return { ok: false, error: "No se pudo guardar el proveedor." };
  revalidatePath("/dinero/proveedores");
  return { ok: true };
}

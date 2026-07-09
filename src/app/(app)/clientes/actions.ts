"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { getUsuarioActual } from "@/lib/session";
import { clienteSchema, notaSchema } from "@/lib/validaciones";
import type { EstadoPipeline } from "@/lib/clientes";
import { CLIENTES_MUESTRA, NOTAS_MUESTRA } from "@/lib/data/clientes-muestra";

export type ResultadoAccion = { ok: boolean; error?: string };

function parseEtiquetas(raw?: string): string[] {
  if (!raw) return [];
  return raw
    .split(",")
    .map((e) => e.trim())
    .filter(Boolean);
}

/** Alta de cliente. En éxito, redirige a su ficha. */
export async function crearCliente(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = clienteSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Datos no válidos." };
  }
  const d = parsed.data;
  const usuario = await getUsuarioActual();
  let nuevoId: string;

  if (!supabaseConfigurado()) {
    nuevoId = `10000000-0000-0000-0000-0000000009${(CLIENTES_MUESTRA.length + 10).toString().slice(-2)}`;
    CLIENTES_MUESTRA.unshift({
      id: nuevoId,
      nombre: d.nombre,
      telefono: d.telefono ?? null,
      fecha_nacimiento: d.fecha_nacimiento ?? null,
      fecha_boda: d.fecha_boda ?? null,
      pareja_nombre: d.pareja_nombre ?? null,
      fuente_canal: d.fuente_canal ?? null,
      fuente_detalle: d.fuente_detalle ?? null,
      referido_por_cliente_id: null,
      referido_por_externo: null,
      etiquetas: parseEtiquetas(d.etiquetas),
      estado_pipeline: "nuevo",
      motivo_perdida: null,
      sucursal_id: usuario.sucursalId,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
  } else {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("cliente")
      .insert({
        nombre: d.nombre,
        telefono: d.telefono ?? null,
        fecha_nacimiento: d.fecha_nacimiento ?? null,
        fecha_boda: d.fecha_boda ?? null,
        pareja_nombre: d.pareja_nombre ?? null,
        fuente_canal: d.fuente_canal ?? null,
        fuente_detalle: d.fuente_detalle ?? null,
        etiquetas: parseEtiquetas(d.etiquetas),
        sucursal_id: usuario.sucursalId,
      })
      .select("id")
      .single();
    if (error) {
      const dup = error.code === "23505";
      return {
        ok: false,
        error: dup
          ? "Ya existe un cliente con ese teléfono."
          : "No se pudo guardar el cliente.",
      };
    }
    nuevoId = data.id;
  }

  revalidatePath("/clientes");
  redirect(`/clientes/${nuevoId}`);
}

/** Agrega una nota interna a un cliente. */
export async function agregarNota(
  _prev: ResultadoAccion,
  formData: FormData,
): Promise<ResultadoAccion> {
  const parsed = notaSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Nota no válida." };
  }
  const usuario = await getUsuarioActual();

  if (!supabaseConfigurado()) {
    NOTAS_MUESTRA.push({
      id: `20000000-0000-0000-0000-${Date.now().toString().slice(-12)}`,
      cliente_id: parsed.data.cliente_id,
      autor_id: usuario.id,
      autor_nombre: usuario.nombre,
      texto: parsed.data.texto,
      created_at: new Date().toISOString(),
    });
  } else {
    const supabase = await createClient();
    const { error } = await supabase.from("nota_cliente").insert({
      cliente_id: parsed.data.cliente_id,
      autor_id: usuario.id,
      texto: parsed.data.texto,
    });
    if (error) return { ok: false, error: "No se pudo guardar la nota." };
  }

  revalidatePath(`/clientes/${parsed.data.cliente_id}`);
  return { ok: true };
}

/** Cambia la etapa del pipeline de un cliente. */
export async function cambiarEstado(
  clienteId: string,
  estado: EstadoPipeline,
  motivo?: string,
): Promise<ResultadoAccion> {
  if (!supabaseConfigurado()) {
    const c = CLIENTES_MUESTRA.find((x) => x.id === clienteId);
    if (c) {
      c.estado_pipeline = estado;
      c.motivo_perdida = estado === "perdido" ? (motivo ?? null) : null;
    }
  } else {
    const supabase = await createClient();
    const { error } = await supabase
      .from("cliente")
      .update({
        estado_pipeline: estado,
        motivo_perdida: estado === "perdido" ? (motivo ?? null) : null,
      })
      .eq("id", clienteId);
    if (error) return { ok: false, error: "No se pudo actualizar la etapa." };
  }
  revalidatePath("/clientes");
  revalidatePath(`/clientes/${clienteId}`);
  return { ok: true };
}

/**
 * Borra un cliente (solo-admin; la RLS `cliente_delete` = `es_admin()` lo impone).
 * Guardas: `pedido.cliente_id` es RESTRICT en la BD, así que un cliente CON
 * pedidos no se puede borrar (protege ventas) → aquí se avisa claro. Citas y
 * notas se borran en cascada; cotizaciones/conversaciones/media quedan sin liga.
 * Pensado para limpiar clientes de prueba o duplicados. Redirige a /clientes.
 */
export async function eliminarCliente(clienteId: string): Promise<ResultadoAccion> {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") return { ok: false, error: "Solo un admin puede borrar clientes." };

  if (!supabaseConfigurado()) {
    const i = CLIENTES_MUESTRA.findIndex((c) => c.id === clienteId);
    if (i >= 0) CLIENTES_MUESTRA.splice(i, 1);
    revalidatePath("/clientes");
    redirect("/clientes");
  }

  const supabase = await createClient();
  // Guarda explícita: no borrar si tiene pedidos (además del RESTRICT de la BD).
  const { count } = await supabase
    .from("pedido")
    .select("id", { count: "exact", head: true })
    .eq("cliente_id", clienteId);
  if ((count ?? 0) > 0) {
    return { ok: false, error: "No se puede borrar: el cliente tiene pedidos. Márcalo como perdido si ya no aplica." };
  }
  const { error } = await supabase.from("cliente").delete().eq("id", clienteId);
  if (error) return { ok: false, error: "No se pudo borrar el cliente." };
  revalidatePath("/clientes");
  redirect("/clientes");
}

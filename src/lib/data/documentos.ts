import "server-only";
import type { Documento } from "@/lib/documentos";
import type { Pago, LineaNegocio } from "@/lib/pedidos";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { supabaseConfigurado } from "@/lib/supabase/config";
import { DOCUMENTOS_MUESTRA } from "./documentos-muestra";
import { PEDIDOS_MUESTRA, pagadoDe } from "./pedidos-muestra";

/* Capa de datos de Documentos. RLS por sucursal para el equipo; la firma pública
   usa el cliente service_role validando el token. */

/** Contenido mínimo del contrato para renderizarlo (público y privado). */
export type ContratoDatos = {
  cliente_nombre: string | null;
  linea_negocio: LineaNegocio;
  total: number;
  pagos: Pick<Pago, "id" | "tipo" | "fecha" | "monto">[];
  saldo: number;
  created_at: string;
  fecha_compromiso: string | null;
};

export async function listarDocumentosDePedido(pedidoId: string): Promise<Documento[]> {
  if (!supabaseConfigurado()) {
    return DOCUMENTOS_MUESTRA.filter((d) => d.pedido_id === pedidoId);
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documento")
    .select("*")
    .eq("pedido_id", pedidoId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as Documento[];
}

/** Documentos de todos los pedidos de un cliente (para archivarlos en la ficha 360). */
export async function listarDocumentosDeCliente(clienteId: string): Promise<Documento[]> {
  if (!supabaseConfigurado()) {
    const pedidosDelCliente = new Set(
      PEDIDOS_MUESTRA.filter((p) => p.cliente_id === clienteId).map((p) => p.id),
    );
    return DOCUMENTOS_MUESTRA.filter((d) => pedidosDelCliente.has(d.pedido_id)).sort((a, b) =>
      b.created_at.localeCompare(a.created_at),
    );
  }
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("documento")
    .select("*, pedido!inner(cliente_id)")
    .eq("pedido.cliente_id", clienteId)
    .order("created_at", { ascending: false });
  if (error) throw error;
  // El join `pedido` sólo sirve para filtrar; la columna extra se ignora.
  return (data ?? []) as unknown as Documento[];
}

/**
 * Documento + datos del contrato para la firma PÚBLICA (por token). Usa el
 * cliente service_role: no hay sesión de usuario (el cliente firma sin cuenta).
 */
export async function getDocumentoParaFirma(
  token: string,
): Promise<{ doc: Documento; contrato: ContratoDatos } | null> {
  if (!supabaseConfigurado()) {
    const doc = DOCUMENTOS_MUESTRA.find((d) => d.token === token);
    if (!doc) return null;
    const p = PEDIDOS_MUESTRA.find((x) => x.id === doc.pedido_id);
    if (!p) return null;
    const pagado = pagadoDe(p);
    return {
      doc,
      contrato: {
        cliente_nombre: p.cliente_nombre ?? null,
        linea_negocio: p.linea_negocio,
        total: p.total,
        pagos: (p.pagos ?? []).map((pg) => ({
          id: pg.id,
          tipo: pg.tipo,
          fecha: pg.fecha,
          monto: pg.monto,
        })),
        saldo: p.total - pagado,
        created_at: p.created_at,
        fecha_compromiso: p.fecha_compromiso,
      },
    };
  }

  const supabase = createAdminClient();
  const { data: doc } = await supabase
    .from("documento")
    .select("*")
    .eq("token", token)
    .maybeSingle();
  if (!doc) return null;
  const { data: p } = await supabase
    .from("pedido")
    .select("total, linea_negocio, fecha_compromiso, created_at, cliente(nombre), pago(id, tipo, fecha, monto)")
    .eq("id", doc.pedido_id)
    .maybeSingle();
  if (!p) return null;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pp = p as any;
  const cliente = Array.isArray(pp.cliente) ? pp.cliente[0] : pp.cliente;
  const pagos = (pp.pago ?? []) as ContratoDatos["pagos"];
  const pagado = pagos.reduce((s, x) => s + Number(x.monto), 0);
  return {
    doc: doc as Documento,
    contrato: {
      cliente_nombre: cliente?.nombre ?? null,
      linea_negocio: pp.linea_negocio,
      total: Number(pp.total),
      pagos: pagos
        .slice()
        .sort((a, b) => a.fecha.localeCompare(b.fecha)),
      saldo: Number(pp.total) - pagado,
      created_at: pp.created_at,
      fecha_compromiso: pp.fecha_compromiso,
    },
  };
}

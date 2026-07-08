import { notFound } from "next/navigation";
import { PrintButton } from "@/components/cotizaciones/print-button";
import { ContratoDoc } from "@/components/documentos/contrato-doc";
import type { ContratoDatos } from "@/lib/data/documentos";
import { listarDocumentosDePedido, clausulasContratoActivas } from "@/lib/data/documentos";
import { getPedido } from "@/lib/data/pedidos";

/*
  Contrato imprimible / PDF con identidad Aurelle (§3.12), generado desde el
  pedido. Reusa <ContratoDoc>, el mismo cuerpo que ve el cliente al firmar.
*/
export const metadata = { title: "Contrato Aurelle" };

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPedido(id);
  if (!p) notFound();

  // Si ya hay un contrato FIRMADO con snapshot, imprime lo congelado (0022): el
  // documento firmado no cambia aunque el pedido cambie después. Si no, en vivo.
  const docs = await listarDocumentosDePedido(id);
  const firmado = docs.find(
    (d) => d.tipo === "contrato" && d.estado === "firmado" && d.contenido,
  );

  const datos: ContratoDatos = firmado
    ? (firmado.contenido as ContratoDatos)
    : {
        cliente_nombre: p.cliente_nombre ?? null,
        linea_negocio: p.linea_negocio,
        total: p.total,
        pagos: (p.pagos ?? []).map((pg) => ({
          id: pg.id,
          tipo: pg.tipo,
          fecha: pg.fecha,
          monto: pg.monto,
        })),
        saldo: p.saldo ?? p.total,
        created_at: p.created_at,
        fecha_compromiso: p.fecha_compromiso,
        clausulas: await clausulasContratoActivas(),
      };

  return (
    <div className="min-h-dvh bg-[#f5f2eb] px-6 py-10 text-[#08221b]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-end">
          <PrintButton />
        </div>
        <ContratoDoc
          datos={datos}
          firmadoPor={firmado ? firmado.firmado_por : null}
          firmadoAt={firmado ? firmado.firmado_at : null}
        />
      </div>
    </div>
  );
}

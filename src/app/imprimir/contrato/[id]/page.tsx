import { notFound } from "next/navigation";
import { PrintButton } from "@/components/cotizaciones/print-button";
import { getPedido } from "@/lib/data/pedidos";
import { LINEA_NEGOCIO, TIPO_PAGO } from "@/lib/pedidos";
import { pesos } from "@/lib/inventario";

/*
  Contrato de compraventa imprimible / guardable como PDF, con identidad Aurelle
  (§3.12). Se genera desde los datos del pedido. Fuera del cascarón de la app.
  E-firma vía link y archivado con versionado: slices siguientes.
*/
export const metadata = { title: "Contrato Aurelle" };

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ContratoPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const p = await getPedido(id);
  if (!p) notFound();
  const pagos = p.pagos ?? [];
  const saldo = p.saldo ?? p.total;

  return (
    <div className="min-h-dvh bg-[#f5f2eb] px-6 py-10 text-[#08221b]">
      <div className="mx-auto max-w-2xl">
        <div className="mb-6 flex justify-end">
          <PrintButton />
        </div>

        <div className="rounded-lg border border-[#e3ddce] bg-white p-10 shadow-sm print:border-0 print:shadow-none">
          {/* Encabezado de marca */}
          <div className="flex items-center justify-between border-b border-[#e3ddce] pb-6">
            <div>
              <p className="text-2xl font-semibold uppercase tracking-[0.28em]">Aurelle</p>
              <p className="mt-1 text-xs uppercase tracking-widest text-[#b77321]">
                Contrato de compraventa · Joyería de compromiso
              </p>
            </div>
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-[#b77321] text-[#b77321]">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-4 3-5 5-8Z" />
              </svg>
            </div>
          </div>

          {/* Datos */}
          <div className="mt-6 flex justify-between text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#5b6660]">Cliente</p>
              <p className="mt-1 font-medium">{p.cliente_nombre ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[#5b6660]">Fecha</p>
              <p className="mt-1">{fechaLarga(p.created_at)}</p>
              <p className="mt-1 text-xs text-[#5b6660]">
                Línea: {LINEA_NEGOCIO[p.linea_negocio]}
              </p>
            </div>
          </div>

          {/* Objeto */}
          <div className="mt-8 text-sm leading-relaxed">
            <p>
              Por medio del presente, <span className="font-medium">Aurelle &amp; Co.</span> y
              el cliente acuerdan la fabricación y compraventa de una pieza de joyería de
              compromiso conforme a las especificaciones convenidas
              {p.fecha_compromiso ? (
                <> , con fecha compromiso de entrega el {fechaLarga(p.fecha_compromiso + "T00:00:00")}</>
              ) : null}
              .
            </p>
          </div>

          {/* Precio y plan de pagos */}
          <div className="mt-6 rounded-lg border border-[#e3ddce] p-4 text-sm">
            <div className="flex items-center justify-between">
              <span className="text-[#5b6660]">Precio total (pieza completa)</span>
              <span className="text-lg font-semibold">{pesos(p.total)}</span>
            </div>
            {pagos.length > 0 ? (
              <div className="mt-3 border-t border-[#f0ebdf] pt-3">
                <p className="mb-2 text-xs uppercase tracking-wide text-[#5b6660]">
                  Plan de pagos
                </p>
                <ul className="space-y-1">
                  {pagos.map((pg) => (
                    <li key={pg.id} className="flex justify-between">
                      <span>
                        {TIPO_PAGO[pg.tipo]} · {fechaLarga(pg.fecha + "T00:00:00")}
                      </span>
                      <span>{pesos(pg.monto)}</span>
                    </li>
                  ))}
                </ul>
                <div className="mt-2 flex justify-between border-t border-[#f0ebdf] pt-2 font-medium">
                  <span>Saldo pendiente</span>
                  <span>{pesos(saldo)}</span>
                </div>
              </div>
            ) : null}
          </div>

          {/* Términos */}
          <div className="mt-6 space-y-2 text-xs leading-relaxed text-[#5b6660]">
            <p>
              <span className="font-medium text-[#08221b]">Anticipos.</span> La fabricación
              inicia una vez cubierto el anticipo convenido; la compra de materiales requiere el
              anticipo del 30%. El saldo se liquida antes de la entrega.
            </p>
            <p>
              <span className="font-medium text-[#08221b]">Garantía.</span> La pieza cuenta con
              garantía de por vida contra defectos de fabricación y servicio de limpieza y pulido
              sin costo. No cubre daño por mal uso.
            </p>
            <p>
              <span className="font-medium text-[#08221b]">Especificaciones.</span> Las piedras y
              características corresponden a la cotización aceptada; cualquier cambio se documenta
              como adenda.
            </p>
          </div>

          {/* Firma */}
          <div className="mt-12 grid grid-cols-2 gap-8 text-center text-xs text-[#5b6660]">
            <div>
              <div className="border-t border-[#08221b] pt-2">Firma del cliente</div>
            </div>
            <div>
              <div className="border-t border-[#08221b] pt-2">Aurelle &amp; Co.</div>
            </div>
          </div>

          <p className="mt-10 border-t border-[#e3ddce] pt-4 text-center text-[10px] text-[#5b6660]">
            Documento generado por el ERP de Aurelle &amp; Co. · Monterrey. Sujeto a los términos acordados.
          </p>
        </div>
      </div>
    </div>
  );
}

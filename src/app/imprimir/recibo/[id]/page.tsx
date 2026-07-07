import { notFound } from "next/navigation";
import { PrintButton } from "@/components/cotizaciones/print-button";
import { getPedido } from "@/lib/data/pedidos";
import { METODO_PAGO, TIPO_PAGO } from "@/lib/pedidos";
import { pesos } from "@/lib/inventario";

/*
  Nota de remisión / recibo de un pago (§3.12), con identidad Aurelle. Se genera
  desde el pedido + el pago indicado en ?p=. Imprimible / PDF.
*/
export const metadata = { title: "Recibo Aurelle" };

function fechaLarga(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export default async function ReciboPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ p?: string }>;
}) {
  const { id } = await params;
  const { p: pagoId } = await searchParams;
  const pedido = await getPedido(id);
  if (!pedido) notFound();
  const pagos = pedido.pagos ?? [];
  const pago = pagoId ? pagos.find((x) => x.id === pagoId) : pagos.at(-1);
  if (!pago) notFound();

  const pagado = pedido.pagado ?? 0;
  const saldo = pedido.saldo ?? pedido.total;

  return (
    <div className="min-h-dvh bg-[#f5f2eb] px-6 py-10 text-[#08221b]">
      <div className="mx-auto max-w-md">
        <div className="mb-6 flex justify-end">
          <PrintButton />
        </div>

        <div className="rounded-lg border border-[#e3ddce] bg-white p-8 shadow-sm print:border-0 print:shadow-none">
          <div className="flex items-center justify-between border-b border-[#e3ddce] pb-5">
            <div>
              <p className="text-xl font-semibold uppercase tracking-[0.26em]">Aurelle</p>
              <p className="mt-1 text-[10px] uppercase tracking-widest text-[#b77321]">
                Nota de remisión
              </p>
            </div>
            <div className="flex size-12 items-center justify-center rounded-full border-2 border-[#b77321] text-[#b77321]">
              <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-4 3-5 5-8Z" />
              </svg>
            </div>
          </div>

          <div className="mt-5 space-y-1 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5b6660]">Cliente</span>
              <span className="font-medium">{pedido.cliente_nombre ?? "—"}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5b6660]">Fecha</span>
              <span>{fechaLarga(pago.fecha + "T00:00:00")}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5b6660]">Concepto</span>
              <span>{TIPO_PAGO[pago.tipo]}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[#5b6660]">Método</span>
              <span>{METODO_PAGO[pago.metodo]}</span>
            </div>
          </div>

          <div className="mt-5 flex items-center justify-between border-y-2 border-[#08221b] py-3">
            <span className="text-sm font-semibold uppercase tracking-wide">Pago recibido</span>
            <span className="text-xl font-semibold">{pesos(pago.monto)}</span>
          </div>

          <div className="mt-4 space-y-1 text-xs text-[#5b6660]">
            <div className="flex justify-between">
              <span>Total del pedido</span>
              <span>{pesos(pedido.total)}</span>
            </div>
            <div className="flex justify-between">
              <span>Acumulado pagado</span>
              <span>{pesos(pagado)}</span>
            </div>
            <div className="flex justify-between font-medium text-[#08221b]">
              <span>Saldo pendiente</span>
              <span>{pesos(saldo)}</span>
            </div>
          </div>

          <p className="mt-8 text-center text-[10px] text-[#5b6660]">
            Gracias por tu confianza. Aurelle &amp; Co. · Monterrey
          </p>
        </div>
      </div>
    </div>
  );
}

import { notFound } from "next/navigation";
import { getCotizacion } from "@/lib/data/cotizaciones";
import { METAL } from "@/lib/cotizaciones";
import { pesos } from "@/lib/inventario";
import { PrintButton } from "@/components/cotizaciones/print-button";

/*
  Cotización de marca imprimible / guardable como PDF, cara al cliente (sin
  costos ni margen). Fuera del cascarón de la app. La generación de PDF binario
  con las tipografías de marca (server-side) es un refinamiento posterior; ver
  docs/modulos/cotizador.md.
*/
export const metadata = { title: "Cotización Aurelle" };

export default async function ImprimirCotizacionPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const c = await getCotizacion(id);
  if (!c) notFound();

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
              <p className="text-2xl font-semibold uppercase tracking-[0.28em] text-[#08221b]">
                Aurelle
              </p>
              <p className="mt-1 text-xs uppercase tracking-widest text-[#b77321]">
                Joyería de compromiso · Monterrey
              </p>
            </div>
            {/* Sello (placeholder de la grulla) */}
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-[#b77321] text-[#b77321]">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-4 3-5 5-8Z" />
              </svg>
            </div>
          </div>

          {/* Datos */}
          <div className="mt-6 flex justify-between text-sm">
            <div>
              <p className="text-xs uppercase tracking-wide text-[#5b6660]">
                Cotización para
              </p>
              <p className="mt-1 font-medium">{c.cliente_nombre ?? "—"}</p>
            </div>
            <div className="text-right">
              <p className="text-xs uppercase tracking-wide text-[#5b6660]">
                Fecha
              </p>
              <p className="mt-1">
                {new Date(c.created_at).toLocaleDateString("es-MX", {
                  day: "numeric",
                  month: "long",
                  year: "numeric",
                })}
              </p>
              {c.valida_hasta ? (
                <p className="mt-1 text-xs text-[#5b6660]">
                  Válida hasta{" "}
                  {new Date(c.valida_hasta + "T00:00:00").toLocaleDateString(
                    "es-MX",
                    { day: "numeric", month: "long", year: "numeric" },
                  )}
                </p>
              ) : null}
            </div>
          </div>

          {/* Piezas */}
          <table className="mt-8 w-full text-sm">
            <thead>
              <tr className="border-b border-[#e3ddce] text-left text-xs uppercase tracking-wide text-[#5b6660]">
                <th className="pb-2 font-medium">Descripción</th>
                <th className="pb-2 text-right font-medium">Precio</th>
              </tr>
            </thead>
            <tbody>
              {(c.lineas ?? []).map((l) => (
                <tr key={l.id} className="border-b border-[#f0ebdf]">
                  <td className="py-3">
                    {l.descripcion}
                    {l.metal ? (
                      <span className="block text-xs text-[#5b6660]">
                        {METAL[l.metal]} {l.quilataje ?? ""}
                      </span>
                    ) : null}
                  </td>
                  <td className="py-3 text-right align-top">{pesos(l.precio)}</td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="mt-4 flex items-center justify-between border-t-2 border-[#08221b] pt-4">
            <span className="text-sm font-semibold uppercase tracking-wide">
              Total
            </span>
            <span className="text-xl font-semibold">{pesos(c.total)}</span>
          </div>

          {c.notas ? (
            <p className="mt-6 text-sm text-[#5b6660]">{c.notas}</p>
          ) : null}

          <p className="mt-10 border-t border-[#e3ddce] pt-4 text-center text-xs text-[#5b6660]">
            El precio corresponde a la pieza terminada completa. Precios sujetos a
            confirmación de disponibilidad de piedra y vigentes hasta la fecha
            indicada. Aurelle & Co.
          </p>
        </div>
      </div>
    </div>
  );
}

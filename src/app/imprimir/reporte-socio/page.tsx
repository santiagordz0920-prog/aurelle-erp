import { PrintButton } from "@/components/cotizaciones/print-button";
import { getUsuarioActual } from "@/lib/session";
import { reporteSocio } from "@/lib/data/finanzas";
import { META_MENSUAL_MXN } from "@/lib/finanzas";
import { pesos } from "@/lib/inventario";

/*
  Reporte mensual al socio capitalista (§3.9): trayectoria de crecimiento
  (ventas, tendencia, pipeline, % Concierge, vs meta). Fuera del cascarón de la
  app, imprimible / guardable como PDF desde el navegador. SOLO-ADMIN.
*/
export const metadata = { title: "Reporte Aurelle" };

function nombreMes(iso: string): string {
  const [y, m] = iso.split("-").map(Number);
  return new Date(y, m - 1, 1).toLocaleDateString("es-MX", {
    month: "short",
    year: "2-digit",
  });
}

export default async function ReporteSocioPage() {
  const usuario = await getUsuarioActual();
  if (usuario.rol !== "admin") {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-[#f5f2eb] p-10 text-[#08221b]">
        <p className="text-sm">Reporte restringido a administradores.</p>
      </div>
    );
  }

  const r = await reporteSocio();
  const maxSerie = Math.max(...r.serie.map((s) => s.ingreso), 1);

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
                Reporte mensual · {nombreMes(r.mes)}
              </p>
            </div>
            <div className="flex size-16 items-center justify-center rounded-full border-2 border-[#b77321] text-[#b77321]">
              <svg viewBox="0 0 24 24" className="size-8" fill="none" stroke="currentColor" strokeWidth="1.5">
                <path d="M12 3c2 3 5 4 5 8a5 5 0 0 1-10 0c0-4 3-5 5-8Z" />
              </svg>
            </div>
          </div>

          {/* Cifras clave */}
          <div className="mt-6 grid grid-cols-2 gap-6">
            <Cifra etiqueta="Ventas del mes" valor={pesos(r.ingresoMes)} />
            <Cifra etiqueta="Resultado neto" valor={pesos(r.netoMes)} />
            <Cifra etiqueta="Pipeline vivo" valor={pesos(r.pipelineValor)} nota={`${r.pipelineCount} cotizaciones`} />
            <Cifra etiqueta="Ticket promedio" valor={pesos(r.ticketPromedio)} />
          </div>

          {/* Meta */}
          <div className="mt-8">
            <div className="flex items-center justify-between text-xs uppercase tracking-wide text-[#5b6660]">
              <span>Meta mensual ({pesos(META_MENSUAL_MXN)})</span>
              <span className="font-semibold text-[#08221b]">{r.avanceMeta}%</span>
            </div>
            <div className="mt-2 h-2.5 overflow-hidden rounded-full bg-[#efe9dc]">
              <div
                className="h-full rounded-full bg-[#08221b]"
                style={{ width: `${Math.min(r.avanceMeta, 100)}%` }}
              />
            </div>
          </div>

          {/* Tendencia 6 meses */}
          <div className="mt-8">
            <p className="text-xs uppercase tracking-wide text-[#5b6660]">
              Tendencia de ventas (6 meses)
            </p>
            <div className="mt-3 flex h-32 items-end gap-2">
              {r.serie.map((s) => (
                <div key={s.mes} className="flex flex-1 flex-col items-center gap-1">
                  <div className="flex w-full flex-1 items-end">
                    <div
                      className="w-full rounded-t bg-[#b77321]"
                      style={{ height: `${Math.round((s.ingreso / maxSerie) * 100)}%` }}
                    />
                  </div>
                  <span className="text-[10px] text-[#5b6660]">{nombreMes(s.mes)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Mezcla de línea */}
          <div className="mt-8 border-t border-[#e3ddce] pt-6 text-sm">
            <div className="flex justify-between">
              <span className="text-[#5b6660]">Bridal</span>
              <span className="font-medium">{pesos(r.ingresoBridal)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[#5b6660]">Concierge</span>
              <span className="font-medium">{pesos(r.ingresoConcierge)}</span>
            </div>
            <div className="mt-1 flex justify-between">
              <span className="text-[#5b6660]">Concierge sobre ingresos</span>
              <span className="font-semibold text-[#b77321]">{r.pctConcierge}%</span>
            </div>
          </div>

          <p className="mt-10 border-t border-[#e3ddce] pt-4 text-center text-xs text-[#5b6660]">
            Documento interno de trayectoria de crecimiento. Cifras del mes en curso,
            sujetas a cierre contable. Aurelle &amp; Co. · Monterrey
          </p>
        </div>
      </div>
    </div>
  );
}

function Cifra({
  etiqueta,
  valor,
  nota,
}: {
  etiqueta: string;
  valor: string;
  nota?: string;
}) {
  return (
    <div>
      <p className="text-xs uppercase tracking-wide text-[#5b6660]">{etiqueta}</p>
      <p className="mt-1 text-xl font-semibold">{valor}</p>
      {nota ? <p className="text-xs text-[#5b6660]">{nota}</p> : null}
    </div>
  );
}

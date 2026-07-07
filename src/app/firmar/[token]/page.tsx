import { notFound } from "next/navigation";
import { CheckCircle2 } from "lucide-react";
import { ContratoDoc } from "@/components/documentos/contrato-doc";
import { FirmaForm } from "@/components/documentos/firma-form";
import { getDocumentoParaFirma } from "@/lib/data/documentos";

/*
  Firma pública (§3.12): el cliente abre esta liga SIN cuenta y firma. El token es
  la llave; los datos se leen/escriben con service_role. Fuera del cascarón.
*/
export const metadata = { title: "Firmar documento · Aurelle", robots: { index: false } };

export default async function FirmarPage({
  params,
}: {
  params: Promise<{ token: string }>;
}) {
  const { token } = await params;
  const res = await getDocumentoParaFirma(token);
  if (!res) notFound();
  const { doc, contrato } = res;
  const firmado = doc.estado === "firmado";
  const cancelado = doc.estado === "cancelado";

  return (
    <div className="min-h-dvh bg-[#f5f2eb] px-4 py-8 text-[#08221b]">
      <div className="mx-auto max-w-2xl space-y-5">
        {firmado ? (
          <div className="flex items-center gap-2 rounded-lg border border-[#cfe3d3] bg-[#eef6ef] px-4 py-3 text-sm">
            <CheckCircle2 className="size-5 text-[#2e7d43]" />
            Documento firmado{doc.firmado_por ? ` por ${doc.firmado_por}` : ""}.
          </div>
        ) : cancelado ? (
          <div className="rounded-lg border border-[#e3ddce] bg-white px-4 py-3 text-sm text-[#5b6660]">
            Este documento fue cancelado. Pide a Aurelle una versión actualizada.
          </div>
        ) : (
          <p className="text-sm text-[#5b6660]">
            Revisa tu contrato y fírmalo al final. Cualquier duda, escríbenos por WhatsApp.
          </p>
        )}

        <ContratoDoc
          datos={contrato}
          firmadoPor={firmado ? doc.firmado_por : null}
          firmadoAt={firmado ? doc.firmado_at : null}
        />

        {!firmado && !cancelado ? <FirmaForm token={token} /> : null}
      </div>
    </div>
  );
}

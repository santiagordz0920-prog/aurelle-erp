"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { PenLine } from "lucide-react";
import { firmarDocumento, type ResultadoFirma } from "@/app/firmar/[token]/actions";

const inicial: ResultadoFirma = { ok: false };

function Firmar() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="inline-flex h-11 items-center justify-center gap-2 rounded-md bg-[#08221b] px-6 text-sm font-medium text-white disabled:opacity-50"
    >
      <PenLine className="size-4" />
      {pending ? "Firmando…" : "Firmar y aceptar"}
    </button>
  );
}

export function FirmaForm({ token }: { token: string }) {
  const [estado, action] = useActionState(firmarDocumento, inicial);

  if (estado.ok) {
    return (
      <div className="rounded-lg border border-[#cfe3d3] bg-[#eef6ef] p-5 text-center text-sm text-[#08221b]">
        ¡Gracias! Tu firma quedó registrada. Aurelle &amp; Co. conserva una copia.
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4 rounded-lg border border-[#e3ddce] bg-white p-6">
      <input type="hidden" name="token" value={token} />
      <div className="space-y-1.5">
        <label htmlFor="nombre" className="text-sm font-medium text-[#08221b]">
          Nombre completo
        </label>
        <input
          id="nombre"
          name="nombre"
          required
          placeholder="Tu nombre completo"
          className="h-11 w-full rounded-md border border-[#e3ddce] bg-white px-3 text-sm text-[#08221b] outline-none focus:border-[#b77321]"
        />
      </div>
      <label className="flex items-start gap-2 text-sm text-[#3d4a44]">
        <input type="checkbox" name="acepto" className="mt-1" />
        <span>
          He leído y acepto los términos del contrato. Entiendo que esta aceptación, junto con la
          fecha y hora, constituye mi firma electrónica.
        </span>
      </label>
      {estado.error ? <p className="text-sm text-[#b3261e]">{estado.error}</p> : null}
      <Firmar />
    </form>
  );
}

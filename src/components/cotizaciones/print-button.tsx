"use client";

import { Printer } from "lucide-react";

export function PrintButton() {
  return (
    <button
      onClick={() => window.print()}
      className="inline-flex h-10 items-center gap-2 rounded-md bg-primary px-4 text-sm font-medium text-primary-foreground print:hidden"
    >
      <Printer className="size-4" />
      Imprimir / Guardar PDF
    </button>
  );
}

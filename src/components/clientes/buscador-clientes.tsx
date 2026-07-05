"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";

/* Búsqueda por nombre, teléfono, etiqueta o fuente (§3.1). Actualiza el URL. */
export function BuscadorClientes() {
  const router = useRouter();
  const params = useSearchParams();
  const [valor, setValor] = useState(params.get("q") ?? "");

  useEffect(() => {
    const t = setTimeout(() => {
      const p = new URLSearchParams(Array.from(params.entries()));
      if (valor) p.set("q", valor);
      else p.delete("q");
      router.replace(`/clientes?${p.toString()}`);
    }, 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valor]);

  return (
    <div className="relative w-full sm:max-w-xs">
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        type="search"
        value={valor}
        onChange={(e) => setValor(e.target.value)}
        placeholder="Buscar por nombre, teléfono, etiqueta…"
        className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
    </div>
  );
}

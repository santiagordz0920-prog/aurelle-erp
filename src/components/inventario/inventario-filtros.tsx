"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { Search } from "lucide-react";
import { Select } from "@/components/ui/select";
import { TIPO_ITEM, ESTADO_ITEM } from "@/lib/inventario";

/* Búsqueda + filtros de tipo y estado. Actualizan el URL. */
export function InventarioFiltros() {
  const router = useRouter();
  const params = useSearchParams();
  const [q, setQ] = useState(params.get("q") ?? "");

  function setParam(clave: string, valor: string) {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (valor) p.set(clave, valor);
    else p.delete(clave);
    router.replace(`/taller/inventario?${p.toString()}`);
  }

  useEffect(() => {
    const t = setTimeout(() => setParam("q", q), 250);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
      <div className="relative w-full sm:max-w-xs">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <input
          type="search"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          placeholder="Buscar por SKU, nombre o ubicación…"
          className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-3 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        />
      </div>
      <Select
        defaultValue={params.get("tipo") ?? ""}
        onChange={(e) => setParam("tipo", e.target.value)}
        className="sm:w-44"
      >
        <option value="">Todos los tipos</option>
        {Object.entries(TIPO_ITEM).map(([v, l]) => (
          <option key={v} value={v}>
            {l}
          </option>
        ))}
      </Select>
      <Select
        defaultValue={params.get("estado") ?? ""}
        onChange={(e) => setParam("estado", e.target.value)}
        className="sm:w-44"
      >
        <option value="">Todos los estados</option>
        {Object.entries(ESTADO_ITEM).map(([v, l]) => (
          <option key={v} value={v}>
            {l.etiqueta}
          </option>
        ))}
      </Select>
    </div>
  );
}

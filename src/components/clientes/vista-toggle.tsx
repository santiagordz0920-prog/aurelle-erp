"use client";

import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { List, KanbanSquare } from "lucide-react";
import { cn } from "@/lib/utils";

/* Alterna entre lista y tablero de pipeline (§5: kanban donde hay flujo). */
export function VistaToggle() {
  const params = useSearchParams();
  const vista = params.get("vista") === "pipeline" ? "pipeline" : "lista";

  const href = (v: string) => {
    const p = new URLSearchParams(Array.from(params.entries()));
    if (v === "lista") p.delete("vista");
    else p.set("vista", v);
    const qs = p.toString();
    return `/clientes${qs ? `?${qs}` : ""}`;
  };

  const item = (v: "lista" | "pipeline", Icono: typeof List, txt: string) => (
    <Link
      href={href(v)}
      className={cn(
        "flex h-9 items-center gap-1.5 rounded-md px-3 text-sm font-medium transition-colors",
        vista === v
          ? "bg-primary text-primary-foreground"
          : "text-muted-foreground hover:bg-secondary",
      )}
    >
      <Icono className="size-4" />
      <span className="hidden sm:inline">{txt}</span>
    </Link>
  );

  return (
    <div className="inline-flex items-center gap-1 rounded-lg border border-border bg-card p-1">
      {item("lista", List, "Lista")}
      {item("pipeline", KanbanSquare, "Pipeline")}
    </div>
  );
}

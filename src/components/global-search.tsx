"use client";

import { useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Búsqueda global (Plan Maestro §5, principio UX 2: máximo 2 toques a cualquier
  cliente). Barra permanente arriba en móvil, Cmd+K en escritorio. Hoy busca
  clientes; al sumarse pedidos y conversaciones (Fases posteriores) se amplía.
*/
export function GlobalSearch({ className }: { className?: string }) {
  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    const q = inputRef.current?.value.trim();
    router.push(q ? `/clientes?q=${encodeURIComponent(q)}` : "/clientes");
  }

  return (
    <form onSubmit={onSubmit} className={cn("relative w-full", className)}>
      <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
      <input
        ref={inputRef}
        type="search"
        placeholder="Buscar cliente, pedido, conversación…"
        aria-label="Búsqueda global"
        className="h-11 w-full rounded-md border border-input bg-card pl-9 pr-14 text-sm text-foreground placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
      />
      <kbd className="pointer-events-none absolute right-2.5 top-1/2 hidden -translate-y-1/2 items-center gap-0.5 rounded border border-border bg-secondary px-1.5 py-0.5 text-[10px] font-medium text-muted-foreground sm:inline-flex">
        ⌘K
      </kbd>
    </form>
  );
}

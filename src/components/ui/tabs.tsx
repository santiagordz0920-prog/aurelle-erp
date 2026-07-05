"use client";

import { useState } from "react";
import { cn } from "@/lib/utils";

export type Tab = {
  id: string;
  label: string;
  badge?: number;
  content: React.ReactNode;
};

/*
  Pestañas de la ficha 360 (§5, principio 5). El contenido de cada panel se
  renderiza en el servidor y se pasa como `content`; este componente cliente
  solo alterna cuál se muestra.
*/
export function Tabs({ tabs, initial }: { tabs: Tab[]; initial?: string }) {
  const [activa, setActiva] = useState(initial ?? tabs[0]?.id);

  return (
    <div>
      <div className="-mx-4 overflow-x-auto border-b border-border px-4 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => setActiva(t.id)}
              className={cn(
                "relative flex items-center gap-1.5 whitespace-nowrap px-3 py-2.5 text-sm font-medium transition-colors",
                activa === t.id
                  ? "text-foreground"
                  : "text-muted-foreground hover:text-foreground",
              )}
            >
              {t.label}
              {typeof t.badge === "number" && t.badge > 0 ? (
                <span className="rounded-full bg-secondary px-1.5 text-xs text-muted-foreground">
                  {t.badge}
                </span>
              ) : null}
              {activa === t.id ? (
                <span className="absolute inset-x-2 -bottom-px h-0.5 rounded-full bg-accent" />
              ) : null}
            </button>
          ))}
        </div>
      </div>
      <div className="pt-5">
        {tabs.map((t) => (
          <div key={t.id} hidden={activa !== t.id}>
            {t.content}
          </div>
        ))}
      </div>
    </div>
  );
}

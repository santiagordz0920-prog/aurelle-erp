import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";

/*
  Estado vacío que ENSEÑA (Plan Maestro §5, principio UX 9): cada módulo nuevo
  explica qué hace y cuál es el primer paso, en vez de mostrar una lista vacía.
*/
export function EmptyState({
  icono: Icono,
  titulo,
  descripcion,
  accion,
  className,
}: {
  icono: LucideIcon;
  titulo: string;
  descripcion: string;
  accion?: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center rounded-lg border border-dashed border-border bg-card/50 px-6 py-14 text-center",
        className,
      )}
    >
      <div className="mb-4 flex size-12 items-center justify-center rounded-full bg-accent-soft text-accent">
        <Icono className="size-6" />
      </div>
      <h3 className="text-base font-semibold text-foreground">{titulo}</h3>
      <p className="mt-1 max-w-sm text-sm text-muted-foreground">
        {descripcion}
      </p>
      {accion ? <div className="mt-5">{accion}</div> : null}
    </div>
  );
}

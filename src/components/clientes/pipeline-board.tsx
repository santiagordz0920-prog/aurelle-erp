import Link from "next/link";
import { PIPELINE_ORDEN, ESTADO_PIPELINE, type Cliente } from "@/lib/clientes";
import { CanalBadge } from "./estado-badge";

/*
  Tablero de pipeline de lead (§5: kanban donde hay flujo). Columnas por etapa,
  scroll horizontal en móvil. El arrastre entre columnas queda pendiente (v1
  cambia etapa desde la ficha del cliente); ver docs/modulos/clientes.md.
*/
export function PipelineBoard({ clientes }: { clientes: Cliente[] }) {
  const porEstado = PIPELINE_ORDEN.map((estado) => ({
    estado,
    items: clientes.filter((c) => c.estado_pipeline === estado),
  }));

  return (
    <div className="-mx-4 overflow-x-auto px-4 pb-2 md:mx-0 md:px-0">
      <div className="flex min-w-max gap-3 md:min-w-0">
        {porEstado.map(({ estado, items }) => (
          <div key={estado} className="w-64 shrink-0">
            <div className="mb-2 flex items-center justify-between px-1">
              <span className="text-sm font-semibold text-foreground">
                {ESTADO_PIPELINE[estado].etiqueta}
              </span>
              <span className="text-xs text-muted-foreground">
                {items.length}
              </span>
            </div>
            <div className="flex flex-col gap-2 rounded-lg bg-secondary/50 p-2">
              {items.length === 0 ? (
                <p className="px-1 py-3 text-xs text-muted-foreground">
                  Sin clientes
                </p>
              ) : (
                items.map((c) => (
                  <Link
                    key={c.id}
                    href={`/clientes/${c.id}`}
                    className="rounded-md border border-border bg-card p-3 shadow-sm transition-colors hover:border-accent"
                  >
                    <p className="text-sm font-medium text-foreground">
                      {c.nombre}
                    </p>
                    {c.telefono ? (
                      <p className="mt-0.5 text-xs text-muted-foreground">
                        {c.telefono}
                      </p>
                    ) : null}
                    <div className="mt-1.5">
                      <CanalBadge canal={c.fuente_canal} detalle={c.fuente_detalle} />
                    </div>
                  </Link>
                ))
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

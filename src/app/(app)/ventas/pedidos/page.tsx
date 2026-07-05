import Link from "next/link";
import { ShoppingBag, ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { listarPedidos } from "@/lib/data/pedidos";
import {
  ESTADO_PEDIDO,
  LINEA_NEGOCIO,
  semaforo,
} from "@/lib/pedidos";
import { pesos } from "@/lib/inventario";

export const metadata = { title: "Pedidos" };

export default async function PedidosPage() {
  const pedidos = await listarPedidos();

  return (
    <div className="space-y-5">
      <Link
        href="/ventas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Ventas
      </Link>

      <PageHeader
        titulo="Pedidos"
        descripcion="La columna vertebral: cobrado, por cobrar, etapa y días restantes de un vistazo."
      />

      {pedidos.length === 0 ? (
        <EmptyState
          icono={ShoppingBag}
          titulo="Aún no hay pedidos"
          descripcion="Convierte una cotización aceptada en pedido: el cliente y el total viajan automáticamente."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {pedidos.map((p) => {
            const sem = semaforo(p.fecha_compromiso, p.estado);
            const saldo = p.saldo ?? p.total;
            return (
              <li key={p.id}>
                <Link
                  href={`/ventas/pedidos/${p.id}`}
                  className="flex items-center justify-between gap-3 px-4 py-3 transition-colors hover:bg-secondary/50"
                >
                  <div className="min-w-0">
                    <p className="truncate font-medium text-foreground">
                      {p.cliente_nombre ?? "Sin cliente"}
                      <span className="ml-2 text-xs font-normal text-muted-foreground">
                        {LINEA_NEGOCIO[p.linea_negocio]}
                      </span>
                    </p>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-3 text-xs text-muted-foreground">
                      <span className="font-medium text-foreground">
                        {pesos(p.total)}
                      </span>
                      {saldo > 0 ? (
                        <span>· saldo {pesos(saldo)}</span>
                      ) : (
                        <span className="text-success">· pagado</span>
                      )}
                    </div>
                  </div>
                  <div className="flex shrink-0 flex-col items-end gap-1">
                    <Badge className={ESTADO_PEDIDO[p.estado].clase}>
                      {ESTADO_PEDIDO[p.estado].etiqueta}
                    </Badge>
                    {sem.etiqueta !== "—" ? (
                      <span
                        className={`rounded px-1.5 py-0.5 text-[11px] font-medium ${sem.clase}`}
                      >
                        {sem.etiqueta}
                      </span>
                    ) : null}
                  </div>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

import Link from "next/link";
import { ArrowLeft, Percent, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { ComisionForm } from "@/components/finanzas/comision-form";
import { ComisionPagarBoton } from "@/components/finanzas/comision-pagar-boton";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { listarComisiones, comisionesPorPagar } from "@/lib/data/comisiones";
import { listarPedidos } from "@/lib/data/pedidos";
import { ESTADO_COMISION, TIPO_COMISION } from "@/lib/comisiones";
import { pesos } from "@/lib/inventario";

export const metadata = { title: "Comisiones" };

export default async function ComisionesPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Comisiones es solo para administradores."
      />
    );
  }

  const [comisiones, porPagar, pedidos] = await Promise.all([
    listarComisiones(),
    comisionesPorPagar(),
    listarPedidos(),
  ]);

  // Pedidos con costo real capturado → se puede calcular su utilidad.
  const elegibles = pedidos
    .filter((p) => p.costo_real != null && p.estado !== "cancelado")
    .map((p) => {
      const utilidad = p.total - (p.costo_real ?? 0);
      return {
        id: p.id,
        etiqueta: `${p.cliente_nombre ?? "Sin cliente"} · utilidad ${pesos(utilidad)}`,
      };
    });

  return (
    <div className="space-y-5">
      <Link
        href="/dinero"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Dinero
      </Link>

      <PageHeader
        titulo="Comisiones"
        descripcion="A planners y referidores — siempre un % sobre la utilidad real, nunca sobre el total."
      />

      <div className="rounded-lg border border-border bg-card p-4">
        <p className="text-xs text-muted-foreground">Comisiones por pagar</p>
        <p className="mt-1 text-2xl font-semibold text-foreground">{pesos(porPagar)}</p>
      </div>

      <ComisionForm pedidos={elegibles} />

      {comisiones.length === 0 ? (
        <EmptyState
          icono={Percent}
          titulo="Sin comisiones registradas"
          descripcion="Registra una comisión sobre un pedido con costo capturado; el monto se calcula sobre su utilidad real."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {comisiones.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">
                  {c.beneficiario}
                </p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <Badge className={ESTADO_COMISION[c.estado].clase}>
                    {ESTADO_COMISION[c.estado].etiqueta}
                  </Badge>
                  <span>{TIPO_COMISION[c.tipo]}</span>
                  <span>· {c.porcentaje}%</span>
                  {c.pedido_cliente ? <span>· {c.pedido_cliente}</span> : null}
                </div>
              </div>
              <div className="flex shrink-0 items-center gap-3">
                <span className="text-sm font-semibold text-foreground">{pesos(c.monto)}</span>
                {c.estado === "devengada" ? <ComisionPagarBoton id={c.id} /> : null}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

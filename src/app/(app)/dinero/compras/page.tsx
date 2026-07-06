import Link from "next/link";
import { ArrowLeft, ShoppingCart, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { CompraForm } from "@/components/finanzas/compra-form";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { listarCompras } from "@/lib/data/compras";
import { listarProveedores } from "@/lib/data/proveedores";
import { CONDICION_COMPRA, TIPO_COMPRA } from "@/lib/compras";
import { pesos } from "@/lib/inventario";

export const metadata = { title: "Compras" };

export default async function ComprasPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Compras y cuentas por pagar son solo para administradores."
      />
    );
  }

  const [compras, proveedores] = await Promise.all([
    listarCompras(),
    listarProveedores(),
  ]);

  return (
    <div className="space-y-5">
      <Link
        href="/dinero/proveedores"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Proveedores
      </Link>

      <PageHeader
        titulo="Compras"
        descripcion="Cada compra genera su asiento en Finanzas; a crédito, además su cuenta por pagar."
      />

      <CompraForm proveedores={proveedores.map((p) => ({ id: p.id, nombre: p.nombre }))} />

      {compras.length === 0 ? (
        <EmptyState
          icono={ShoppingCart}
          titulo="Sin compras registradas"
          descripcion="Registra la primera: elige proveedor, tipo (inventario o gasto) y condición de pago."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {compras.map((c) => (
            <li key={c.id} className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-foreground">{c.concepto}</p>
                <div className="mt-0.5 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
                  <span>{c.proveedor_nombre ?? "Sin proveedor"}</span>
                  <span>· {TIPO_COMPRA[c.tipo]}</span>
                  <Badge className={CONDICION_COMPRA[c.condicion_pago].clase}>
                    {CONDICION_COMPRA[c.condicion_pago].etiqueta}
                  </Badge>
                  <span>· {formatearFecha(c.fecha)}</span>
                </div>
              </div>
              <span className="shrink-0 text-sm font-semibold text-foreground">
                {pesos(c.monto)}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function formatearFecha(iso: string): string {
  return new Date(iso + "T00:00:00").toLocaleDateString("es-MX", {
    day: "numeric",
    month: "short",
  });
}

import Link from "next/link";
import { ArrowLeft, CalendarHeart, Repeat } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { resumenPostventa } from "@/lib/data/postventa";
import { estadoGarantia, diasHasta } from "@/lib/postventa";

export const metadata = { title: "Postventa" };

export default async function PostventaPage() {
  const resumen = await resumenPostventa();

  // Oportunidades: garantías por vencer (≤60d) y aniversarios de entrega próximos (≤30d).
  const garantiasPorVencer = resumen.piezas
    .filter((p) => {
      const d = diasHasta(p.garantia_hasta);
      return d != null && d >= 0 && d <= 60;
    })
    .sort((a, b) => (a.garantia_hasta ?? "").localeCompare(b.garantia_hasta ?? ""));

  return (
    <div className="space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>

      <PageHeader
        titulo="Postventa"
        descripcion="Piezas entregadas, garantías y recompra. Cada entrega es la siguiente venta."
      />

      {/* Métrica de recompra */}
      <div className="grid gap-4 sm:grid-cols-3">
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <CalendarHeart className="size-4" />
            Piezas entregadas
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">{resumen.totalEntregadas}</p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Repeat className="size-4" />
            Clientes que recompran
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {resumen.clientesRecompra}
            <span className="ml-1 text-sm font-normal text-muted-foreground">
              / {resumen.totalClientesEntregados}
            </span>
          </p>
        </Card>
        <Card className="p-4">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Repeat className="size-4" />
            Tasa de recompra
          </div>
          <p className="mt-2 text-2xl font-semibold text-foreground">
            {(resumen.tasaRecompra * 100).toFixed(0)}%
          </p>
        </Card>
      </div>

      {/* Garantías por vencer (oportunidad de contacto) */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Garantías por vencer (60 días)</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {garantiasPorVencer.length === 0 ? (
            <EmptyState
              icono={CalendarHeart}
              titulo="Nada por vencer"
              descripcion="Las garantías próximas a vencer aparecerán aquí como oportunidad de contacto (limpieza gratis, revisión)."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {garantiasPorVencer.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/ventas/pedidos/${p.pedido_id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50"
                  >
                    <span className="text-foreground">{p.cliente_nombre ?? "Sin cliente"}</span>
                    <span className={`text-xs ${estadoGarantia(p.garantia_hasta).clase}`}>
                      {estadoGarantia(p.garantia_hasta).etiqueta}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      {/* Todas las piezas entregadas */}
      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Piezas entregadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {resumen.piezas.length === 0 ? (
            <EmptyState
              icono={CalendarHeart}
              titulo="Aún sin entregas"
              descripcion="Al marcar un pedido como entregado se crea aquí su registro de postventa (garantía + aniversarios)."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {resumen.piezas.map((p) => (
                <li key={p.id}>
                  <Link
                    href={`/ventas/pedidos/${p.pedido_id}`}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 text-sm hover:bg-secondary/50"
                  >
                    <span className="text-foreground">{p.cliente_nombre ?? "Sin cliente"}</span>
                    <span className="text-xs text-muted-foreground">
                      Entregada {p.entregada_at.slice(0, 10)}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

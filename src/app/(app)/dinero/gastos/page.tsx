import Link from "next/link";
import { ArrowLeft, Repeat, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { GastoForm } from "@/components/finanzas/gasto-form";
import { GastoItem } from "@/components/finanzas/gasto-item";
import { PostearGastosBoton } from "@/components/finanzas/postear-gastos-boton";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { listarGastosRecurrentes, burnMensual } from "@/lib/data/gastos";
import { pesos } from "@/lib/inventario";

export const metadata = { title: "Gastos recurrentes" };

export default async function GastosPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Finanzas y gastos son solo para administradores."
      />
    );
  }

  const [gastos, burn] = await Promise.all([
    listarGastosRecurrentes(),
    burnMensual(),
  ]);

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
        titulo="Gastos recurrentes"
        descripcion="Renta, suscripciones y servicios: se dan de alta una vez y se postean solos cada mes."
        accion={<PostearGastosBoton />}
      />

      <Card className="flex items-center justify-between p-4">
        <div>
          <p className="text-xs text-muted-foreground">Burn fijo mensual (activos)</p>
          <p className="text-2xl font-semibold text-foreground">{pesos(burn)}</p>
        </div>
        <div className="flex size-10 items-center justify-center rounded-md bg-accent-soft text-accent">
          <Repeat className="size-5" />
        </div>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nuevo gasto recurrente</CardTitle>
        </CardHeader>
        <CardContent>
          <GastoForm />
        </CardContent>
      </Card>

      {gastos.length === 0 ? (
        <EmptyState
          icono={Repeat}
          titulo="Sin gastos recurrentes"
          descripcion="Da de alta la renta de Ellion y las suscripciones. Cada mes se postean solos al ledger y alimentan la proyección de flujo."
        />
      ) : (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">
              Compromisos fijos{" "}
              <span className="text-muted-foreground">({gastos.length})</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0">
            <ul className="divide-y divide-border">
              {gastos.map((g) => (
                <GastoItem key={g.id} gasto={g} />
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

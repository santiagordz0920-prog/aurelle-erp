import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { CotizacionBuilder } from "@/components/cotizaciones/cotizacion-builder";
import { Card, CardContent } from "@/components/ui/card";
import { listarClientes } from "@/lib/data/clientes";
import { getUsuarioActual } from "@/lib/session";

export const metadata = { title: "Nueva cotización" };

export default async function NuevaCotizacionPage() {
  const [clientes, usuario] = await Promise.all([
    listarClientes(),
    getUsuarioActual(),
  ]);

  return (
    <div className="mx-auto max-w-3xl space-y-5">
      <Link
        href="/ventas/cotizaciones"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Cotizaciones
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nueva cotización
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Agrega los componentes de la pieza; el total se calcula solo.
        </p>
      </div>
      <Card>
        <CardContent className="p-5 pt-5">
          <CotizacionBuilder
            clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))}
            esAdmin={usuario.rol === "admin"}
          />
        </CardContent>
      </Card>
    </div>
  );
}

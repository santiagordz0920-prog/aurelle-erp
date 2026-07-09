import Link from "next/link";
import { ArrowLeft, CalendarClock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { CitaForm } from "@/components/citas/cita-form";
import { CitaItem } from "@/components/citas/cita-item";
import { listarCitas } from "@/lib/data/citas";
import { listarClientes } from "@/lib/data/clientes";
import type { Cita } from "@/lib/citas";
import { rangoDiaMonterrey } from "@/lib/citas";

export const metadata = { title: "Citas" };

const TZ = "America/Monterrey";

function diaKey(iso: string): string {
  // Fecha en zona Monterrey (YYYY-MM-DD) para agrupar.
  return new Date(iso).toLocaleDateString("en-CA", { timeZone: TZ });
}
function diaEtiqueta(iso: string): string {
  return new Date(iso).toLocaleDateString("es-MX", {
    timeZone: TZ,
    weekday: "long",
    day: "numeric",
    month: "long",
  });
}

export default async function CitasPage() {
  // Desde el inicio del día de Monterrey (no del día UTC, que en Vercel se corre 6h).
  const { desde } = rangoDiaMonterrey();
  const [citas, clientes] = await Promise.all([
    listarCitas({ desde }),
    listarClientes(),
  ]);

  // Agrupar por día.
  const grupos = new Map<string, Cita[]>();
  for (const c of citas) {
    const k = diaKey(c.inicio);
    if (!grupos.has(k)) grupos.set(k, []);
    grupos.get(k)!.push(c);
  }
  const dias = [...grupos.entries()].sort((a, b) => a[0].localeCompare(b[0]));
  const hoyKey = diaKey(new Date().toISOString());

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
        titulo="Citas"
        descripcion="Agenda del showroom Ellion. El resultado de cada cita alimenta el funnel."
      />

      <CitaForm clientes={clientes.map((c) => ({ id: c.id, nombre: c.nombre }))} />

      {dias.length === 0 ? (
        <EmptyState
          icono={CalendarClock}
          titulo="Sin citas próximas"
          descripcion="Agenda la primera: elige cliente, tipo, sala y horario. Se avisa si la sala ya está ocupada."
        />
      ) : (
        <div className="space-y-5">
          {dias.map(([k, delDia]) => (
            <div key={k}>
              <p className="mb-1.5 text-sm font-medium capitalize text-foreground">
                {k === hoyKey ? "Hoy · " : ""}
                {diaEtiqueta(delDia[0].inicio)}
              </p>
              <Card>
                <CardContent className="p-0">
                  <ul className="divide-y divide-border">
                    {delDia.map((c) => (
                      <CitaItem key={c.id} cita={c} />
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

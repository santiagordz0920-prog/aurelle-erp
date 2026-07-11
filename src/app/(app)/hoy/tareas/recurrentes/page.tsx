import Link from "next/link";
import { ArrowLeft, Repeat } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { RecurrenteForm } from "@/components/tareas/recurrente-form";
import { RecurrenteRow } from "@/components/tareas/recurrente-row";
import { listarRecurrentes } from "@/lib/data/recurrentes";
import { listarUsuarios } from "@/lib/data/usuarios";

export const metadata = { title: "Tareas recurrentes" };

export default async function RecurrentesPage() {
  const [recurrentes, usuarios] = await Promise.all([listarRecurrentes(), listarUsuarios()]);

  return (
    <div className="space-y-5">
      <Link
        href="/hoy/tareas"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Tareas
      </Link>

      <PageHeader
        titulo="Tareas recurrentes"
        descripcion="Plantillas que el sistema convierte en tarea sola cada semana o cada mes (conteo de vitrinas, revisar precios de metales…)."
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Nueva tarea recurrente</CardTitle>
        </CardHeader>
        <CardContent>
          <RecurrenteForm usuarios={usuarios} />
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-sm">Activas y pausadas</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {recurrentes.length === 0 ? (
            <EmptyState
              icono={Repeat}
              titulo="Sin tareas recurrentes"
              descripcion="Crea una arriba. Cada noche, cuando toque su día, aparecerá como tarea en tu Hoy."
              className="border-0 bg-transparent py-8"
            />
          ) : (
            <ul className="divide-y divide-border">
              {recurrentes.map((r) => (
                <RecurrenteRow key={r.id} r={r} />
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}

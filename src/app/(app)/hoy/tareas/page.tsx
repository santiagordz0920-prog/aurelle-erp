import Link from "next/link";
import { ArrowLeft, ListTodo } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TareaForm } from "@/components/tareas/tarea-form";
import { TareaItem } from "@/components/tareas/tarea-item";
import { listarTareas } from "@/lib/data/tareas";
import { listarUsuarios } from "@/lib/data/usuarios";

export const metadata = { title: "Tareas" };

export default async function TareasPage() {
  const [tareas, usuarios] = await Promise.all([
    listarTareas(),
    listarUsuarios(),
  ]);
  const pendientes = tareas.filter((t) => t.estado === "pendiente");
  const hechas = tareas.filter((t) => t.estado === "hecha");

  return (
    <div className="space-y-5">
      <Link
        href="/hoy"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Hoy
      </Link>

      <PageHeader
        titulo="Tareas"
        descripcion="Los pendientes del equipo, vinculados a la realidad del negocio."
      />

      <TareaForm usuarios={usuarios.map((u) => ({ id: u.id, nombre: u.nombre }))} />

      {pendientes.length === 0 && hechas.length === 0 ? (
        <EmptyState
          icono={ListTodo}
          titulo="Sin tareas todavía"
          descripcion="Crea tu primera tarea arriba. Puedes asignarla, ponerle prioridad y fecha."
        />
      ) : (
        <div className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Pendientes{" "}
                <span className="text-muted-foreground">({pendientes.length})</span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              {pendientes.length === 0 ? (
                <p className="px-4 py-6 text-sm text-muted-foreground">
                  Nada pendiente. 🎉
                </p>
              ) : (
                <ul className="divide-y divide-border">
                  {pendientes.map((t) => (
                    <TareaItem key={t.id} tarea={t} />
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          {hechas.length > 0 ? (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm text-muted-foreground">
                  Hechas ({hechas.length})
                </CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <ul className="divide-y divide-border">
                  {hechas.map((t) => (
                    <TareaItem key={t.id} tarea={t} />
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}
        </div>
      )}
    </div>
  );
}

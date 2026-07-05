import {
  CalendarClock,
  MessageSquareText,
  ListTodo,
  BellRing,
} from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/empty-state";
import { getUsuarioActual } from "@/lib/session";

export const metadata = { title: "Hoy" };

/*
  "Hoy" — pantalla de inicio (Plan Maestro §3.16 y §5). Al abrir el ERP: citas
  de hoy, mensajes esperando aprobación, tareas del día y alertas. En Fase 0 son
  estados vacíos que enseñan; se llenan cuando existan Citas/CRM/Tareas (Fases 1+).
*/
export default async function HoyPage() {
  const usuario = await getUsuarioActual();
  const saludo = obtenerSaludo();

  return (
    <div className="space-y-6">
      <div>
        <p className="text-sm text-muted-foreground">{saludo},</p>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          {usuario.nombre}
        </h1>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarClock className="size-4 text-accent" />
              Citas de hoy
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icono={CalendarClock}
              titulo="Aún no hay citas"
              descripcion="Cuando el módulo de Citas esté activo (Fase 3), aquí verás las visitas y entregas del día."
              className="border-0 bg-transparent py-8"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquareText className="size-4 text-accent" />
              Mensajes esperando aprobación
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icono={MessageSquareText}
              titulo="Bandeja limpia"
              descripcion="Los borradores de la IA para mensajes sensibles (señales 2ct+, quejas) aparecerán aquí para aprobar en un toque (Fase 5)."
              className="border-0 bg-transparent py-8"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <ListTodo className="size-4 text-accent" />
              Tareas del día
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icono={ListTodo}
              titulo="Sin tareas por hoy"
              descripcion="Tus pendientes y las sugerencias de la IA (cotización sin respuesta, pedido atascado) vivirán aquí (Fase 1+)."
              className="border-0 bg-transparent py-8"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <BellRing className="size-4 text-accent" />
              Alertas
            </CardTitle>
          </CardHeader>
          <CardContent>
            <EmptyState
              icono={BellRing}
              titulo="Todo en orden"
              descripcion="Pagos vencidos, pedidos atascados, stock bajo y contratos sin firmar se notificarán aquí."
              className="border-0 bg-transparent py-8"
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function obtenerSaludo(): string {
  const h = new Date().getHours();
  if (h < 12) return "Buenos días";
  if (h < 19) return "Buenas tardes";
  return "Buenas noches";
}

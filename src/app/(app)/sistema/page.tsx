import { Settings, ShieldCheck } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { getUsuarioActual } from "@/lib/session";
import { ROLES } from "@/lib/roles";

export const metadata = { title: "Sistema" };

export default async function SistemaPage() {
  const usuario = await getUsuarioActual();

  return (
    <div className="space-y-6">
      <PageHeader
        titulo="Sistema"
        descripcion="Usuarios, plantillas, base de conocimiento y configuración."
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="size-4 text-accent" />
            Sesión actual
          </CardTitle>
          <CardDescription>
            {usuario.nombre} · Rol {ROLES[usuario.rol].etiqueta}
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Settings className="size-4 text-accent" />
            Configuración en desarrollo
          </CardTitle>
          <CardDescription>
            La gestión de usuarios y roles, plantillas de WhatsApp, base de
            conocimiento (SOPs, guía IGI) y configuración general se completan a
            lo largo de las fases. Los permisos ya están garantizados por RLS en
            la base de datos.
          </CardDescription>
        </CardHeader>
      </Card>
    </div>
  );
}

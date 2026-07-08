import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowLeft, ScrollText } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ClausulasEditor } from "@/components/documentos/clausulas-editor";
import { getUsuarioActual } from "@/lib/session";
import { listarClausulasContrato } from "@/lib/data/documentos";

export const metadata = { title: "Cláusulas del contrato" };

export default async function ClausulasContratoPage() {
  const usuario = await getUsuarioActual();
  // Texto legal del negocio: solo admin. La RLS también lo impone.
  if (usuario.rol !== "admin") redirect("/sistema");

  const clausulas = await listarClausulasContrato();

  return (
    <div className="space-y-5">
      <Link
        href="/sistema"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Sistema
      </Link>

      <PageHeader
        titulo="Cláusulas del contrato"
        descripcion="El texto legal (anticipos, garantía, especificaciones…) que aparece en el contrato de compraventa. Se edita aquí sin tocar código."
      />

      <Card className="border-accent/30 bg-accent-soft/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-sm">
            <ScrollText className="size-4 text-accent" />
            Cómo funciona
          </CardTitle>
          <CardDescription>
            Los cambios aplican a los contratos que se generen o impriman de aquí
            en adelante. Un contrato <strong>ya firmado</strong> conserva las
            cláusulas que tenía al firmarse (no cambian aunque edites aquí).
          </CardDescription>
        </CardHeader>
      </Card>

      <Card>
        <CardContent className="p-5">
          <ClausulasEditor clausulas={clausulas} />
        </CardContent>
      </Card>
    </div>
  );
}

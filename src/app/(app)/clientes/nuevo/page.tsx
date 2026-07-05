import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ClienteForm } from "@/components/clientes/cliente-form";
import { Card, CardContent } from "@/components/ui/card";

export const metadata = { title: "Nuevo cliente" };

export default function NuevoClientePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/clientes"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Clientes
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nuevo cliente
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Solo el nombre es obligatorio. Puedes completar el resto después.
        </p>
      </div>
      <Card>
        <CardContent className="p-5 pt-5">
          <ClienteForm />
        </CardContent>
      </Card>
    </div>
  );
}

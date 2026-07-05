import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { ItemForm } from "@/components/inventario/item-form";
import { Card, CardContent } from "@/components/ui/card";
import { getUsuarioActual } from "@/lib/session";

export const metadata = { title: "Nuevo item" };

export default async function NuevoItemPage() {
  const usuario = await getUsuarioActual();
  return (
    <div className="mx-auto max-w-2xl space-y-5">
      <Link
        href="/taller/inventario"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Inventario
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-foreground">
          Nuevo item de inventario
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          SKU, tipo y nombre son obligatorios. El resto según el tipo de pieza.
        </p>
      </div>
      <Card>
        <CardContent className="p-5 pt-5">
          <ItemForm esAdmin={usuario.rol === "admin"} />
        </CardContent>
      </Card>
    </div>
  );
}

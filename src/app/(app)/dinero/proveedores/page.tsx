import Link from "next/link";
import { ArrowLeft, Truck, Lock } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import { Badge } from "@/components/ui/badge";
import { ProveedorForm } from "@/components/finanzas/proveedor-form";
import { getUsuarioActual } from "@/lib/session";
import { puedeVerAreaAdmin } from "@/lib/roles";
import { listarProveedores } from "@/lib/data/proveedores";

export const metadata = { title: "Proveedores" };

export default async function ProveedoresPage() {
  const usuario = await getUsuarioActual();
  if (!puedeVerAreaAdmin(usuario.rol)) {
    return (
      <EmptyState
        icono={Lock}
        titulo="Área restringida"
        descripcion="Proveedores y cuentas por pagar son solo para administradores."
      />
    );
  }

  const proveedores = await listarProveedores();

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
        titulo="Proveedores"
        descripcion="Directorio de a quién le compra Aurelle: contacto, categorías y condiciones."
      />

      <ProveedorForm />

      {proveedores.length === 0 ? (
        <EmptyState
          icono={Truck}
          titulo="Aún no hay proveedores"
          descripcion="Da de alta el primero: metales, casting, piedras, empaque… con sus condiciones de pago."
        />
      ) : (
        <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
          {proveedores.map((p) => (
            <li key={p.id} className="px-4 py-3">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-medium text-foreground">{p.nombre}</p>
                  {p.contacto ? (
                    <p className="mt-0.5 text-xs text-muted-foreground">{p.contacto}</p>
                  ) : null}
                  {p.categorias.length > 0 ? (
                    <div className="mt-1.5 flex flex-wrap gap-1.5">
                      {p.categorias.map((c) => (
                        <Badge key={c} className="bg-accent-soft text-accent">
                          {c}
                        </Badge>
                      ))}
                    </div>
                  ) : null}
                </div>
                {p.condiciones_pago ? (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {p.condiciones_pago}
                  </span>
                ) : null}
              </div>
              {p.notas ? (
                <p className="mt-2 text-xs text-muted-foreground">{p.notas}</p>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

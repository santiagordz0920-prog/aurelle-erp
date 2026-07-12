import Link from "next/link";
import { ArrowLeft, BookUser } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { EmptyState } from "@/components/empty-state";
import {
  NuevoContactoUtil,
  ContactoUtilItem,
} from "@/components/taller/contacto-util";
import { listarContactosUtiles } from "@/lib/data/contactos-utiles";
import {
  TIPOS_CONTACTO_UTIL,
  etiquetaTipo,
  type ContactoUtil,
} from "@/lib/contactos-utiles";

export const metadata = { title: "Contactos del gremio" };

/*
  Directorio de contactos para tercerizar procesos (joyeros, vaciadores,
  montadores…): especialidad, tiempo de entrega y precios estimados a la
  vista de todo el equipo. Nada obligatorio salvo el nombre.
*/
export default async function ContactosUtilesPage() {
  const contactos = await listarContactosUtiles();

  // Agrupar por oficio en el orden sugerido; tipos libres y sin clasificar al final.
  const grupos: { titulo: string; items: ContactoUtil[] }[] = [];
  const orden: (string | null)[] = [
    ...TIPOS_CONTACTO_UTIL.filter((t) => t !== "otro"),
    ...[...new Set(
      contactos
        .map((c) => c.tipo)
        .filter((t): t is string => Boolean(t) && !TIPOS_CONTACTO_UTIL.includes(t as never)),
    )],
    "otro",
    null,
  ];
  for (const tipo of orden) {
    const items = contactos.filter((c) => (c.tipo ?? null) === tipo);
    if (items.length > 0) grupos.push({ titulo: etiquetaTipo(tipo), items });
  }

  return (
    <div className="space-y-5">
      <Link
        href="/taller"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="size-4" />
        Taller
      </Link>

      <PageHeader
        titulo="Contactos del gremio"
        descripcion="A quién recurrir para tercerizar: joyeros, vaciadores y montadores con su especialidad, tiempos y precios de referencia."
      />

      <NuevoContactoUtil />

      {contactos.length === 0 ? (
        <EmptyState
          icono={BookUser}
          titulo="Aún no hay contactos"
          descripcion="Registra al primer joyero, vaciador o montador. Solo el nombre es obligatorio — la especialidad, tiempos y precios se van enriqueciendo."
        />
      ) : (
        <div className="space-y-5">
          {grupos.map((g) => (
            <section key={g.titulo}>
              <h2 className="mb-2 text-sm font-medium text-muted-foreground">
                {g.titulo}
              </h2>
              <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
                {g.items.map((c) => (
                  <ContactoUtilItem key={c.id} contacto={c} />
                ))}
              </ul>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}

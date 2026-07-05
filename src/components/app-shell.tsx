"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { areasVisibles } from "@/lib/nav";
import type { Rol } from "@/lib/roles";
import { ROLES } from "@/lib/roles";
import { BrandWordmark } from "./brand-wordmark";
import { GlobalSearch } from "./global-search";
import { cn } from "@/lib/utils";

/*
  Estructura de la app (Plan Maestro §5): barra lateral en escritorio, tabs
  abajo + búsqueda arriba en móvil. Mobile-first. El área activa se resalta con
  el acento dorado, usado con moderación. Las áreas soloAdmin se filtran por rol.
*/
export function AppShell({
  rol,
  usuario,
  children,
}: {
  rol: Rol;
  usuario: { nombre: string };
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const areas = areasVisibles(rol);

  const esActiva = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");

  return (
    <div className="min-h-dvh bg-background">
      {/* ── Barra lateral (escritorio) ─────────────────────────────── */}
      <aside className="fixed inset-y-0 left-0 hidden w-64 flex-col border-r border-border bg-card px-4 py-5 md:flex">
        <div className="px-2 pb-6">
          <BrandWordmark />
          <p className="mt-1 text-xs text-muted-foreground">ERP interno</p>
        </div>
        <nav className="flex flex-1 flex-col gap-1">
          {areas.map((area) => {
            const Icono = area.icono;
            const activa = esActiva(area.href);
            return (
              <Link
                key={area.href}
                href={area.href}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors",
                  activa
                    ? "bg-primary text-primary-foreground"
                    : "text-foreground hover:bg-secondary",
                )}
              >
                <Icono
                  className={cn(
                    "size-4",
                    activa ? "text-accent" : "text-muted-foreground",
                  )}
                />
                {area.etiqueta}
              </Link>
            );
          })}
        </nav>
        <div className="mt-4 flex items-center gap-3 rounded-md border border-border px-3 py-2.5">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {usuario.nombre.slice(0, 1).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="truncate text-sm font-medium text-foreground">
              {usuario.nombre}
            </p>
            <p className="text-xs text-muted-foreground">{ROLES[rol].etiqueta}</p>
          </div>
        </div>
      </aside>

      {/* ── Barra superior (móvil): marca + búsqueda ───────────────── */}
      <header className="sticky top-0 z-20 flex flex-col gap-3 border-b border-border bg-card/95 px-4 py-3 backdrop-blur md:hidden">
        <div className="flex items-center justify-between">
          <BrandWordmark className="text-base" />
          <div className="flex size-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-primary-foreground">
            {usuario.nombre.slice(0, 1).toUpperCase()}
          </div>
        </div>
        <GlobalSearch />
      </header>

      {/* ── Contenido ──────────────────────────────────────────────── */}
      <div className="md:pl-64">
        {/* Búsqueda arriba en escritorio */}
        <div className="sticky top-0 z-10 hidden border-b border-border bg-background/80 px-8 py-3 backdrop-blur md:block">
          <div className="max-w-xl">
            <GlobalSearch />
          </div>
        </div>
        <main className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 md:px-8 md:pb-12">
          {children}
        </main>
      </div>

      {/* ── Tabs inferiores (móvil) ────────────────────────────────── */}
      <nav className="fixed inset-x-0 bottom-0 z-20 grid grid-flow-col border-t border-border bg-card/95 backdrop-blur md:hidden">
        {areas.map((area) => {
          const Icono = area.icono;
          const activa = esActiva(area.href);
          return (
            <Link
              key={area.href}
              href={area.href}
              className={cn(
                "flex flex-col items-center gap-1 py-2 text-[10px] font-medium transition-colors",
                activa ? "text-accent" : "text-muted-foreground",
              )}
            >
              <Icono className="size-5" />
              {area.etiqueta}
            </Link>
          );
        })}
      </nav>
    </div>
  );
}

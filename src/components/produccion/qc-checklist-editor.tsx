"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, Eye, EyeOff, Check, X, Pencil } from "lucide-react";
import type { LineaNegocio } from "@/lib/pedidos";
import type { QcChecklistItem } from "@/lib/produccion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  agregarChecklistItem,
  editarChecklistItem,
  alternarChecklistItem,
  moverChecklistItem,
  eliminarChecklistItem,
} from "@/app/(app)/taller/produccion/qc-actions";

/*
  Editor del checklist de QC de UNA línea (0023). Admin agrega, edita, reordena,
  activa/desactiva y elimina puntos. Los cambios impactan el QC de las órdenes de
  esa línea. Un punto desactivado se conserva pero no aparece en el QC.
*/
export function QcChecklistEditor({
  linea,
  items,
}: {
  linea: LineaNegocio;
  items: QcChecklistItem[];
}) {
  const [nuevo, setNuevo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTexto, setEditTexto] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  function run(fn: () => Promise<{ ok: boolean; error?: string }>) {
    setError(null);
    start(async () => {
      const r = await fn();
      if (!r.ok) setError(r.error ?? "No se pudo completar la acción.");
    });
  }

  return (
    <div className="space-y-3">
      <ul className="divide-y divide-border overflow-hidden rounded-lg border border-border">
        {items.length === 0 ? (
          <li className="px-4 py-3 text-sm text-muted-foreground">
            Sin puntos. Agrega el primero abajo.
          </li>
        ) : (
          items.map((it, i) => (
            <li
              key={it.id}
              className={`flex items-center gap-2 px-3 py-2 text-sm ${it.activo ? "" : "bg-muted/40"}`}
            >
              {editId === it.id ? (
                <>
                  <Input
                    value={editTexto}
                    onChange={(e) => setEditTexto(e.target.value)}
                    className="h-9 flex-1"
                    autoFocus
                  />
                  <Button
                    variant="ghost"
                    size="sm"
                    disabled={pending}
                    aria-label="Guardar"
                    onClick={() =>
                      run(async () => {
                        const r = await editarChecklistItem(it.id, editTexto);
                        if (r.ok) setEditId(null);
                        return r;
                      })
                    }
                  >
                    <Check className="size-4 text-success" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label="Cancelar"
                    onClick={() => setEditId(null)}
                  >
                    <X className="size-4" />
                  </Button>
                </>
              ) : (
                <>
                  <span
                    className={`flex-1 ${it.activo ? "text-foreground" : "text-muted-foreground line-through"}`}
                  >
                    {it.texto}
                  </span>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || i === 0}
                      aria-label="Subir"
                      onClick={() => run(() => moverChecklistItem(it.id, "arriba"))}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || i === items.length - 1}
                      aria-label="Bajar"
                      onClick={() => run(() => moverChecklistItem(it.id, "abajo"))}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label="Editar"
                      onClick={() => {
                        setEditId(it.id);
                        setEditTexto(it.texto);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label={it.activo ? "Desactivar" : "Activar"}
                      onClick={() => run(() => alternarChecklistItem(it.id, !it.activo))}
                    >
                      {it.activo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label="Eliminar"
                      onClick={() => run(() => eliminarChecklistItem(it.id))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))
        )}
      </ul>

      <div className="flex flex-wrap items-center gap-2">
        <Input
          value={nuevo}
          onChange={(e) => setNuevo(e.target.value)}
          placeholder="Nuevo punto de control…"
          className="h-10 min-w-[12rem] flex-1"
          onKeyDown={(e) => {
            if (e.key === "Enter" && nuevo.trim()) {
              e.preventDefault();
              run(async () => {
                const r = await agregarChecklistItem(linea, nuevo);
                if (r.ok) setNuevo("");
                return r;
              });
            }
          }}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pending || nuevo.trim().length < 3}
          onClick={() =>
            run(async () => {
              const r = await agregarChecklistItem(linea, nuevo);
              if (r.ok) setNuevo("");
              return r;
            })
          }
        >
          <Plus className="size-4" />
          Agregar
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

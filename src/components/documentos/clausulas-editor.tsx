"use client";

import { useState, useTransition } from "react";
import { ChevronUp, ChevronDown, Trash2, Plus, Eye, EyeOff, Check, X, Pencil } from "lucide-react";
import type { ClausulaContrato } from "@/lib/documentos";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  agregarClausula,
  editarClausula,
  alternarClausula,
  moverClausula,
  eliminarClausula,
} from "@/app/(app)/sistema/contrato-actions";

/*
  Editor de las cláusulas legales del contrato (0024). Admin agrega, edita,
  reordena, activa/desactiva y elimina. Una cláusula desactivada se conserva pero
  no aparece en el contrato. Al firmar, las cláusulas vigentes se congelan en el
  snapshot: editar aquí NO cambia contratos ya firmados.
*/
export function ClausulasEditor({ clausulas }: { clausulas: ClausulaContrato[] }) {
  const [nuevoTitulo, setNuevoTitulo] = useState("");
  const [nuevoCuerpo, setNuevoCuerpo] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [editTitulo, setEditTitulo] = useState("");
  const [editCuerpo, setEditCuerpo] = useState("");
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
    <div className="space-y-4">
      <ul className="space-y-2">
        {clausulas.length === 0 ? (
          <li className="rounded-lg border border-border px-4 py-3 text-sm text-muted-foreground">
            Sin cláusulas. Agrega la primera abajo.
          </li>
        ) : (
          clausulas.map((c, i) => (
            <li
              key={c.id}
              className={`rounded-lg border border-border px-3 py-3 ${c.activo ? "" : "bg-muted/40"}`}
            >
              {editId === c.id ? (
                <div className="space-y-2">
                  <Input
                    value={editTitulo}
                    onChange={(e) => setEditTitulo(e.target.value)}
                    placeholder="Título"
                    className="h-9"
                  />
                  <Textarea
                    value={editCuerpo}
                    onChange={(e) => setEditCuerpo(e.target.value)}
                    placeholder="Texto de la cláusula"
                    rows={3}
                  />
                  <div className="flex items-center gap-2">
                    <Button
                      variant="primary"
                      size="sm"
                      disabled={pending}
                      onClick={() =>
                        run(async () => {
                          const r = await editarClausula(c.id, editTitulo, editCuerpo);
                          if (r.ok) setEditId(null);
                          return r;
                        })
                      }
                    >
                      <Check className="size-4" />
                      Guardar
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditId(null)}>
                      <X className="size-4" />
                      Cancelar
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start gap-2">
                  <div className="flex-1">
                    <p
                      className={`text-sm font-medium ${c.activo ? "text-foreground" : "text-muted-foreground line-through"}`}
                    >
                      {c.titulo}
                    </p>
                    <p className="mt-0.5 text-xs leading-relaxed text-muted-foreground">{c.cuerpo}</p>
                  </div>
                  <div className="flex shrink-0 items-center">
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || i === 0}
                      aria-label="Subir"
                      onClick={() => run(() => moverClausula(c.id, "arriba"))}
                    >
                      <ChevronUp className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending || i === clausulas.length - 1}
                      aria-label="Bajar"
                      onClick={() => run(() => moverClausula(c.id, "abajo"))}
                    >
                      <ChevronDown className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label="Editar"
                      onClick={() => {
                        setEditId(c.id);
                        setEditTitulo(c.titulo);
                        setEditCuerpo(c.cuerpo);
                      }}
                    >
                      <Pencil className="size-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label={c.activo ? "Desactivar" : "Activar"}
                      onClick={() => run(() => alternarClausula(c.id, !c.activo))}
                    >
                      {c.activo ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      disabled={pending}
                      aria-label="Eliminar"
                      onClick={() => run(() => eliminarClausula(c.id))}
                    >
                      <Trash2 className="size-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              )}
            </li>
          ))
        )}
      </ul>

      <div className="space-y-2 rounded-lg border border-dashed border-border p-3">
        <p className="text-xs font-medium text-muted-foreground">Nueva cláusula</p>
        <Input
          value={nuevoTitulo}
          onChange={(e) => setNuevoTitulo(e.target.value)}
          placeholder="Título (p. ej. Devoluciones)"
          className="h-10"
        />
        <Textarea
          value={nuevoCuerpo}
          onChange={(e) => setNuevoCuerpo(e.target.value)}
          placeholder="Texto de la cláusula…"
          rows={3}
        />
        <Button
          variant="outline"
          size="sm"
          disabled={pending || nuevoTitulo.trim().length < 2 || nuevoCuerpo.trim().length < 10}
          onClick={() =>
            run(async () => {
              const r = await agregarClausula(nuevoTitulo, nuevoCuerpo);
              if (r.ok) {
                setNuevoTitulo("");
                setNuevoCuerpo("");
              }
              return r;
            })
          }
        >
          <Plus className="size-4" />
          Agregar cláusula
        </Button>
      </div>

      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}

"use client";

import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import type { Cliente } from "@/lib/mock-data";

type EmpresaClientesTableProps = {
  clientes: Cliente[];
  onEditar: (cliente: Cliente) => void;
  onBorrar: (cliente: Cliente) => void;
  onCrearAcceso: (cliente: Cliente) => void;
};

export function EmpresaClientesTable({
  clientes,
  onEditar,
  onBorrar,
  onCrearAcceso,
}: EmpresaClientesTableProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = clientes.filter((c) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return c.nombre.toLowerCase().includes(termino) || c.empresa.toLowerCase().includes(termino);
  });

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por nombre o empresa..."
        className="w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pr-4 font-medium">Empresa</th>
              <th className="py-2 pr-4 font-medium">ContactId</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Acceso</th>
              <th className="py-2 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4 text-[var(--color-text)]">{c.nombre}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.empresa}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.contactId}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.email}</td>
                <td className="py-3 pr-4">
                  {c.userId ? (
                    <span className="text-[var(--color-success-text)]">Con acceso</span>
                  ) : (
                    <button
                      type="button"
                      onClick={() => onCrearAcceso(c)}
                      className="rounded-md border border-[var(--color-border)] px-3 py-1 text-xs text-[var(--color-text)]"
                    >
                      Crear acceso
                    </button>
                  )}
                </td>
                <td className="py-3 pr-4">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => onEditar(c)}
                      aria-label={`Editar ${c.nombre}`}
                      title="Editar"
                      className="rounded-md p-1.5 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
                    >
                      <Pencil2Icon />
                    </button>
                    <button
                      type="button"
                      onClick={() => onBorrar(c)}
                      aria-label={`Borrar ${c.nombre}`}
                      title="Borrar"
                      className="rounded-md p-1.5 text-[var(--color-danger-text)] transition-colors hover:bg-[var(--color-danger-bg)]"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {filtrados.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)]">
                  Esta empresa todavía no tiene clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import Link from "next/link";
import { useState } from "react";
import type { Cliente, Suscripcion } from "@/lib/mock-data";

type ClientesTableProps = {
  clientes: Cliente[];
  suscripciones: Suscripcion[];
  onEditar: (cliente: Cliente) => void;
  onBorrar: (cliente: Cliente) => void;
};

export function ClientesTable({ clientes, suscripciones, onEditar, onBorrar }: ClientesTableProps) {
  const [busqueda, setBusqueda] = useState("");

  const filtrados = clientes.filter((c) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return c.nombre.toLowerCase().includes(termino) || c.empresa.toLowerCase().includes(termino);
  });

  function contarSuscripciones(clienteId: string): number {
    return suscripciones.filter((s) => s.clienteId === clienteId).length;
  }

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
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pr-4 font-medium">Empresa</th>
              <th className="py-2 pr-4 font-medium">ContactId</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Suscripciones</th>
              <th className="py-2 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtrados.map((c) => (
              <tr key={c.id}>
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/clientes/${c.id}`} className="text-[var(--color-text)] underline">
                    {c.nombre}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.empresa}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.contactId}</td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{c.email}</td>
                <td className="py-3 pr-4 text-[var(--color-text)]">{contarSuscripciones(c.id)}</td>
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
                  No se encontraron clientes.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

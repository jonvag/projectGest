"use client";

import Link from "next/link";
import { useState } from "react";
import { EmpresaFormModal } from "@/components/dashboard/empresa-form-modal";
import { useEmpresas, type NuevaEmpresa } from "@/lib/empresas-store";

export default function EmpresasPage() {
  const { empresas, cargando, addEmpresa } = useEmpresas();
  const [modalAbierto, setModalAbierto] = useState(false);

  async function guardar(datos: NuevaEmpresa): Promise<string | null> {
    const resultado = await addEmpresa(datos);
    return resultado.ok ? null : resultado.error;
  }

  if (cargando) {
    return (
      <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
        <p className="text-sm text-[var(--color-text-muted)]">Cargando...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 px-6 py-8 sm:px-10">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-medium text-[var(--color-text)]">Empresas</h1>
        <button
          type="button"
          onClick={() => setModalAbierto(true)}
          className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
        >
          Nueva empresa
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[480px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Nombre</th>
              <th className="py-2 pr-4 font-medium">Email</th>
              <th className="py-2 pr-4 font-medium">Clientes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {empresas.map((e) => (
              <tr key={e.id}>
                <td className="py-3 pr-4">
                  <Link href={`/dashboard/empresas/${e.id}`} className="text-[var(--color-text)] underline">
                    {e.nombre ?? e.email}
                  </Link>
                </td>
                <td className="py-3 pr-4 text-[var(--color-text-muted)]">{e.email}</td>
                <td className="py-3 pr-4 text-[var(--color-text)]">{e._count.clientes}</td>
              </tr>
            ))}
            {empresas.length === 0 && (
              <tr>
                <td colSpan={3} className="py-6 text-center text-[var(--color-text-muted)]">
                  No hay empresas todavía.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <EmpresaFormModal
        key={String(modalAbierto)}
        open={modalAbierto}
        onClose={() => setModalAbierto(false)}
        onSave={guardar}
      />
    </div>
  );
}

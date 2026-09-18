"use client";

import { CheckCircledIcon, CheckIcon, Link2Icon, Pencil2Icon, TrashIcon } from "@radix-ui/react-icons";
import { useState } from "react";
import { toISODate, type Cliente, type Suscripcion } from "@/lib/mock-data";

type SuscripcionesTableProps = {
  suscripciones: Suscripcion[];
  clientes: Cliente[];
  onEditar: (suscripcion: Suscripcion) => void;
  onBorrar: (suscripcion: Suscripcion) => void;
  onMarcarPagado: (suscripcion: Suscripcion) => void;
  onCopiarLink: (id: string) => Promise<{ ok: true; url: string } | { ok: false; error: string }>;
};

function formatMonto(monto: number): string {
  return monto.toLocaleString("es-AR", { style: "currency", currency: "USD" });
}

function formatFecha(iso: string): string {
  const [year, month, day] = iso.split("-");
  return `${day}/${month}/${year}`;
}

const ETIQUETA_CICLO: Record<Suscripcion["ciclo"], string> = {
  mensual: "Mensual",
  trimestral: "Trimestral",
  anual: "Anual",
};

export function SuscripcionesTable({
  suscripciones,
  clientes,
  onEditar,
  onBorrar,
  onMarcarPagado,
  onCopiarLink,
}: SuscripcionesTableProps) {
  const [busqueda, setBusqueda] = useState("");
  const [copiadoId, setCopiadoId] = useState<string | null>(null);
  const hoyISO = toISODate(new Date());

  function nombreClienteDe(clienteId: string): string {
    return clientes.find((c) => c.id === clienteId)?.nombre ?? "Cliente desconocido";
  }

  async function copiarLink(suscripcion: Suscripcion) {
    const resultado = await onCopiarLink(suscripcion.id);
    if (!resultado.ok) return;
    await navigator.clipboard.writeText(resultado.url);
    setCopiadoId(suscripcion.id);
    setTimeout(() => setCopiadoId((actual) => (actual === suscripcion.id ? null : actual)), 1500);
  }

  const filtradas = suscripciones.filter((s) => {
    const termino = busqueda.trim().toLowerCase();
    if (!termino) return true;
    return (
      nombreClienteDe(s.clienteId).toLowerCase().includes(termino) ||
      s.servicio.toLowerCase().includes(termino)
    );
  });

  return (
    <div className="flex flex-col gap-4">
      <input
        type="text"
        value={busqueda}
        onChange={(e) => setBusqueda(e.target.value)}
        placeholder="Buscar por cliente o servicio..."
        className="w-full max-w-sm rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
      />

      <div className="overflow-x-auto">
        <table className="w-full min-w-[640px] text-left text-sm">
          <thead>
            <tr className="border-b border-[var(--color-border)] text-[var(--color-text-muted)]">
              <th className="py-2 pr-4 font-medium">Cliente</th>
              <th className="py-2 pr-4 font-medium">Servicio</th>
              <th className="py-2 pr-4 font-medium">Monto</th>
              <th className="py-2 pr-4 font-medium">Ciclo</th>
              <th className="py-2 pr-4 font-medium">Próximo cobro</th>
              <th className="py-2 pr-4 font-medium">Acciones</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--color-border)]">
            {filtradas.map((s) => {
              const vencida = s.proximoCobro < hoyISO;
              const celdaVencida = vencida ? { backgroundColor: "var(--color-danger-bg)" } : undefined;
              return (
                <tr key={s.id}>
                  <td
                    className="rounded-l-lg py-3 pr-4 text-[var(--color-text)]"
                    style={celdaVencida}
                  >
                    {nombreClienteDe(s.clienteId)}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]" style={celdaVencida}>
                    {s.servicio}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text)]" style={celdaVencida}>
                    {formatMonto(s.monto)}
                  </td>
                  <td className="py-3 pr-4 text-[var(--color-text-muted)]" style={celdaVencida}>
                    {ETIQUETA_CICLO[s.ciclo]}
                  </td>
                  <td
                    className="py-3 pr-4"
                    style={{
                      ...celdaVencida,
                      color: vencida ? "var(--color-danger-text)" : "var(--color-text-muted)",
                    }}
                  >
                    {formatFecha(s.proximoCobro)}
                  </td>
                  <td className="rounded-r-lg py-3 pr-4" style={celdaVencida}>
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => onMarcarPagado(s)}
                        aria-label={`Marcar como pagado: ${nombreClienteDe(s.clienteId)}`}
                        title="Marcar como pagado"
                        className="rounded-md p-1.5 text-[var(--color-success-text)] transition-colors hover:bg-[var(--color-success-bg)]"
                      >
                        <CheckCircledIcon />
                      </button>
                      <button
                        type="button"
                        onClick={() => copiarLink(s)}
                        aria-label={`Copiar link de pago: ${nombreClienteDe(s.clienteId)}`}
                        title="Copiar link de pago"
                        className="flex items-center gap-1 rounded-md p-1.5 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
                      >
                        {copiadoId === s.id ? (
                          <>
                            <CheckIcon />
                            <span className="text-xs">¡Copiado!</span>
                          </>
                        ) : (
                          <Link2Icon />
                        )}
                      </button>
                      <button
                        type="button"
                        onClick={() => onEditar(s)}
                        aria-label={`Editar suscripción de ${nombreClienteDe(s.clienteId)}`}
                        title="Editar"
                        className="rounded-md p-1.5 text-[var(--color-text)] transition-colors hover:bg-[var(--color-surface)]"
                      >
                        <Pencil2Icon />
                      </button>
                      <button
                        type="button"
                        onClick={() => onBorrar(s)}
                        aria-label={`Borrar suscripción de ${nombreClienteDe(s.clienteId)}`}
                        title="Borrar"
                        className="rounded-md p-1.5 text-[var(--color-danger-text)] transition-colors hover:bg-[var(--color-danger-bg)]"
                      >
                        <TrashIcon />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
            {filtradas.length === 0 && (
              <tr>
                <td colSpan={6} className="py-6 text-center text-[var(--color-text-muted)]">
                  No se encontraron suscripciones.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

"use client";

import { motion } from "motion/react";
import { useEffect, useState } from "react";

type MetricCardProps = {
  label: string;
  value: number;
  format?: (value: number) => string;
  variant?: "default" | "danger";
  index?: number;
};

const DURACION_CONTEO_MS = 2000;

function useConteo(valorFinal: number, duracionMs: number): number {
  const [valor, setValor] = useState(0);

  useEffect(() => {
    let frame: number;
    const inicio = performance.now();

    function tick(ahora: number) {
      const progreso = Math.min((ahora - inicio) / duracionMs, 1);
      const suavizado = 1 - Math.pow(1 - progreso, 3);
      setValor(valorFinal * suavizado);
      if (progreso < 1) frame = requestAnimationFrame(tick);
    }

    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [valorFinal, duracionMs]);

  return valor;
}

export function MetricCard({
  label,
  value,
  format = (n) => String(Math.round(n)),
  variant = "default",
  index = 0,
}: MetricCardProps) {
  const isDanger = variant === "danger";
  const valorAnimado = useConteo(value, DURACION_CONTEO_MS);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, ease: "easeOut", delay: index * 0.06 }}
      className="min-w-0 rounded-lg border px-4 py-4 backdrop-blur-md sm:px-6 sm:py-5"
      style={{
        backgroundColor: isDanger ? "var(--color-danger-bg)" : "var(--color-surface)",
        borderColor: isDanger ? "var(--color-danger-border)" : "var(--color-border)",
      }}
    >
      <p
        className="text-sm"
        style={{ color: isDanger ? "var(--color-danger-text)" : "var(--color-text-muted)" }}
      >
        {label}
      </p>
      <p
        className="mt-2 truncate text-xl font-medium sm:text-2xl"
        style={{ color: isDanger ? "var(--color-danger-text)" : "var(--color-text)" }}
      >
        {format(valorAnimado)}
      </p>
    </motion.div>
  );
}

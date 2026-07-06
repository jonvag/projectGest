"use client";

import { motion } from "motion/react";

// Fondo ambiental sutil para la landing: grilla de puntos estática +
// dos blobs de gradiente radial moviéndose muy lento (según el protocolo
// de "Background Ambient Motion" del skill minimalist-ui: opacidad
// 0.02-0.05, duración 20s+, capa fija sin interacción).
export function DottedBackground() {
  return (
    <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div
        className="absolute inset-0"
        style={{
          backgroundImage: "radial-gradient(var(--color-text-muted) 1px, transparent 1px)",
          backgroundSize: "28px 28px",
          opacity: 0.08,
        }}
      />
      <motion.div
        className="absolute -top-1/4 -left-1/4 h-[60vmax] w-[60vmax] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-text) 0%, transparent 70%)",
          opacity: 0.04,
        }}
        animate={{
          x: ["0%", "10%", "-5%", "0%"],
          y: ["0%", "5%", "10%", "0%"],
        }}
        transition={{ duration: 14, repeat: Infinity, ease: "easeInOut" }}
      />
      <motion.div
        className="absolute -right-1/4 -bottom-1/4 h-[50vmax] w-[50vmax] rounded-full"
        style={{
          background: "radial-gradient(circle, var(--color-text) 0%, transparent 70%)",
          opacity: 0.03,
        }}
        animate={{
          x: ["0%", "-8%", "6%", "0%"],
          y: ["0%", "-6%", "8%", "0%"],
        }}
        transition={{ duration: 16, repeat: Infinity, ease: "easeInOut" }}
      />
    </div>
  );
}

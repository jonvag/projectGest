"use client";

import { motion } from "motion/react";

export function Hero() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
    >
      <h1
        className="text-5xl italic tracking-tight text-[var(--color-text)] sm:text-6xl"
        style={{ fontFamily: "var(--font-newsreader)" }}
      >
        projectGest
      </h1>
      <p className="max-w-md text-base text-[var(--color-text-muted)]">
        Control de clientes, servicios y cobros en un solo lugar.
      </p>
    </motion.div>
  );
}

"use client";

import { motion } from "motion/react";

export function LoginButton() {
  return (
    <motion.button
      type="button"
      onClick={() => console.log("login clicked")}
      whileTap={{ scale: 0.98 }}
      className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
    >
      Iniciar sesión
    </motion.button>
  );
}

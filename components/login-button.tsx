"use client";

import { useRouter } from "next/navigation";
import { motion } from "motion/react";

export function LoginButton() {
  const router = useRouter();

  return (
    <motion.button
      type="button"
      onClick={() => router.push("/login")}
      whileTap={{ scale: 0.98 }}
      className="rounded-md bg-[var(--color-text)] px-4 py-1.5 text-sm text-[var(--color-bg)]"
    >
      Iniciar sesión
    </motion.button>
  );
}

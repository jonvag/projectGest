"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";
import { AmbientVideoBackground } from "@/components/ambient-video-background";
import { Nav } from "@/components/nav";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  useEffect(() => {
    function handleMouseMove(e: MouseEvent) {
      mouseX.set(e.clientX / window.innerWidth - 0.5);
      mouseY.set(e.clientY / window.innerHeight - 0.5);
    }
    window.addEventListener("mousemove", handleMouseMove);
    return () => window.removeEventListener("mousemove", handleMouseMove);
  }, [mouseX, mouseY]);

  const springX = useSpring(mouseX, { stiffness: 120, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 120, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setEnviando(true);
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });
    setEnviando(false);
    if (!response.ok) {
      const cuerpo = await response.json().catch(() => ({ error: "No se pudo iniciar sesión." }));
      setError(cuerpo.error ?? "No se pudo iniciar sesión.");
      return;
    }
    router.push("/dashboard");
  }

  return (
    <div className="public-shell flex min-h-screen flex-col">
      <AmbientVideoBackground />
      <Nav />
      <div className="flex flex-1 items-center justify-center px-4" style={{ perspective: 1000 }}>
        <motion.form
          onSubmit={handleSubmit}
          className="flex w-full max-w-sm flex-col gap-4 rounded-4xl border border-[var(--color-border)] bg-[var(--color-surface)] p-8"
          style={{
            rotateX,
            rotateY,
            boxShadow: "0 24px 48px -24px rgba(0, 0, 0, 0.25)",
          }}
          initial={{ opacity: 0, y: 20, scale: 0.96 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
        >
          <h1 className="text-xl font-medium text-[var(--color-text)]">projectGest</h1>
          <p className="text-sm text-[var(--color-text-muted)]">Inicia sesión para continuar.</p>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="email">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-sm text-[var(--color-text-muted)]" htmlFor="password">
              Contraseña
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="rounded-md border border-[var(--color-border)] bg-[var(--color-surface)] px-3 py-2 text-sm text-[var(--color-text)]"
            />
          </div>

          {error && <p className="text-sm text-[var(--color-danger-text)]">{error}</p>}

          <button
            type="submit"
            disabled={enviando}
            className="rounded-md bg-[var(--color-text)] px-4 py-2 text-sm text-[var(--color-bg)] disabled:opacity-50"
          >
            {enviando ? "Ingresando..." : "Iniciar sesión"}
          </button>
        </motion.form>
      </div>
    </div>
  );
}

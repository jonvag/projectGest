"use client";

import { useEffect } from "react";
import { motion, useMotionValue, useSpring, useTransform } from "motion/react";

export function Hero() {
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

  const rotateX = useTransform(springY, [-0.5, 0.5], [10, -10]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-10, 10]);
  const translateX = useTransform(springX, [-0.5, 0.5], [-16, 16]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex flex-1 flex-col items-center justify-center gap-4 px-6 text-center"
      style={{ perspective: 900 }}
    >
      <motion.h1
        className="text-6xl italic tracking-tight text-[var(--color-text)] sm:text-7xl md:text-8xl"
        style={{
          fontFamily: "var(--font-newsreader)",
          rotateX,
          rotateY,
          x: translateX,
        }}
        initial={{ opacity: 0, y: 20, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
        whileHover={{ scale: 1.04 }}
      >
        projectGest
      </motion.h1>
      <p className="max-w-md text-base text-[var(--color-text-muted)]">
        Control de clientes, servicios y cobros en un solo lugar.
      </p>
    </motion.div>
  );
}

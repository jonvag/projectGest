"use client";

import { useEffect, useState } from "react";

export function ThemeToggle() {
  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Deliberately not a lazy useState initializer: reading `document` during
    // render would mismatch the server-rendered markup if the no-flash script
    // in layout.tsx already added the `dark` class before hydration.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setIsDark(document.documentElement.classList.contains("dark"));
  }, []);

  function toggleTheme() {
    const next = !isDark;
    setIsDark(next);
    document.documentElement.classList.toggle("dark", next);
    localStorage.setItem("theme", next ? "dark" : "light");
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label="Cambiar tema"
      className="rounded-md border border-[var(--color-border)] px-3 py-1.5 text-sm text-[var(--color-text)] transition-transform active:scale-95"
    >
      {isDark ? "Oscuro" : "Claro"}
    </button>
  );
}

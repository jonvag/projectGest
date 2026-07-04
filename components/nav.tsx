import { LoginButton } from "./login-button";
import { ThemeToggle } from "./theme-toggle";

export function Nav() {
  return (
    <nav className="flex items-center justify-between px-6 py-4 sm:px-10">
      <span className="text-sm font-medium tracking-tight text-[var(--color-text)]">
        projectGest
      </span>
      <div className="flex items-center gap-3">
        <ThemeToggle />
        <LoginButton />
      </div>
    </nav>
  );
}

export function ComingSoon({ title }: { title: string }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 px-6 text-center">
      <h1 className="text-2xl font-medium text-[var(--color-text)]">{title}</h1>
      <p className="text-[var(--color-text-muted)]">Próximamente.</p>
    </div>
  );
}

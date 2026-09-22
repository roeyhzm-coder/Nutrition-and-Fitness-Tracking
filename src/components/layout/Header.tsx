type HeaderProps = {
  title: string
  subtitle?: string
}

export function Header({ title, subtitle }: HeaderProps) {
  return (
    <header className="flex items-end justify-between border-b border-line px-8 py-6">
      <div>
        <h1 className="font-display text-2xl font-bold tracking-tight text-ink">
          {title}
        </h1>
        {subtitle ? (
          <p className="mt-1 text-sm text-ink-muted">{subtitle}</p>
        ) : null}
      </div>
      <div className="flex items-center gap-3">
        <button
          type="button"
          className="rounded-lg border border-line bg-surface-raised px-3.5 py-2 text-sm font-medium text-ink transition-colors hover:border-accent hover:text-accent-deep"
        >
          Log entry
        </button>
        <button
          type="button"
          className="rounded-lg bg-accent px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-accent-deep"
        >
          New plan
        </button>
      </div>
    </header>
  )
}

import { Header } from '../components/layout/Header'

type PlaceholderPageProps = {
  title: string
  subtitle: string
}

export function PlaceholderPage({ title, subtitle }: PlaceholderPageProps) {
  return (
    <>
      <Header title={title} subtitle={subtitle} />
      <div className="flex flex-1 items-center justify-center px-8 py-16">
        <div className="max-w-md text-center">
          <p className="font-display text-xl font-bold text-ink">{title}</p>
          <p className="mt-2 text-sm text-ink-muted">
            This section is ready for implementation. Wire up tracking,
            logging, and plan management here.
          </p>
        </div>
      </div>
    </>
  )
}

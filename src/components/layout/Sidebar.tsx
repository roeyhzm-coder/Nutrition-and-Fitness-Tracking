import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  Apple,
  CalendarDays,
  ChartLine,
  Settings,
} from 'lucide-react'

const navItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/training', label: 'Training', icon: Dumbbell },
  { to: '/nutrition', label: 'Nutrition', icon: Apple },
  { to: '/plans', label: 'Plans', icon: CalendarDays },
  { to: '/progress', label: 'Progress', icon: ChartLine },
  { to: '/settings', label: 'Settings', icon: Settings },
]

export function Sidebar() {
  return (
    <aside className="flex w-60 shrink-0 flex-col border-r border-line bg-surface-raised/80 backdrop-blur-sm">
      <div className="border-b border-line px-5 py-6">
        <p className="font-display text-lg font-bold tracking-tight text-ink">
          Pulse<span className="text-accent">Plan</span>
        </p>
        <p className="mt-1 text-xs text-ink-muted">Training & nutrition</p>
      </div>

      <nav className="flex flex-1 flex-col gap-1 p-3">
        {navItems.map(({ to, label, icon: Icon }) => (
          <NavLink
            key={to}
            to={to}
            end={to === '/'}
            className={({ isActive }) =>
              [
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-accent-soft text-accent-deep'
                  : 'text-ink-muted hover:bg-surface hover:text-ink',
              ].join(' ')
            }
          >
            <Icon className="size-4 shrink-0" strokeWidth={1.75} />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-line p-4">
        <div className="rounded-lg bg-surface px-3 py-3">
          <p className="text-xs font-medium text-ink">Week 4 of 12</p>
          <div className="mt-2 h-1.5 overflow-hidden rounded bg-line">
            <div className="h-full w-1/3 rounded bg-accent" />
          </div>
          <p className="mt-2 text-xs text-ink-muted">Plan progress</p>
        </div>
      </div>
    </aside>
  )
}

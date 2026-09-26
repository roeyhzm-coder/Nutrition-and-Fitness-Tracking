import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  CheckSquare,
  Sparkles,
} from 'lucide-react'

const tabs = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard },
  { to: '/workouts', label: 'אימונים', icon: Dumbbell },
  { to: '/nutrition', label: 'תזונה ומתכונים', icon: UtensilsCrossed },
  { to: '/habits', label: 'הרגלים', icon: CheckSquare },
  { to: '/export', label: 'ייצוא נתונים', icon: Sparkles },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1 rounded-3xl border border-slate-800/60 bg-slate-900/80 p-1.5 shadow-2xl shadow-black/40 backdrop-blur-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all',
                  isActive
                    ? 'bg-emerald-500/15 text-emerald-300 shadow-inner shadow-emerald-500/10'
                    : 'text-muted hover:bg-slate-800/60 hover:text-text',
                ].join(' ')
              }
            >
              <Icon className="size-5" strokeWidth={1.75} />
              <span className="text-[10px] font-medium leading-tight sm:text-[11px]">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

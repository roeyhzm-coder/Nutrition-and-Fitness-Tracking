import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  UserRound,
} from 'lucide-react'

const tabs = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard },
  { to: '/workouts', label: 'אימונים', icon: Dumbbell },
  { to: '/nutrition', label: 'תזונה ומתכונים', icon: UtensilsCrossed },
  { to: '/profile', label: 'פרופיל ומדדים', icon: UserRound },
]

export function BottomNav() {
  return (
    <nav className="fixed inset-x-3 bottom-3 z-40 pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-3xl grid-cols-4 gap-1 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-200/70 backdrop-blur-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex min-h-11 flex-col items-center justify-center gap-1 rounded-2xl px-1 py-2 text-center transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-inner shadow-blue-600/10'
                    : 'text-muted hover:bg-slate-100 hover:text-text',
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

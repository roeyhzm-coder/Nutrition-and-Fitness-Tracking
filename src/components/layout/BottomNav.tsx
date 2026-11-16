import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard,
  Dumbbell,
  UtensilsCrossed,
  Lightbulb,
  UserRound,
} from 'lucide-react'

const tabs = [
  { to: '/', label: 'דשבורד', icon: LayoutDashboard },
  { to: '/workouts', label: 'אימונים', icon: Dumbbell },
  { to: '/nutrition', label: 'תזונה ומתכונים', icon: UtensilsCrossed },
  { to: '/tips', label: 'כושר דגשים', icon: Lightbulb },
  { to: '/profile', label: 'פרופיל ומדדים', icon: UserRound },
]

export function BottomNav() {
  return (
    <nav
      aria-label="ניווט ראשי"
      className="pointer-events-none fixed inset-x-0 bottom-0 z-40 px-3 pb-[max(1.5rem,calc(env(safe-area-inset-bottom,0px)+0.75rem))]"
    >
      <ul className="pointer-events-auto mx-auto grid max-w-3xl grid-cols-5 gap-0.5 rounded-2xl border border-slate-200 bg-white/95 p-1.5 shadow-lg shadow-slate-200/70 backdrop-blur-md">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to} className="min-w-0">
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex h-full min-h-14 flex-col items-center justify-center gap-1 rounded-xl px-0.5 py-1.5 text-center transition-all',
                  isActive
                    ? 'bg-blue-50 text-blue-600 shadow-inner shadow-blue-600/10'
                    : 'text-muted hover:bg-slate-100 hover:text-text',
                ].join(' ')
              }
            >
              <Icon className="size-5 shrink-0" strokeWidth={1.75} />
              <span className="line-clamp-2 text-[10px] font-medium leading-[1.15] sm:text-[11px]">
                {label}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

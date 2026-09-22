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
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 backdrop-blur-md pb-[env(safe-area-inset-bottom)]">
      <ul className="mx-auto grid max-w-3xl grid-cols-5 gap-1 px-1 py-2">
        {tabs.map(({ to, label, icon: Icon }) => (
          <li key={to}>
            <NavLink
              to={to}
              end={to === '/'}
              className={({ isActive }) =>
                [
                  'flex flex-col items-center gap-1 rounded-xl px-1 py-2 text-center transition-colors',
                  isActive ? 'bg-surface text-primary' : 'text-muted hover:text-text',
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

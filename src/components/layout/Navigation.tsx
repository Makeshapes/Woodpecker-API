import { NavLink } from 'react-router-dom'
import { cn } from '@/lib/utils'

const navigationItems = [
  { to: '/', label: 'Leads' },
  { to: '/import', label: 'Import' },
  { to: '/settings', label: 'Settings' },
  { to: '/test', label: 'Bridge Test' },
]

export function Navigation() {
  return (
    <nav className="w-64 border-r bg-background p-6">
      <ul className="space-y-2">
        {navigationItems.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              className={({ isActive }) =>
                cn(
                  'block rounded-md px-3 py-2 text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary text-primary-foreground'
                    : 'text-foreground hover:bg-accent hover:text-accent-foreground'
                )
              }
            >
              {item.label}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  )
}

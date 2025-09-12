import { ThemeToggle } from '../theme-toggle'
import { Sparkles } from 'lucide-react'

export function Header() {
  return (
    <header className="border-b bg-background px-6 py-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h1 className="text-2xl font-bold text-foreground">
            Makeshapes Internal Email Campaign Generator
          </h1>
          <Sparkles
            className="h-4 w-4 hover:animate-spin"
            color="orange"
            strokeWidth={1.5}
            fill="orange"
          />
        </div>
        <div className="flex items-center space-x-4">
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

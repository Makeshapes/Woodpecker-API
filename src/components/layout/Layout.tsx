import { Outlet } from 'react-router-dom'
import { Header } from './Header'
import { Navigation } from './Navigation'

export function Layout() {
  return (
    <div className="min-h-screen bg-background">
      <Header />
      <div className="flex">
        <Navigation />
        <main className="flex-1 p-6">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
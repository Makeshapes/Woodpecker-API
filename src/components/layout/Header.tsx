import { ThemeToggle } from '../theme-toggle'
import { Sparkles, AlertTriangle } from 'lucide-react'
import { Button } from '../ui/button'
import { toast } from 'sonner'

export function Header() {
  const handleClearDatabase = async () => {
    console.log('🗑️ Clear database button clicked')
    console.log('🔍 Checking window.api:', !!window.api)
    console.log('🔍 Checking window.api.database:', !!window.api?.database)
    console.log('🔍 Checking window.api.database.clear:', !!window.api?.database?.clear)

    if (
      confirm(
        '⚠️ WARNING: This will permanently delete ALL data in the database!\n\nThis includes:\n- All imported leads\n- All generated content\n- All import history\n\nThis action cannot be undone. Continue?'
      )
    ) {
      console.log('✅ User confirmed database clear')
      try {
        // Check if we're in Electron environment
        if (window.api?.database?.clear) {
          console.log('🔄 Calling window.api.database.clear()...')
          const result = await window.api.database.clear()
          console.log('📊 Database clear result:', result)

          if (result?.success) {
            console.log('✅ Database cleared successfully')

            // Clear all browser storage as well
            console.log('🧹 Clearing localStorage and sessionStorage...')
            localStorage.clear()
            sessionStorage.clear()

            toast.success('Database and storage cleared successfully')

            // Force a hard reload to clear all cached data
            console.log('🔄 Forcing page reload...')
            setTimeout(() => {
              window.location.href = window.location.href
            }, 1000) // Give a moment for the toast to show
          } else if (result?.error) {
            console.error('❌ Database clear failed:', result.error)
            toast.error(`Failed to clear database: ${result.error}`)
          } else {
            console.warn('⚠️ Unexpected result format:', result)
            toast.error('Database clear returned unexpected result')
          }
        } else {
          console.log('🌐 Fallback: using localStorage.clear()')
          // Fallback for web environment - clear localStorage
          localStorage.clear()
          toast.success('Local storage cleared successfully')
          window.location.reload()
        }
      } catch (error) {
        console.error('💥 Error clearing database:', error)
        toast.error(`Failed to clear database: ${error instanceof Error ? error.message : String(error)}`)
      }
    } else {
      console.log('❌ User cancelled database clear')
    }
  }

  return (
    <header className="fixed top-0 left-0 right-0 z-50 border-b bg-background px-6 py-4">
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
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleClearDatabase}
            className="text-red-600 border-red-200 hover:bg-red-50 hover:border-red-300"
            title="Clear Database (Debug)"
          >
            <AlertTriangle className="h-4 w-4" />
          </Button>
          <ThemeToggle />
        </div>
      </div>
    </header>
  )
}

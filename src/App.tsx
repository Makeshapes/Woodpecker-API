import { HashRouter as Router, Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { ThemeProvider } from './components/theme-provider'
import { Layout } from './components/layout/Layout'
import { Toaster } from '@/components/ui/sonner'

// Lazy load pages for better performance
const Import = lazy(() => import('./pages/Import').then(module => ({ default: module.Import })))
const Leads = lazy(() => import('./pages/Leads').then(module => ({ default: module.Leads })))
const Settings = lazy(() => import('./components/settings/Settings').then(module => ({ default: module.Settings })))
const ElectronBridgeTest = lazy(() => import('./components/test/ElectronBridgeTest').then(module => ({ default: module.ElectronBridgeTest })))

// Loading component
const PageLoader = () => (
  <div className="flex items-center justify-center h-64">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
  </div>
)

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="woodpecker-ui-theme">
      <Router>
        <Suspense fallback={<PageLoader />}>
          <Routes>
            <Route path="/" element={<Layout />}>
              <Route index element={<Leads />} />
              <Route path="import" element={<Import />} />
              <Route path="settings" element={<Settings />} />
              <Route path="test" element={<ElectronBridgeTest />} />
            </Route>
          </Routes>
        </Suspense>
      </Router>
      <Toaster />
    </ThemeProvider>
  )
}

export default App

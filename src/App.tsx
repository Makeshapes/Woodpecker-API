import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/theme-provider'
import { Layout } from './components/layout/Layout'
import { Import } from './pages/Import'
import { Leads } from './pages/Leads'
import { ElectronBridgeTest } from './components/test/ElectronBridgeTest'
import { Toaster } from '@/components/ui/sonner'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="woodpecker-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Leads />} />
            <Route path="import" element={<Import />} />
            <Route path="test" element={<ElectronBridgeTest />} />
          </Route>
        </Routes>
      </Router>
      <Toaster />
    </ThemeProvider>
  )
}

export default App

import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/theme-provider'
import { Layout } from './components/layout/Layout'
import { Dashboard } from './pages/Dashboard'
import { Import } from './pages/Import'
import { Export } from './pages/Export'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="woodpecker-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Dashboard />} />
            <Route path="import" element={<Import />} />
            <Route path="export" element={<Export />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App
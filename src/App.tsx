import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import { ThemeProvider } from './components/theme-provider'
import { Layout } from './components/layout/Layout'
import { Import } from './pages/Import'
import { Leads } from './pages/Leads'

function App() {
  return (
    <ThemeProvider defaultTheme="dark" storageKey="woodpecker-ui-theme">
      <Router>
        <Routes>
          <Route path="/" element={<Layout />}>
            <Route index element={<Leads />} />
            <Route path="import" element={<Import />} />
          </Route>
        </Routes>
      </Router>
    </ThemeProvider>
  )
}

export default App

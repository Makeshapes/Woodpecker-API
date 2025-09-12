import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Dashboard } from '../pages/Dashboard'
import { Import } from '../pages/Import'
import { Export } from '../pages/Export'

const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="import" element={<Import />} />
          <Route path="export" element={<Export />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('App Routing', () => {
  it('renders Dashboard page on root route', () => {
    renderWithRouter(['/'])
    expect(screen.getByRole('heading', { level: 1, name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByText('Welcome to Woodpecker API - Manage your data imports and exports')).toBeInTheDocument()
  })

  it('renders Import page on /import route', () => {
    renderWithRouter(['/import'])
    expect(screen.getByRole('heading', { level: 1, name: 'Import' })).toBeInTheDocument()
    expect(screen.getByText('Import your data files for processing')).toBeInTheDocument()
  })

  it('renders Export page on /export route', () => {
    renderWithRouter(['/export'])
    expect(screen.getByRole('heading', { level: 1, name: 'Export' })).toBeInTheDocument()
    expect(screen.getByText('Export your processed data')).toBeInTheDocument()
  })
})
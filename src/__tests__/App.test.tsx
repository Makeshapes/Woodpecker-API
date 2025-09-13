import { render, screen } from '@testing-library/react'
import { MemoryRouter, Routes, Route } from 'react-router-dom'
import { Layout } from '../components/layout/Layout'
import { Import } from '../pages/Import'
import { Leads } from '../pages/Leads'

const renderWithRouter = (initialEntries = ['/']) => {
  return render(
    <MemoryRouter initialEntries={initialEntries}>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Leads />} />
          <Route path="import" element={<Import />} />
        </Route>
      </Routes>
    </MemoryRouter>
  )
}

describe('App Routing', () => {
  it('renders Leads page on root route', () => {
    renderWithRouter(['/'])
    expect(
      screen.getByRole('heading', { level: 1, name: 'Leads' })
    ).toBeInTheDocument()
  })

  it('renders Import page on /import route', () => {
    renderWithRouter(['/import'])
    expect(
      screen.getByRole('heading', { level: 1, name: 'Import' })
    ).toBeInTheDocument()
    expect(
      screen.getByText('Import your data files for processing')
    ).toBeInTheDocument()
  })
})

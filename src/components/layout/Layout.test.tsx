import { render, screen } from '@testing-library/react'
import { BrowserRouter } from 'react-router-dom'
import { Layout } from './Layout'

const LayoutWrapper = ({ children }: { children?: React.ReactNode }) => (
  <BrowserRouter>
    <Layout />
    {children}
  </BrowserRouter>
)

describe('Layout', () => {
  it('renders header with application title', () => {
    render(<LayoutWrapper />)
    expect(screen.getByText('Woodpecker API')).toBeInTheDocument()
  })

  it('renders navigation with correct links', () => {
    render(<LayoutWrapper />)
    expect(screen.getByRole('link', { name: 'Dashboard' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Import' })).toBeInTheDocument()
    expect(screen.getByRole('link', { name: 'Export' })).toBeInTheDocument()
  })

  it('renders main content area', () => {
    render(<LayoutWrapper />)
    const main = screen.getByRole('main')
    expect(main).toBeInTheDocument()
  })
})
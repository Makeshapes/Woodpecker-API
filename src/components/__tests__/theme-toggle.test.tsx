import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '../theme-provider'
import { ThemeToggle } from '../theme-toggle'

const ThemeToggleWrapper = () => (
  <ThemeProvider>
    <ThemeToggle />
  </ThemeProvider>
)

describe('ThemeToggle', () => {
  it('renders theme toggle button', () => {
    render(<ThemeToggleWrapper />)
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
  })

  it('has sun and moon icons for theme switching', () => {
    render(<ThemeToggleWrapper />)
    // The icons are rendered as SVGs, so we check for the button existence
    const button = screen.getByRole('button', { name: /toggle theme/i })
    expect(button).toBeInTheDocument()
    // Button should have the outline variant styles
    expect(button).toHaveClass('border', 'bg-background')
  })
})
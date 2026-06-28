import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import OnboardingGuard from './OnboardingGuard'

const renderGuard = (estado: 'faltan_documentos' | 'en_revision' | 'rechazado') =>
  render(
    <MemoryRouter>
      <OnboardingGuard estado={estado} />
    </MemoryRouter>,
  )

describe('Guardián de Onboarding', () => {
  it('bloquea el panel y muestra el aviso de validación en revisión', () => {
    renderGuard('en_revision')
    expect(screen.getByText(/Panel bloqueado/i)).toBeInTheDocument()
    expect(screen.getByText(/validando tus documentos/i)).toBeInTheDocument()
    // Comunica el plazo de hasta 7 días hábiles.
    expect(screen.getByText(/7 días hábiles/i)).toBeInTheDocument()
    // Garantía de cifrado/minimización visible.
    expect(screen.getByText(/cifrados en bucket privado/i)).toBeInTheDocument()
  })

  it('ofrece completar documentación cuando faltan documentos', () => {
    renderGuard('faltan_documentos')
    expect(screen.getByText(/Completa tu documentación/i)).toBeInTheDocument()
    expect(screen.getByRole('link', { name: /Completar registro/i })).toBeInTheDocument()
  })

  it('informa el rechazo sin filtrar datos sensibles', () => {
    renderGuard('rechazado')
    expect(screen.getByText(/No pudimos verificar tu cuenta/i)).toBeInTheDocument()
  })
})

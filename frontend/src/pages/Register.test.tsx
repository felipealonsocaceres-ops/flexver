import { describe, it, expect, vi } from 'vitest'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'

// Mock de la capa de privacidad (evita instanciar el cliente de Supabase real).
vi.mock('../lib/privacy', () => ({
  POLICY_VERSION: '1.0',
  getMisConsentimientos: vi.fn(),
  registrarConsentimiento: vi.fn(),
}))

// El botón de Google instancia el cliente de Supabase; lo aislamos del test.
vi.mock('../components/auth/GoogleAuthButton', () => ({
  default: () => null,
}))

// Turnstile no se puede resolver en jsdom; lo simulamos entregando un token al
// montar para reproducir el "reto superado" (la Site Key de pruebas siempre aprueba).
vi.mock('../components/auth/TurnstileWidget', async () => {
  const { useEffect } = await import('react')
  const MockTurnstile = ({ onVerify }: { onVerify: (t: string | null) => void }) => {
    useEffect(() => onVerify('test-token'), [onVerify])
    return null
  }
  return { default: MockTurnstile }
})

import Register from './Register'

const renderRegister = () =>
  render(
    <MemoryRouter>
      <Register />
    </MemoryRouter>,
  )

describe('Registro — consentimiento granular', () => {
  it('el toggle de marketing nace apagado (nunca premarcado)', () => {
    renderRegister()
    const marketing = screen.getByRole('switch')
    expect(marketing).toHaveAttribute('aria-checked', 'false')
  })

  it('bloquea el botón de crear cuenta hasta aceptar los términos', async () => {
    const user = userEvent.setup()
    renderRegister()

    const boton = screen.getByRole('button', { name: /Crear cuenta/i })
    // Sin contraseña fuerte ni términos: deshabilitado.
    expect(boton).toBeDisabled()

    // Contraseña fuerte, pero términos aún sin marcar -> sigue deshabilitado.
    await user.type(screen.getByLabelText(/Contraseña/i), 'Sup3rPass!')
    expect(boton).toBeDisabled()

    // Al aceptar términos (checkbox obligatorio) -> se habilita.
    const checkbox = screen.getByRole('checkbox')
    await user.click(checkbox)
    expect(boton).toBeEnabled()
  })
})

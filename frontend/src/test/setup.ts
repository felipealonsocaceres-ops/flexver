import '@testing-library/jest-dom'
import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'

// Mock de variables de entorno usadas por la app (Vite import.meta.env).
vi.stubGlobal('matchMedia', vi.fn().mockImplementation((q) => ({
  matches: false, media: q, onchange: null,
  addEventListener: vi.fn(), removeEventListener: vi.fn(),
  addListener: vi.fn(), removeListener: vi.fn(), dispatchEvent: vi.fn(),
})))

// framer-motion llama a window.scrollTo; jsdom no lo implementa.
vi.stubGlobal('scrollTo', vi.fn())

afterEach(() => cleanup())

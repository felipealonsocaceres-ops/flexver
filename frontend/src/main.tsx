import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import AppRouter from './routes/AppRouter'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    {/* BrowserRouter: habilita el enrutamiento por URL.
        AuthProvider: expone sesión + rol a toda la app (incl. los guards).
        AppRouter: define el árbol de rutas. */}
    <BrowserRouter>
      <AuthProvider>
        <AppRouter />
      </AuthProvider>
    </BrowserRouter>
  </StrictMode>,
)

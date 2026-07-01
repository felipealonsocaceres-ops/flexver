import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleGuard from './RoleGuard';
import RouteFallback from '../components/RouteFallback';

// Vistas ligeras (públicas): se cargan de forma síncrona con el bundle inicial.
import Login from '../pages/Login';
import Register from '../pages/Register';
import Pago from '../pages/Pago'
import PoliticaPrivacidad from '../pages/PoliticaPrivacidad';

/* Vistas pesadas: cargadas bajo demanda con React.lazy (Code Splitting a nivel
   de ruta). Esto saca a Mapbox (paneles) y Recharts (DashboardBI) del bundle
   inicial, mejorando el LCP/TBT en la primera carga. */
const PanelCliente = lazy(() => import('../pages/PanelCliente'));
const PanelConductor = lazy(() => import('../pages/PanelConductor'));
const AdminLayout = lazy(() => import('../components/admin/AdminLayout'));
const DashboardBI = lazy(() => import('../pages/admin/DashboardBI'));
const ValidacionKYC = lazy(() => import('../pages/admin/ValidacionKYC'));
const GestionUsuarios = lazy(() => import('../pages/admin/GestionUsuarios'));

const AppRouter = () => {
  return (
    <Suspense fallback={<RouteFallback />}>
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      {/* Política de privacidad: siempre accesible (Ley 21.719) */}
      <Route path="/politica-privacidad" element={<PoliticaPrivacidad />} />

      {/* Rutas Protegidas - Cliente */}
      <Route element={<RoleGuard allowedRoles={['cliente']} />}>
        <Route path="/home" element={<PanelCliente />} />
        {/* Compat: el wizard ahora vive dentro del panel del cliente */}
        <Route path="/solicitar" element={<Navigate to="/home" replace />} />
        <Route path="/pago" element={<Pago />} />
        <Route path="/pago/confirmar" element={<Pago />} />
      </Route>

      {/* Rutas Protegidas - Conductor */}
      <Route element={<RoleGuard allowedRoles={['conductor']} />}>
        <Route path="/panel-conductor" element={<PanelConductor />} />
      </Route>

      {/* Rutas Protegidas - Administrador (Centro de Comando) */}
      <Route element={<RoleGuard allowedRoles={['administrador']} />}>
        <Route path="/admin" element={<AdminLayout />}>
          <Route index element={<DashboardBI />} />
          <Route path="kyc" element={<ValidacionKYC />} />
          <Route path="usuarios" element={<GestionUsuarios />} />
        </Route>
      </Route>

      {/* Redirección por defecto: Repartidor inteligente */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
    </Suspense>
  );
};

export default AppRouter;
import { Routes, Route, Navigate } from 'react-router-dom';
import RoleGuard from './RoleGuard';

// Importación de tus páginas actuales
import Login from '../pages/Login';
import Register from '../pages/Register';
import PanelCliente from '../pages/PanelCliente';
import PanelConductor from '../pages/PanelConductor';
import Pago from '../pages/Pago'
import PoliticaPrivacidad from '../pages/PoliticaPrivacidad';

// Panel de Administración (Centro de Comando)
import AdminLayout from '../components/admin/AdminLayout';
import DashboardBI from '../pages/admin/DashboardBI';
import ValidacionKYC from '../pages/admin/ValidacionKYC';
import GestionUsuarios from '../pages/admin/GestionUsuarios';

const AppRouter = () => {
  return (
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
  );
};

export default AppRouter;
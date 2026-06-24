import { Routes, Route, Navigate } from 'react-router-dom';
import RoleGuard from './RoleGuard';

// Importación de tus páginas actuales
import Login from '../pages/Login';
import Register from '../pages/Register';
import PanelCliente from '../pages/PanelCliente';
import PanelConductor from '../pages/PanelConductor';
import Pago from '../pages/Pago'

// Placeholder para las vistas que construiremos luego
const PanelAdmin = () => <div>Panel de Administración (En construcción)</div>;

const AppRouter = () => {
  return (
    <Routes>
      {/* Rutas Públicas */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />

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

      {/* Rutas Protegidas - Administrador */}
      <Route element={<RoleGuard allowedRoles={['administrador']} />}>
        <Route path="/admin" element={<PanelAdmin />} />
      </Route>

      {/* Redirección por defecto: Repartidor inteligente */}
      <Route path="/" element={<Navigate to="/login" replace />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
};

export default AppRouter;
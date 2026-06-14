import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

interface RoleGuardProps {
  allowedRoles: Array<'cliente' | 'conductor' | 'administrador'>;
}

const RoleGuard = ({ allowedRoles }: RoleGuardProps) => {
  const { session, rol, loading } = useAuth();

  // 1. Evita expulsar al usuario mientras Supabase verifica el token
  if (loading) {
    return <div>Cargando sesión...</div>; 
  }

  // 2. Si no está logueado, para afuera
  if (!session) {
    return <Navigate to="/login" replace />;
  }

  // 3. Si tiene sesión pero el rol no es el correcto, lo redirige a su área
  if (rol && !allowedRoles.includes(rol as 'cliente' | 'conductor' | 'administrador')) {
    if (rol === 'conductor') return <Navigate to="/panel-conductor" replace />;
    if (rol === 'administrador') return <Navigate to="/admin" replace />;
    return <Navigate to="/home" replace />;
  }

  // Si pasa todas las pruebas, renderiza la vista solicitada
  return <Outlet />; 
};

export default RoleGuard;
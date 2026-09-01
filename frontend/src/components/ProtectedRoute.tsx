import { Navigate, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Role } from '@/types/auth';
import { FullScreenSpinner } from '@/components/FullScreenSpinner';

/** Redirects unauthenticated users to /login. Renders nested routes otherwise. */
export function ProtectedRoute() {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullScreenSpinner />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;

  return <Outlet />;
}

/**
 * Further restricts a route subtree to specific roles. This is a UX
 * convenience only — every corresponding API endpoint independently
 * enforces the same rule server-side, so this can never be the sole
 * protection for sensitive data.
 */
export function RoleRoute({ allow }: { allow: Role[] }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  if (!allow.includes(user.role)) return <Navigate to="/dashboard" replace />;
  return <Outlet />;
}

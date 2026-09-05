import { useState } from 'react';
import { NavLink, Outlet, Link } from 'react-router-dom';
import {
  Activity,
  LayoutDashboard,
  Users,
  Calendar,
  FlaskConical,
  Pill,
  BedDouble,
  UserCog,
  Building2,
  ShieldCheck,
  Settings,
  ChevronLeft,
  ChevronRight,
  LogOut,
  Sun,
  Moon,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useTheme } from '@/hooks/useTheme';
import { ROLE_LABELS, Role } from '@/types/auth';
import { InitialsAvatar } from '@/components/InitialsAvatar';
import { NotificationBell } from '@/components/NotificationBell';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
  roles?: Role[]; // undefined = visible to everyone
}

const mainNav: NavItem[] = [
  { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/patients', label: 'Patients', icon: Users },
  { to: '/appointments', label: 'Appointments', icon: Calendar },
  { to: '/laboratory', label: 'Laboratory', icon: FlaskConical },
  { to: '/prescriptions', label: 'Prescriptions', icon: Pill },
  { to: '/admissions', label: 'Admissions', icon: BedDouble },
];

const adminNav: NavItem[] = [
  { to: '/staff', label: 'Staff', icon: UserCog, roles: ['ADMIN'] },
  { to: '/departments', label: 'Departments', icon: Building2, roles: ['ADMIN'] },
  { to: '/audit-logs', label: 'Audit Logs', icon: ShieldCheck, roles: ['ADMIN'] },
  { to: '/settings', label: 'Settings', icon: Settings, roles: ['ADMIN'] },
];

export default function AppLayout() {
  const { user, logout } = useAuth();
  const { theme, toggleTheme } = useTheme();
  const [collapsed, setCollapsed] = useState(false);
  const [profileMenuOpen, setProfileMenuOpen] = useState(false);

  const visible = (item: NavItem) => !item.roles || (user && item.roles.includes(user.role));

  return (
    <div className="flex min-h-screen bg-slate-50 dark:bg-slate-950">
      {/* Sidebar */}
      <aside
        className={`hidden flex-col border-r border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 transition-all md:flex ${
          collapsed ? 'w-16' : 'w-60'
        }`}
      >
        <div className={`flex h-16 items-center gap-2 border-b border-slate-100 dark:border-slate-800 px-4 ${collapsed ? 'justify-center' : ''}`}>
          <div className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-lg bg-primary-600 text-white">
            <Activity className="h-4 w-4" />
          </div>
          {!collapsed && <span className="font-semibold text-slate-900 dark:text-slate-100">Hospital RMS</span>}
        </div>

        <nav className="flex-1 space-y-1 overflow-y-auto p-3">
          {mainNav.filter(visible).map((item) => (
            <SidebarLink key={item.to} item={item} collapsed={collapsed} />
          ))}

          {adminNav.some(visible) && (
            <>
              <div className={`my-3 border-t border-slate-100 dark:border-slate-800 ${collapsed ? '' : 'pt-3'}`}>
                {!collapsed && <p className="px-3 pb-1 text-xs font-semibold uppercase tracking-wide text-slate-400 dark:text-slate-500">Admin</p>}
              </div>
              {adminNav.filter(visible).map((item) => (
                <SidebarLink key={item.to} item={item} collapsed={collapsed} />
              ))}
            </>
          )}
        </nav>

        <div className="border-t border-slate-100 dark:border-slate-800 p-3">
          <button
            onClick={() => setCollapsed((c) => !c)}
            className="flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
          </button>
        </div>
      </aside>

      {/* Main column */}
      <div className="flex flex-1 flex-col">
        <header className="flex h-16 items-center justify-between border-b border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link to="/dashboard" className="flex items-center gap-2 md:hidden">
              <Activity className="h-5 w-5 text-primary-700" />
            </Link>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={toggleTheme}
              className="rounded-lg p-2 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800"
              title={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle dark mode"
            >
              {theme === 'dark' ? <Sun className="h-4.5 w-4.5" /> : <Moon className="h-4.5 w-4.5" />}
            </button>
            <NotificationBell />

            <div className="relative">
              <button
                onClick={() => setProfileMenuOpen((o) => !o)}
                className="flex items-center gap-2 rounded-lg px-2 py-1.5 hover:bg-slate-50 dark:hover:bg-slate-800"
              >
                <InitialsAvatar firstName={user?.firstName ?? ''} lastName={user?.lastName ?? ''} size="sm" />
                <div className="hidden text-left sm:block">
                  <p className="text-sm font-medium text-slate-900 dark:text-slate-100">
                    {user?.firstName} {user?.lastName}
                  </p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">{user ? ROLE_LABELS[user.role] : ''}</p>
                </div>
              </button>

              {profileMenuOpen && (
                <>
                  {/* Backdrop to close on outside click */}
                  <div className="fixed inset-0 z-10" onClick={() => setProfileMenuOpen(false)} />
                  <div className="absolute right-0 z-20 mt-2 w-48 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 py-1 shadow-lg">
                    <Link
                      to="/profile"
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Profile
                    </Link>
                    <Link
                      to="/change-password"
                      className="block px-4 py-2 text-sm text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800"
                      onClick={() => setProfileMenuOpen(false)}
                    >
                      Change password
                    </Link>
                    <button
                      onClick={() => logout()}
                      className="flex w-full items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50"
                    >
                      <LogOut className="h-3.5 w-3.5" />
                      Sign out
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        <main className="flex-1 p-4 sm:p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

function SidebarLink({ item, collapsed }: { item: NavItem; collapsed: boolean }) {
  const Icon = item.icon;
  return (
    <NavLink
      to={item.to}
      title={collapsed ? item.label : undefined}
      className={({ isActive }) =>
        `flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
          collapsed ? 'justify-center' : ''
        } ${isActive ? 'bg-primary-50 text-primary-700' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800'}`
      }
    >
      <Icon className="h-4 w-4 flex-shrink-0" />
      {!collapsed && item.label}
    </NavLink>
  );
}

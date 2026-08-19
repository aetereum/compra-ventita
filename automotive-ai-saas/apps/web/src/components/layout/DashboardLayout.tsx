'use client';

import { useAuth } from '@/contexts/auth';
import { useTheme } from '@/contexts/theme';
import { useRouter } from 'next/navigation';
import { 
  LayoutDashboard, 
  Car, 
  Users, 
  MessageSquare, 
  Megaphone, 
  Video, 
  GraduationCap,
  Settings, 
  LogOut, 
  Menu, 
  X, 
  Bell,
  Search,
  ChevronDown,
  Sun,
  Moon,
  Monitor,
} from 'lucide-react';
import { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';

const navigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Vehículos', href: '/dashboard/vehicles', icon: Car },
  { name: 'Leads', href: '/dashboard/leads', icon: Users },
  { name: 'Conversaciones', href: '/dashboard/conversations', icon: MessageSquare },
  { name: 'Marketing', href: '/dashboard/marketing', icon: Megaphone },
  { name: 'Videos', href: '/dashboard/videos', icon: Video },
  { name: 'Academia', href: '/dashboard/academy', icon: GraduationCap },
  { name: 'Configuración', href: '/dashboard/settings', icon: Settings },
];

export function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, organization, logout, hasPermission } = useAuth();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const router = useRouter();
  const pathname = usePathname();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [notificationsOpen, setNotificationsOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  const handleThemeChange = (newTheme: 'light' | 'dark' | 'system') => {
    setTheme(newTheme);
    setUserMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-slate-900">
      {/* Sidebar */}
      <aside
        className={clsx(
          'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-slate-800 border-r border-gray-200 dark:border-slate-700 transform transition-transform duration-200 lg:translate-x-0',
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        )}
        aria-label="Sidebar"
      >
        <div className="flex h-16 items-center justify-between px-6 border-b border-gray-200 dark:border-slate-700">
          <Link href="/dashboard" className="text-xl font-bold text-primary-600 dark:text-primary-400">
            Automotive AI
          </Link>
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
            onClick={() => setSidebarOpen(false)}
            aria-label="Cerrar menú"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <nav className="flex-1 p-4 space-y-1 overflow-y-auto" role="navigation" aria-label="Navegación principal">
          {navigation.map((item) => {
            const isActive = pathname === item.href || pathname.startsWith(item.href + '/');
            const Icon = item.icon;
            return (
              <Link
                key={item.name}
                href={item.href}
                className={clsx(
                  'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors',
                  isActive
                    ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                    : 'text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700'
                )}
                aria-current={isActive ? 'page' : undefined}
              >
                <Icon className="w-5 h-5" aria-hidden="true" />
                {item.name}
              </Link>
            );
          })}
        </nav>

        <div className="p-4 border-t border-gray-200 dark:border-slate-700">
          <Link
            href="/dashboard/settings"
            className="flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
          >
            <Settings className="w-5 h-5" aria-hidden="true" />
            Configuración
          </Link>
        </div>
      </aside>

      {/* Sidebar overlay for mobile */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 lg:hidden"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Top bar */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-gray-200 dark:border-slate-700 bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm px-4 lg:px-8">
          <button
            className="lg:hidden p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
            onClick={() => setSidebarOpen(true)}
            aria-label="Abrir menú"
          >
            <Menu className="w-6 h-6" />
          </button>

          <div className="flex-1" />

          <div className="flex items-center gap-2">
            {/* Search */}
            <div className="relative hidden sm:block">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" aria-hidden="true" />
              <input
                type="search"
                placeholder="Buscar..."
                className="w-64 pl-10 pr-4 py-2 text-sm bg-gray-100 dark:bg-slate-700 border-0 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
                aria-label="Buscar"
              />
            </div>

            {/* Notifications */}
            <div className="relative">
              <button
                className="relative p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
                onClick={() => setNotificationsOpen(!notificationsOpen)}
                aria-label="Notificaciones"
                aria-expanded={notificationsOpen}
              >
                <Bell className="w-5 h-5" aria-hidden="true" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" aria-hidden="true" />
              </button>

              {notificationsOpen && (
                <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                    <h3 className="font-medium text-gray-900 dark:text-white">Notificaciones</h3>
                  </div>
                  <div className="max-h-96 overflow-y-auto">
                    <div className="px-4 py-3 text-center text-gray-500 dark:text-gray-400 text-sm">
                      No hay notificaciones nuevas
                    </div>
                  </div>
                  <div className="px-4 py-2 border-t border-gray-200 dark:border-slate-700">
                    <button className="text-sm text-primary-600 hover:text-primary-500 dark:text-primary-400 w-full text-left">
                      Ver todas
                    </button>
                  </div>
                </div>
              )}
            </div>

            {/* Theme toggle */}
            <button
              className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-slate-700"
              onClick={() => {
                if (theme === 'light') handleThemeChange('dark');
                else if (theme === 'dark') handleThemeChange('system');
                else handleThemeChange('light');
              }}
              aria-label={`Tema actual: ${theme === 'system' ? resolvedTheme : theme}`}
            >
              {theme === 'dark' ? <Moon className="w-5 h-5" /> : theme === 'light' ? <Sun className="w-5 h-5" /> : <Monitor className="w-5 h-5" />}
            </button>

            {/* User menu */}
            <div className="relative">
              <button
                className="flex items-center gap-2 p-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-slate-700"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                aria-expanded={userMenuOpen}
                aria-label="Menú de usuario"
              >
                <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900 flex items-center justify-center">
                  {user?.avatar ? (
                    <img src={user.avatar} alt="" className="w-8 h-8 rounded-full" />
                  ) : (
                    <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
                      {user?.name?.charAt(0).toUpperCase() || 'U'}
                    </span>
                  )}
                </div>
                <span className="hidden md:block text-sm font-medium text-gray-700 dark:text-gray-300">
                  {user?.name || 'Usuario'}
                </span>
                <ChevronDown className="w-4 h-4 text-gray-500" aria-hidden="true" />
              </button>

              {userMenuOpen && (
                <div className="absolute right-0 mt-2 w-48 bg-white dark:bg-slate-800 rounded-lg shadow-lg border border-gray-200 dark:border-slate-700 py-2 z-50">
                  <div className="px-4 py-2 border-b border-gray-200 dark:border-slate-700">
                    <p className="text-sm font-medium text-gray-900 dark:text-white">{user?.name}</p>
                    <p className="text-xs text-gray-500 dark:text-gray-400">{user?.email}</p>
                    <p className="text-xs text-gray-400 dark:text-gray-500">{organization?.name}</p>
                  </div>
                  <Link
                    href="/dashboard/settings"
                    className="flex items-center gap-2 px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-slate-700"
                    onClick={() => setUserMenuOpen(false)}
                  >
                    <Settings className="w-4 h-4" aria-hidden="true" />
                    Configuración
                  </Link>
                  <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-900/20"
                  >
                    <LogOut className="w-4 h-4" aria-hidden="true" />
                    Cerrar sesión
                  </button>
                </div>
              )}
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-8" role="main">
          {children}
        </main>
      </div>
    </div>
  );
}
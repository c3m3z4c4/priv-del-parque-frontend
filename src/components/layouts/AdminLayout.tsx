import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import {
  LayoutDashboard,
  Calendar,
  CalendarDays,
  TreePine,
  Home as HomeIcon,
  Users,
  DollarSign,
  LogOut,
  Menu,
  X,
  ChevronLeft,
  Sun,
  Moon,
  ClipboardList,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import logo from '@/assets/logo.png';
import logoSmall from '@/assets/logo-small.png';
import { NotificationBell } from '@/components/NotificationBell';

const adminLinks = [
  { to: '/admin', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/admin/calendario', label: 'Calendario', icon: CalendarDays },
  { to: '/admin/reuniones', label: 'Reuniones', icon: Calendar },
  { to: '/admin/eventos', label: 'Eventos', icon: TreePine },
  { to: '/admin/casas', label: 'Casas', icon: HomeIcon },
  { to: '/admin/usuarios', label: 'Usuarios', icon: Users },
  { to: '/admin/cuotas', label: 'Cuotas', icon: DollarSign },
  { to: '/admin/proyectos', label: 'Proyectos', icon: ClipboardList },
];

export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const toggleTheme = () => setTheme(theme === 'dark' ? 'light' : 'dark');

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile Header */}
      <header className="sticky top-0 z-50 flex h-20 items-center justify-between border-b bg-card px-4 lg:hidden">
        <Link to="/admin" className="flex items-center gap-3">
          <div className="h-12 w-12 overflow-hidden rounded-full bg-white p-1 shadow-sm">
            <img 
              src={logo} 
              alt="Privadas del Parque" 
              className="h-full w-full object-contain"
            />
          </div>
          <span className="font-serif text-lg font-semibold text-foreground">Panel Admin</span>
        </Link>
        <div className="flex items-center gap-1">
          <NotificationBell />
          <Button
          variant="ghost"
          size="icon"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
            {mobileMenuOpen ? <X className="h-6 w-6" /> : <Menu className="h-6 w-6" />}
          </Button>
        </div>
      </header>

      {/* Mobile Menu Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setMobileMenuOpen(false)} />
      )}

      {/* Mobile Sidebar */}
      <aside className={cn(
        "fixed inset-y-0 left-0 z-50 w-64 transform bg-sidebar transition-transform duration-200 lg:hidden",
        mobileMenuOpen ? "translate-x-0" : "-translate-x-full"
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-4">
          <span className="font-serif text-lg font-semibold text-sidebar-foreground">Menú</span>
          <Button variant="ghost" size="icon" onClick={() => setMobileMenuOpen(false)} className="text-sidebar-foreground">
            <X className="h-5 w-5" />
          </Button>
        </div>
        <nav className="flex flex-col gap-1 p-4">
          {adminLinks.map(link => {
            const Icon = link.icon;
            const isActive = location.pathname === link.to;
            return (
              <Link key={link.to} to={link.to} onClick={() => setMobileMenuOpen(false)}>
                <Button
                  variant="ghost"
                  className={cn(
                    "w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                    isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                  )}
                >
                  <Icon className="h-5 w-5" />
                  {link.label}
                </Button>
              </Link>
            );
          })}
        </nav>
        <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
          <div className="mb-3 text-sm text-sidebar-foreground/70">
            {user?.name}
          </div>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={toggleTheme}
          >
            {theme === 'dark' ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
            {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
          </Button>
          <Button
            variant="ghost"
            className="w-full justify-start gap-3 text-sidebar-foreground hover:bg-sidebar-accent"
            onClick={handleLogout}
          >
            <LogOut className="h-5 w-5" />
            Cerrar sesión
          </Button>
        </div>
      </aside>

      {/* Desktop Layout */}
      <div className="hidden lg:flex">
        {/* Desktop Sidebar */}
        <aside className={cn(
          "sticky top-0 h-screen bg-sidebar transition-all duration-200",
          sidebarOpen ? "w-72" : "w-20"
        )}>
          <div className="flex h-20 items-center justify-between border-b border-sidebar-border px-4">
            {sidebarOpen ? (
              <Link to="/admin" className="flex items-center gap-3">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-white p-1 shadow-sm">
                  <img 
                    src={logo} 
                    alt="Privadas del Parque" 
                    className="h-full w-full object-contain"
                  />
                </div>
                <span className="font-serif text-lg font-semibold text-sidebar-foreground">Admin</span>
              </Link>
            ) : (
              <Link to="/admin" className="flex items-center justify-center w-full">
                <div className="h-12 w-12 overflow-hidden rounded-full bg-white p-1 shadow-sm">
                  <img 
                    src={logoSmall} 
                    alt="Privadas del Parque" 
                    className="h-full w-full object-contain"
                  />
                </div>
              </Link>
            )}
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className={cn(
                "text-sidebar-foreground hover:bg-sidebar-accent",
                !sidebarOpen && "mx-auto"
              )}
            >
              <ChevronLeft className={cn("h-5 w-5 transition-transform", !sidebarOpen && "rotate-180")} />
            </Button>
          </div>

          <nav className="flex flex-col gap-1 p-4">
            {adminLinks.map(link => {
              const Icon = link.icon;
              const isActive = location.pathname === link.to;
              return (
                <Link key={link.to} to={link.to}>
                  <Button
                    variant="ghost"
                    className={cn(
                      "w-full gap-3 text-sidebar-foreground hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      sidebarOpen ? "justify-start" : "justify-center px-2",
                      isActive && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                    title={!sidebarOpen ? link.label : undefined}
                  >
                    <Icon className="h-5 w-5 shrink-0" />
                    {sidebarOpen && <span>{link.label}</span>}
                  </Button>
                </Link>
              );
            })}
          </nav>

          <div className="absolute bottom-0 left-0 right-0 border-t border-sidebar-border p-4">
            {sidebarOpen && (
              <div className="mb-3 truncate text-sm text-sidebar-foreground/70">
                {user?.name}
              </div>
            )}
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                sidebarOpen ? "justify-start" : "justify-center px-2"
              )}
              onClick={toggleTheme}
              title={!sidebarOpen ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
            >
              {theme === 'dark' ? <Sun className="h-5 w-5 shrink-0" /> : <Moon className="h-5 w-5 shrink-0" />}
              {sidebarOpen && <span>{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
            </Button>
            <Button
              variant="ghost"
              className={cn(
                "w-full gap-3 text-sidebar-foreground hover:bg-sidebar-accent",
                sidebarOpen ? "justify-start" : "justify-center px-2"
              )}
              onClick={handleLogout}
              title={!sidebarOpen ? "Cerrar sesión" : undefined}
            >
              <LogOut className="h-5 w-5 shrink-0" />
              {sidebarOpen && <span>Cerrar sesión</span>}
            </Button>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto">
          <div className="container py-8">
            <div className="animate-fade-in">
              {children}
            </div>
          </div>
        </main>
      </div>

      {/* Mobile Main Content */}
      <main className="lg:hidden">
        <div className="container py-8">
          <div className="animate-fade-in">
            {children}
          </div>
        </div>
      </main>
    </div>
  );
}

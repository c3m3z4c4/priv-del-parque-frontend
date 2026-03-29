import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useTenant } from '@/contexts/TenantContext';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  LayoutDashboard,
  Calendar,
  TreePine,
  Home as HomeIcon,
  Users,
  LogOut,
  ChevronLeft,
  Sun,
  Moon,
  Building2,
  ChevronDown,
} from 'lucide-react';
import { useState } from 'react';
import { useTheme } from 'next-themes';
import { cn } from '@/lib/utils';
import { NotificationBell } from '@/components/NotificationBell';

const adminLinks = [
  { to: '/admin',             label: 'Dashboard',   icon: LayoutDashboard, roles: null },
  { to: '/admin/condominios', label: 'Condominios', icon: Building2,       roles: ['PLATFORM_ADMIN'] },
  { to: '/admin/reuniones',   label: 'Reuniones',   icon: Calendar,        roles: null },
  { to: '/admin/eventos',     label: 'Eventos',     icon: TreePine,        roles: null },
  { to: '/admin/casas',       label: 'Casas',       icon: HomeIcon,        roles: null },
  { to: '/admin/usuarios',    label: 'Usuarios',    icon: Users,           roles: null },
];

/* ── BONJO-style animated hamburger ─────────────────────────── */
function HamburgerIcon({ open }: { open: boolean }) {
  return (
    <div className="flex flex-col justify-center gap-[5px] h-5 w-5">
      <span className={cn(
        'block h-px bg-current transition-all duration-200 origin-center',
        open ? 'rotate-45 translate-y-[6px] w-full' : 'w-full',
      )} />
      <span className={cn(
        'block h-px bg-current transition-all duration-200',
        open ? 'opacity-0 w-0' : 'w-3',
      )} />
      <span className={cn(
        'block h-px bg-current transition-all duration-200 origin-center',
        open ? '-rotate-45 -translate-y-[6px] w-full' : 'w-full',
      )} />
    </div>
  );
}

/* ── Logo mark: "NIDDO" enclosed in thin square frame ───────── */
function LogoMark({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <div className={cn(
      'border border-sidebar-foreground/30 inline-flex items-center justify-center',
      collapsed ? 'h-9 w-9' : 'px-3 py-2',
    )}>
      {collapsed
        ? <span className="font-title font-light text-xs text-sidebar-foreground tracking-[0.2em]">N</span>
        : <span className="font-title font-light text-sm text-sidebar-foreground tracking-[0.3em] uppercase">Niddo</span>
      }
    </div>
  );
}

/* ── Nav link item ───────────────────────────────────────────── */
function NavItem({
  link, isActive, collapsed, onClick,
}: {
  link: typeof adminLinks[0];
  isActive: boolean;
  collapsed: boolean;
  onClick?: () => void;
}) {
  const Icon = link.icon;
  return (
    <Link to={link.to} onClick={onClick}>
      <div
        title={collapsed ? link.label : undefined}
        className={cn(
          'flex items-center gap-3 py-2.5 transition-colors duration-150',
          collapsed ? 'justify-center px-2' : 'px-3',
          isActive
            ? 'bg-white/12 text-sidebar-foreground'
            : 'text-sidebar-foreground/40 hover:text-sidebar-foreground/75 hover:bg-white/6',
        )}
      >
        <Icon className="h-[15px] w-[15px] shrink-0" />
        {!collapsed && (
          <span className="text-[10px] uppercase tracking-[0.2em] font-medium leading-none">
            {link.label}
          </span>
        )}
      </div>
    </Link>
  );
}

/* ── Condo selector ──────────────────────────────────────────── */
function CondoSelector({ collapsed = false }: { collapsed?: boolean }) {
  const { user } = useAuth();
  const { tenantId, setTenantId, condominiums, currentCondominium } = useTenant();
  if (user?.role !== 'PLATFORM_ADMIN') return null;

  const label = currentCondominium?.name ?? 'Todos los condominios';

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <button
          title={collapsed ? label : undefined}
          className={cn(
            'w-full flex items-center gap-2 px-3 py-2',
            'text-sidebar-foreground/45 hover:text-sidebar-foreground/75',
            'border border-sidebar-foreground/12 hover:border-sidebar-foreground/25',
            'transition-colors duration-150',
            collapsed ? 'justify-center px-2' : 'justify-between',
          )}
        >
          <Building2 className="h-3.5 w-3.5 shrink-0" />
          {!collapsed && (
            <>
              <span className="flex-1 truncate text-left text-[9px] uppercase tracking-[0.15em]">
                {label}
              </span>
              <ChevronDown className="h-3 w-3 shrink-0 opacity-50" />
            </>
          )}
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-56">
        <DropdownMenuLabel className="text-[9px] uppercase tracking-[0.15em]">
          Condominio activo
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className={cn(!tenantId && 'bg-accent/10 font-medium')}
          onClick={() => setTenantId(null)}
        >
          Todos los condominios
        </DropdownMenuItem>
        {condominiums.map(c => (
          <DropdownMenuItem
            key={c.id}
            className={cn(tenantId === c.id && 'bg-accent/10 font-medium')}
            onClick={() => setTenantId(c.id)}
          >
            {c.name}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

/* ── Layout ──────────────────────────────────────────────────── */
export function AdminLayout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const visibleLinks = adminLinks.filter(l => !l.roles || l.roles.includes(user?.role ?? ''));
  const [sidebarOpen, setSidebarOpen]     = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { theme, setTheme } = useTheme();
  const toggleTheme  = () => setTheme(theme === 'dark' ? 'light' : 'dark');
  const handleLogout = () => { logout(); navigate('/login'); };

  return (
    <div className="min-h-screen bg-background">

      {/* ── Mobile header ───────────────────────────────────── */}
      <header className="sticky top-0 z-50 flex h-16 items-center justify-between border-b border-border bg-card px-5 lg:hidden">
        <Link to="/admin"><LogoMark /></Link>
        <div className="flex items-center gap-3">
          <NotificationBell />
          <button
            onClick={() => setMobileMenuOpen(v => !v)}
            className="h-9 w-9 flex items-center justify-center text-foreground"
          >
            <HamburgerIcon open={mobileMenuOpen} />
          </button>
        </div>
      </header>

      {/* Mobile overlay */}
      {mobileMenuOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/40 lg:hidden"
          onClick={() => setMobileMenuOpen(false)}
        />
      )}

      {/* ── Mobile sidebar ───────────────────────────────────── */}
      <aside className={cn(
        'fixed inset-y-0 left-0 z-50 w-64 flex flex-col bg-sidebar transition-transform duration-200 lg:hidden',
        mobileMenuOpen ? 'translate-x-0' : '-translate-x-full',
      )}>
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-5">
          <LogoMark />
          <button
            onClick={() => setMobileMenuOpen(false)}
            className="h-8 w-8 flex items-center justify-center text-sidebar-foreground/50 hover:text-sidebar-foreground"
          >
            <HamburgerIcon open={true} />
          </button>
        </div>
        <div className="px-4 pt-4 pb-2">
          <CondoSelector />
        </div>
        <nav className="flex flex-col gap-0.5 px-4 py-3 flex-1 overflow-y-auto">
          {visibleLinks.map(link => (
            <NavItem
              key={link.to}
              link={link}
              isActive={location.pathname === link.to}
              collapsed={false}
              onClick={() => setMobileMenuOpen(false)}
            />
          ))}
        </nav>
        <div className="border-t border-sidebar-border px-4 py-3 space-y-0.5">
          {user?.name && (
            <div className="px-3 pb-2 text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/25 truncate">
              {user.name} {user.lastName}
            </div>
          )}
          <button onClick={toggleTheme} className="w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/75 transition-colors">
            {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
            <span className="text-[10px] uppercase tracking-[0.2em]">
              {theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}
            </span>
          </button>
          <button onClick={handleLogout} className="w-full flex items-center gap-3 px-3 py-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/75 transition-colors">
            <LogOut className="h-4 w-4 shrink-0" />
            <span className="text-[10px] uppercase tracking-[0.2em]">Cerrar sesión</span>
          </button>
        </div>
      </aside>

      {/* ── Desktop layout ───────────────────────────────────── */}
      <div className="hidden lg:flex">

        <aside className={cn(
          'sticky top-0 h-screen bg-sidebar flex flex-col transition-all duration-200',
          sidebarOpen ? 'w-56' : 'w-[52px]',
        )}>
          {/* Header */}
          <div className={cn(
            'flex h-16 items-center border-b border-sidebar-border shrink-0',
            sidebarOpen ? 'px-5 justify-between' : 'justify-center px-2',
          )}>
            <Link to="/admin"><LogoMark collapsed={!sidebarOpen} /></Link>
            {sidebarOpen && (
              <button
                onClick={() => setSidebarOpen(false)}
                className="h-8 w-8 flex items-center justify-center text-sidebar-foreground/35 hover:text-sidebar-foreground/70 transition-colors"
              >
                <ChevronLeft className="h-4 w-4" />
              </button>
            )}
          </div>

          {/* Expand trigger when collapsed */}
          {!sidebarOpen && (
            <button
              onClick={() => setSidebarOpen(true)}
              className="flex items-center justify-center py-2.5 border-b border-sidebar-border text-sidebar-foreground/35 hover:text-sidebar-foreground/70 transition-colors shrink-0"
            >
              <ChevronLeft className="h-4 w-4 rotate-180" />
            </button>
          )}

          {/* Condo selector */}
          <div className={cn('pt-4 pb-2 shrink-0', sidebarOpen ? 'px-4' : 'px-2')}>
            <CondoSelector collapsed={!sidebarOpen} />
          </div>

          {/* Nav */}
          <nav className={cn('flex flex-col gap-0.5 flex-1 py-3 overflow-y-auto', sidebarOpen ? 'px-4' : 'px-2')}>
            {visibleLinks.map(link => (
              <NavItem
                key={link.to}
                link={link}
                isActive={location.pathname === link.to}
                collapsed={!sidebarOpen}
              />
            ))}
          </nav>

          {/* Footer */}
          <div className={cn('border-t border-sidebar-border py-3 space-y-0.5 shrink-0', sidebarOpen ? 'px-4' : 'px-2')}>
            {sidebarOpen && user?.name && (
              <div className="px-3 pb-2 text-[9px] uppercase tracking-[0.15em] text-sidebar-foreground/25 truncate">
                {user.name} {user.lastName}
              </div>
            )}
            <button
              onClick={toggleTheme}
              title={!sidebarOpen ? (theme === 'dark' ? 'Modo claro' : 'Modo oscuro') : undefined}
              className={cn(
                'w-full flex items-center gap-3 py-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/75 transition-colors',
                sidebarOpen ? 'px-3' : 'justify-center px-2',
              )}
            >
              {theme === 'dark' ? <Sun className="h-4 w-4 shrink-0" /> : <Moon className="h-4 w-4 shrink-0" />}
              {sidebarOpen && <span className="text-[10px] uppercase tracking-[0.2em]">{theme === 'dark' ? 'Modo claro' : 'Modo oscuro'}</span>}
            </button>
            <button
              onClick={handleLogout}
              title={!sidebarOpen ? 'Cerrar sesión' : undefined}
              className={cn(
                'w-full flex items-center gap-3 py-2.5 text-sidebar-foreground/40 hover:text-sidebar-foreground/75 transition-colors',
                sidebarOpen ? 'px-3' : 'justify-center px-2',
              )}
            >
              <LogOut className="h-4 w-4 shrink-0" />
              {sidebarOpen && <span className="text-[10px] uppercase tracking-[0.2em]">Cerrar sesión</span>}
            </button>
          </div>
        </aside>

        <main className="flex-1 overflow-auto">
          <div className="container py-8">
            <div className="animate-fade-in">{children}</div>
          </div>
        </main>
      </div>

      {/* Mobile main */}
      <main className="lg:hidden">
        <div className="container py-8">
          <div className="animate-fade-in">{children}</div>
        </div>
      </main>
    </div>
  );
}

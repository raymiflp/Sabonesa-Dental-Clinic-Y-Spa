import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useLocation, Outlet } from 'react-router-dom';
import { LayoutDashboard, Calendar, ClipboardList, CreditCard, Stethoscope, Package, Menu, Search, DollarSign, LogOut, ChevronRight, Home } from 'lucide-react';
import PagoRapido from './PagoRapido';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent } from '@/components/ui/sheet';
import { api } from '../api';
import { useAuth } from '../context/AuthContext';
import SyncIndicator from './SyncIndicator';
import PasswordChangeModal from './PasswordChangeModal';

const allNavItems = [
  { to: '/', label: 'Dashboard', icon: LayoutDashboard },
  { to: '/agenda', label: 'Agenda', icon: Calendar },
  { to: '/historial', label: 'Historial Clínico', icon: ClipboardList },
  { to: '/crediticio', label: 'Historial Crediticio', icon: CreditCard },
  { to: '/procedimientos', label: 'Procedimientos', icon: Stethoscope },
  { to: '/inventario', label: 'Inventario', icon: Package },
];

// asistentes: only Agenda, Pacientes, Crediticio
const roleNavMap = {
  admin: allNavItems,
  doctor: allNavItems,
  asistente: allNavItems.filter(item =>
    ['/', '/agenda', '/historial', '/crediticio'].includes(item.to)
  ),
};

// Sidebar content shared between mobile Sheet and desktop sidebar
function SidebarContent({ navItems, isActive, onNavClick, user, logout }) {
  return (
    <>
      <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200">
        <div className="flex items-center gap-2 min-w-0">
          <img src="/logo.jpeg" alt="Sabonesa Dental" className="w-8 h-8 rounded-lg object-cover shrink-0" />
          <h1 className="text-sm font-bold text-indigo-600 leading-tight">Sabonesa Dental<br />Clinic Y Spa</h1>
        </div>
      </div>
      <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
        {navItems.map(({ to, label, icon: Icon }) => (
          <Link
            key={to}
            to={to}
            onClick={onNavClick}
            className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-colors ${
              isActive(to)
                ? 'bg-indigo-500 text-white shadow-sm'
                : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
            }`}
          >
            <Icon className="w-5 h-5" />
            {label}
          </Link>
        ))}
      </nav>
      <div className="p-4 border-t border-gray-200">
        {user && (
          <div className="flex items-center justify-between mb-2">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-700 truncate">{user.nombre}</p>
              <p className="text-xs text-gray-400 capitalize">{user.rol}</p>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={logout}
              className="text-gray-400 hover:text-red-500 hover:bg-red-50 shrink-0 cursor-pointer"
              title="Cerrar sesión"
            >
              <LogOut className="w-4 h-4" />
            </Button>
          </div>
        )}
        <p className="text-xs text-gray-400 text-center">© 2026 Sabonesa Dental Clinic Y Spa</p>
      </div>
    </>
  );
}

export default function Layout() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const { user, logout } = useAuth();
  const navItems = roleNavMap[user?.rol] || allNavItems;

  const closeSidebar = useCallback(() => setSidebarOpen(false), []);

  // Pago Rápido dialog
  const [pagoRapidoOpen, setPagoRapidoOpen] = useState(false);

  // Global patient search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [allPacientes, setAllPacientes] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const searchRef = useRef(null);

  // Load all pacientes once on mount
  useEffect(() => {
    api.getPacientes().then(data => setAllPacientes(Array.isArray(data) ? data : [])).catch(() => {});
  }, []);

  // Filter as user types
  useEffect(() => {
    if (searchQuery.length < 1) { setSearchResults([]); setSearchOpen(false); return; }
    const q = searchQuery.toLowerCase();
    const results = allPacientes.filter(p =>
      p.nombres?.toLowerCase().includes(q) ||
      p.apellidos?.toLowerCase().includes(q) ||
      p.cedula?.toLowerCase().includes(q) ||
      p.telefono?.toLowerCase().includes(q)
    );
    setSearchResults(results);
    setSearchOpen(true);
  }, [searchQuery, allPacientes]);

  // Close search on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) setSearchOpen(false);
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const isActive = (to) => {
    if (to === '/') return location.pathname === '/';
    if (to === '/historial') return location.pathname.startsWith('/historial');
    if (to === '/crediticio') return location.pathname.startsWith('/crediticio');
    if (to === '/procedimientos') return location.pathname.startsWith('/procedimientos');
    if (to === '/inventario') return location.pathname.startsWith('/inventario');
    return location.pathname === to;
  };

  const breadcrumbMap = {
    '/': 'Dashboard',
    '/agenda': 'Agenda',
    '/historial': 'Pacientes',
    '/historial/detalle': 'Historial Clínico',
    '/crediticio': 'Crediticio',
    '/procedimientos': 'Procedimientos',
    '/inventario': 'Inventario',
  };

  const buildBreadcrumbs = () => {
    const path = location.pathname;
    const crumbs = [{ to: '/', label: 'Dashboard', icon: true }];

    if (path === '/') return crumbs;

    // Match the root path
    const rootPath = '/' + path.split('/')[1];
    const rootLabel = breadcrumbMap[rootPath];
    if (rootLabel) {
      crumbs.push({ to: rootPath, label: rootLabel });
    }

    // If there's a sub-path (e.g., /historial/123), add a detail crumb
    const parts = path.split('/').filter(Boolean);
    if (parts.length >= 2) {
      const detailLabel = breadcrumbMap[rootPath + '/detalle'] || 'Detalle';
      crumbs.push({ to: path, label: detailLabel });
    }

    return crumbs;
  };

  const breadcrumbs = buildBreadcrumbs();

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Mobile: Sheet sidebar */}
      <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
        <SheetContent side="left" className="p-0 w-64" showCloseButton={false}>
          <SidebarContent
            navItems={navItems}
            isActive={isActive}
            onNavClick={closeSidebar}
            user={user}
            logout={logout}
          />
        </SheetContent>
      </Sheet>

      {/* Desktop: static sidebar */}
      <aside className="hidden lg:flex lg:flex-col w-64 bg-white border-r border-gray-200">
        <SidebarContent
          navItems={navItems}
          isActive={isActive}
          onNavClick={() => {}}
          user={user}
          logout={logout}
        />
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center gap-4 h-16 px-4 sm:px-6 bg-white border-b border-gray-200 sticky top-0 z-30">
          <button onClick={() => setSidebarOpen(true)} className="lg:hidden text-gray-500 hover:text-gray-700 shrink-0">
            <Menu className="w-5 h-5" />
          </button>
          <div className="text-sm text-gray-500 font-medium shrink-0 hidden sm:block">Sabonesa Dental Clinic Y Spa</div>

          <SyncIndicator />

          {/* Global search */}
          <div className="relative flex-1 max-w-md mx-auto" ref={searchRef}>
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              className="pl-9 bg-gray-100 border-gray-200 focus:bg-white"
              placeholder="Buscar paciente por nombre, cédula o teléfono..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onFocus={() => searchResults.length > 0 && setSearchOpen(true)}
            />
            {searchOpen && searchResults.length > 0 && (
              <div className="absolute z-50 top-full left-0 right-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-72 overflow-y-auto">
                {searchResults.slice(0, 8).map(p => (
                  <Link
                    key={p.id}
                    to={`/historial/${p.id}`}
                    className="flex items-center justify-between px-3 py-2.5 hover:bg-indigo-50 border-b border-gray-50 last:border-0"
                    onClick={() => { setSearchOpen(false); setSearchQuery(''); }}
                  >
                    <div className="min-w-0">
                      <span className="text-sm font-medium">{p.nombres} {p.apellidos}</span>
                      {p.cedula && <span className="text-xs text-gray-400 ml-2">{p.cedula}</span>}
                    </div>
                    <div className="flex items-center gap-2 text-xs text-gray-400 shrink-0 ml-2">
                      {p.telefono && <span>{p.telefono}</span>}
                      <span className="text-indigo-400">Ver HC →</span>
                    </div>
                  </Link>
                ))}
                {searchResults.length > 8 && (
                  <div className="px-3 py-2 text-xs text-gray-400 text-center border-t border-gray-50">
                    {searchResults.length - 8} resultados más...
                  </div>
                )}
              </div>
            )}
          </div>
        </header>
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {/* Breadcrumbs */}
          <nav className="flex items-center gap-1 text-xs text-gray-400 mb-4 sm:mb-5" aria-label="Breadcrumb">
            {breadcrumbs.map((crumb, i) => (
              <span key={crumb.to} className="flex items-center gap-1">
                {i > 0 && <ChevronRight className="w-3 h-3 text-gray-300" />}
                {i < breadcrumbs.length - 1 ? (
                  <Link to={crumb.to} className="hover:text-indigo-500 transition-colors flex items-center gap-1">
                    {crumb.icon ? <Home className="w-3 h-3" /> : null}
                    {crumb.label}
                  </Link>
                ) : (
                  <span className="text-gray-600 font-medium flex items-center gap-1">
                    {crumb.icon ? <Home className="w-3 h-3" /> : null}
                    {crumb.label}
                  </span>
                )}
              </span>
            ))}
          </nav>
          <Outlet />
        </main>
      </div>

      {/* Floating Pago Rápido button */}
      <button
        onClick={() => setPagoRapidoOpen(true)}
        className="fixed bottom-6 right-6 z-40 w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 text-white shadow-lg flex items-center justify-center transition-transform hover:scale-110"
        title="Pago Rápido"
      >
        <DollarSign className="w-6 h-6" />
      </button>

      <PagoRapido open={pagoRapidoOpen} onOpenChange={setPagoRapidoOpen} />

      <PasswordChangeModal />
    </div>
  );
}

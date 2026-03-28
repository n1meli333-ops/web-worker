import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Home, Film, Image, Upload, Settings, LogOut } from 'lucide-react';

const tabConfig = [
  { path: '/', label: 'Головна', icon: Home, tab: null },
  { path: '/stories', label: 'Генератор історій', icon: Film, tab: 'stories' },
  { path: '/preview', label: "Прев'ю", icon: Image, tab: 'preview' },
  { path: '/publisher', label: 'Публікація', icon: Upload, tab: 'publisher' },
  { path: '/admin', label: 'Адмін панель', icon: Settings, tab: 'admin' },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const visibleTabs = tabConfig.filter(tab => {
    if (!tab.tab) return true; // Home always visible
    if (user.role === 'ADMIN') return true;
    return user.tabs.includes(tab.tab);
  });

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-brand-dark">
      {/* Top Navigation */}
      <nav className="bg-brand-dark-2 border-b border-brand-dark-4 sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between h-14">
            {/* Logo */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 bg-brand-red rounded-lg flex items-center justify-center font-bold text-sm">
                YT
              </div>
              <span className="font-bold text-lg hidden sm:block">Worker Dashboard</span>
            </div>

            {/* Tabs */}
            <div className="flex items-center gap-1">
              {visibleTabs.map(tab => (
                <NavLink
                  key={tab.path}
                  to={tab.path}
                  end={tab.path === '/'}
                  className={({ isActive }) =>
                    `flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      isActive
                        ? 'bg-brand-red text-white'
                        : 'text-brand-gray hover:text-white hover:bg-brand-dark-4'
                    }`
                  }
                >
                  <tab.icon size={16} />
                  <span className="hidden md:block">{tab.label}</span>
                </NavLink>
              ))}
            </div>

            {/* User Info */}
            <div className="flex items-center gap-3">
              <div className="text-right hidden sm:block">
                <div className="text-sm font-medium">{user.nickname}</div>
                <div className="text-xs text-brand-gray">
                  {user.role === 'ADMIN' ? 'Адміністратор' : 'Воркер'}
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="p-2 text-brand-gray hover:text-brand-red transition-colors"
                title="Вийти"
              >
                <LogOut size={18} />
              </button>
            </div>
          </div>
        </div>
      </nav>

      {/* Content */}
      <main className="max-w-7xl mx-auto px-4 py-6">
        <Outlet />
      </main>
    </div>
  );
}

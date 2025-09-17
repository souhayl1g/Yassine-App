import React from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAuth } from '@/contexts/AuthContext';
import { LanguageSwitcher } from '@/components/ui/language-switcher';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { Button } from '@/components/ui/button';
import { 
  LayoutDashboard, 
  Users, 
  FileText, 
  QrCode, 
  Building2, 
  History, 
  Settings, 
  LogOut,
  Menu,
  Container,
  Clock
} from 'lucide-react';
import { cn } from '@/lib/utils';

const navigationItems = [
  { key: 'dashboard', icon: LayoutDashboard, href: '/dashboard', roles: ['admin', 'operator', 'scanner'] },
  { key: 'clients', icon: Users, href: '/clients', roles: ['admin', 'operator'] },
  { key: 'tickets', icon: FileText, href: '/tickets', roles: ['admin', 'operator'] },
  { key: 'containers', icon: Container, href: '/containers', roles: ['admin', 'operator'] },
  { key: 'sessions', icon: Clock, href: '/sessions', roles: ['admin', 'operator'] },
  { key: 'qr', icon: QrCode, href: '/qr', roles: ['admin', 'operator', 'scanner'] },
  { key: 'rooms', icon: Building2, href: '/rooms', roles: ['admin', 'operator'] },
  { key: 'history', icon: History, href: '/history', roles: ['admin', 'operator'] },
  { key: 'settings', icon: Settings, href: '/settings', roles: ['admin'] },
];

export function MainLayout() {
  const { t, i18n } = useTranslation();
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = React.useState(false);
  const isRTL = i18n.language === 'ar';

  const handleLogout = () => {
    logout();
    navigate('/auth');
  };

  const filteredNavItems = navigationItems.filter(item => 
    user && item.roles.includes(user.role)
  );

  return (
    <div className={cn('min-h-screen bg-background flex', isRTL && 'rtl')}>
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside className={cn(
        'fixed inset-y-0 z-50 w-64 transform bg-card border-r border-border transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 lg:flex lg:flex-col',
        sidebarOpen ? 'translate-x-0' : isRTL ? 'translate-x-full' : '-translate-x-full',
        isRTL ? 'right-0' : 'left-0'
      )}>
        <div className="flex h-full flex-col">
          {/* Logo */}
          <div className="flex h-16 items-center justify-center border-b border-border px-6">
            <div className="flex items-center gap-2">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary overflow-hidden">
                <img src="/favicon.svg" alt="Olive icon" className="h-6 w-6" />
              </div>
              <div className="text-lg font-bold text-foreground">
                {t('auth.title').split(' ')[0]}
              </div>
            </div>
          </div>

          {/* Navigation */}
          <nav className="flex-1 space-y-1 px-4 py-6">
            {filteredNavItems.map((item) => {
              const Icon = item.icon;
              const isActive = location.pathname === item.href;
              return (
                <Button
                  key={item.key}
                  variant={isActive ? 'default' : 'ghost'}
                  className={cn(
                    'w-full justify-start gap-3 h-12 text-sm font-medium',
                    isActive && 'bg-primary text-primary-foreground shadow-lg',
                    !isActive && 'text-muted-foreground hover:text-foreground hover:bg-accent'
                  )}
                  onClick={() => {
                    navigate(item.href);
                    setSidebarOpen(false);
                  }}
                >
                  <Icon className="h-5 w-5" />
                  {t(`nav.${item.key}`)}
                </Button>
              );
            })}
          </nav>

          {/* User info and logout */}
          <div className="border-t border-border p-4">
            <div className="mb-4 rounded-lg bg-muted p-3">
              <div className="text-sm font-medium">{user?.firstname} {user?.lastname}</div>
              <div className="text-xs text-muted-foreground">{user?.role}</div>
            </div>
            <Button
              variant="ghost"
              className="w-full justify-start gap-3 text-destructive hover:text-destructive hover:bg-destructive/10"
              onClick={handleLogout}
            >
              <LogOut className="h-5 w-5" />
              {t('nav.logout')}
            </Button>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <div className={cn('flex-1 flex flex-col min-h-screen', isRTL && 'lg:pr-0')}>
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <Button
            variant="ghost"
            size="sm"
            className="lg:hidden"
            onClick={() => setSidebarOpen(true)}
          >
            <Menu className="h-5 w-5" />
          </Button>
          
          <div className="flex items-center gap-4 ml-auto">
            <LanguageSwitcher />
            <ThemeToggle />
          </div>
        </header>

        {/* Page content */}
        <main className="flex-1 p-6 overflow-auto">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
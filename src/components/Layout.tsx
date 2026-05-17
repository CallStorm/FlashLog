import { NavLink, Outlet } from 'react-router-dom';
import { Bell, Clock, Home, Settings } from 'lucide-react';
import { usePendingStore } from '@/stores/pendingStore';

const tabs = [
  { to: '/', label: '工作记录', icon: Home, end: true, showBadge: false },
  { to: '/messages', label: '消息', icon: Bell, end: true, showBadge: true },
  { to: '/history', label: '历史', icon: Clock, end: false, showBadge: false },
  { to: '/settings', label: '设置', icon: Settings, end: false, showBadge: false },
] as const;

export function Layout() {
  const pendingCount = usePendingStore((s) => s.count);

  return (
    <div className="app-shell flex min-h-dvh flex-col">
      <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="nav-bar">
        <div className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, icon: Icon, end, showBadge }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `nav-tab ${isActive ? 'nav-tab-active' : ''}`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`nav-icon-wrap relative ${isActive ? 'nav-icon-wrap-active' : ''}`}
                  >
                    <Icon
                      className="h-5 w-5"
                      strokeWidth={isActive ? 2.25 : 1.75}
                    />
                    {showBadge && pendingCount > 0 && (
                      <span className="nav-badge" aria-label={`${pendingCount} 条待办`}>
                        {pendingCount > 99 ? '99+' : pendingCount}
                      </span>
                    )}
                  </span>
                  <span>{label}</span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </nav>
    </div>
  );
}

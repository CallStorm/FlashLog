import { NavLink, Outlet } from 'react-router-dom';
import { Clock, Home, Settings } from 'lucide-react';

const tabs = [
  { to: '/', label: '工作记录', icon: Home, end: true },
  { to: '/history', label: '历史', icon: Clock, end: false },
  { to: '/settings', label: '设置', icon: Settings, end: false },
] as const;

export function Layout() {
  return (
    <div className="flex min-h-dvh flex-col bg-stone-950 text-stone-100">
      <main className="flex-1 overflow-y-auto pb-[calc(4.5rem+env(safe-area-inset-bottom))]">
        <Outlet />
      </main>

      <nav className="fixed bottom-0 left-0 right-0 z-50 border-t border-stone-800 bg-stone-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto flex max-w-lg">
          {tabs.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 flex-col items-center gap-0.5 py-2.5 text-xs transition-colors ${
                  isActive
                    ? 'text-amber-400'
                    : 'text-stone-500 hover:text-stone-300'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <Icon className="h-5 w-5" strokeWidth={isActive ? 2.25 : 1.75} />
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

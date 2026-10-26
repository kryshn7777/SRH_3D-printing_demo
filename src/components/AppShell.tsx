import React, { useState } from 'react';
import { NavLink, useNavigate, useLocation } from 'react-router-dom';
import {
  Home,
  PlusSquare,
  FileText,
  Printer,
  Layers,
  BookOpen,
  HelpCircle,
  CheckSquare,
  ClipboardList,
  Users,
  BarChart3,
  KeyRound,
  LogOut,
  Menu,
  X,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Info,
  Moon,
  Sun,
} from 'lucide-react';
import { useApp } from '../context/AppContext';
import { SrhLogo, UserAvatar } from './SrhLogo';
import { Role } from '../types/models';

interface NavItem {
  label: string;
  to: string;
  icon: React.FC<{ className?: string }>;
}

export const AppShell: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const {
    currentUser,
    users,
    switchRoleUser,
    logout,
    resetDemoData,
    toasts,
    dismissToast,
    requests,
  } = useApp();
  const navigate = useNavigate();
  const location = useLocation();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [navySidebar, setNavySidebar] = useState(false);

  if (!currentUser) {
    return <>{children}</>;
  }

  // Find latest approved request for student quick-link to Printer Access
  const approvedStudentReq =
    requests.find(
      (r) =>
        r.studentId === currentUser.id &&
        r.currentStatus === 'APPROVED_ACCESS_GRANTED'
    ) ||
    requests.find((r) => r.studentId === currentUser.id) ||
    requests[0];

  const getNavItemsForRole = (role: Role): NavItem[] => {
    if (role === 'STUDENT') {
      return [
        { label: 'Dashboard', to: '/student/dashboard', icon: Home },
        { label: 'New Request', to: '/student/requests/new', icon: PlusSquare },
        { label: 'My Requests', to: '/student/requests', icon: FileText },
        { label: 'Available Printers', to: '/student/printers', icon: Printer },
        {
          label: 'Printer Access',
          to: `/student/access/${approvedStudentReq?.id || 'PR-004'}`,
          icon: KeyRound,
        },
        { label: 'Materials', to: '/student/materials', icon: Layers },
        { label: 'Guidelines', to: '/student/guidelines', icon: BookOpen },
        { label: 'Help', to: '/student/help', icon: HelpCircle },
      ];
    }
    if (role === 'PROFESSOR') {
      return [
        { label: 'Dashboard', to: '/professor/dashboard', icon: Home },
        {
          label: 'Approval Requests',
          to: '/professor/dashboard?tab=pending',
          icon: CheckSquare,
        },
        {
          label: 'My Approvals',
          to: '/professor/dashboard?tab=approved',
          icon: FileText,
        },
        { label: 'Printer Overview', to: '/student/printers', icon: Printer },
        { label: 'Users', to: '/pc/dashboard?section=users', icon: Users },
        { label: 'Reports', to: '/pc/log', icon: BarChart3 },
      ];
    }
    // PC_ADMIN or SYSTEM_ADMIN
    return [
      { label: 'Dashboard', to: '/pc/dashboard', icon: Home },
      {
        label: 'PC Approvals',
        to: '/pc/dashboard?tab=waiting',
        icon: CheckSquare,
      },
      { label: 'PC Log', to: '/pc/log', icon: ClipboardList },
      {
        label: 'Printer Management',
        to: '/pc/dashboard?section=printers',
        icon: Printer,
      },
      { label: 'Users', to: '/pc/dashboard?section=users', icon: Users },
      { label: 'Reports', to: '/pc/log?view=reports', icon: BarChart3 },
    ];
  };

  const navItems = getNavItemsForRole(currentUser.role);

  const handleRoleSwitch = (userId: string) => {
    const targetUser = users.find((u) => u.id === userId);
    if (!targetUser) return;
    switchRoleUser(userId);
    if (targetUser.role === 'STUDENT') {
      navigate('/student/dashboard');
    } else if (targetUser.role === 'PROFESSOR') {
      navigate('/professor/dashboard');
    } else {
      navigate('/pc/dashboard');
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const roleDisplayLabel =
    currentUser.role === 'STUDENT'
      ? 'Student'
      : currentUser.role === 'PROFESSOR'
      ? 'Professor'
      : 'PC Administrator';

  return (
    <div className="min-h-screen flex flex-col bg-[#F4F6F9] text-slate-900">
      {/* Top Header Bar matching reference image */}
      <header className="h-15 bg-white border-b border-slate-200/90 px-4 lg:px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="lg:hidden p-2 rounded-lg text-slate-600 hover:bg-slate-100"
            aria-label="Toggle navigation menu"
          >
            {mobileMenuOpen ? (
              <X className="w-5 h-5" />
            ) : (
              <Menu className="w-5 h-5" />
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (currentUser.role === 'STUDENT') navigate('/student/dashboard');
              else if (currentUser.role === 'PROFESSOR')
                navigate('/professor/dashboard');
              else navigate('/pc/dashboard');
            }}
            className="cursor-pointer focus:outline-none"
          >
            <SrhLogo variant="dark-text" subtitle="system" />
          </button>
        </div>

        {/* Center Demo Role Switcher Bar for effortless evaluation */}
        <div className="hidden md:flex items-center gap-1.5 bg-slate-100/90 border border-slate-200/90 rounded-lg p-1 text-xs">
          <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-slate-500">
            Demo Role:
          </span>
          <button
            type="button"
            onClick={() => handleRoleSwitch('USR-STU-01')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              currentUser.role === 'STUDENT'
                ? 'bg-[#1662F3] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Student (Anna)
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch('USR-PROF-01')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              currentUser.role === 'PROFESSOR'
                ? 'bg-[#1662F3] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            Professor (Dr. Weber)
          </button>
          <button
            type="button"
            onClick={() => handleRoleSwitch('USR-PC-01')}
            className={`px-2.5 py-1 rounded-md font-medium transition-colors cursor-pointer ${
              currentUser.role === 'PC_ADMIN'
                ? 'bg-[#1662F3] text-white shadow-2xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            PC Admin (Markus)
          </button>
          <div className="h-3.5 w-[1px] bg-slate-300 mx-0.5" />
          <button
            type="button"
            onClick={resetDemoData}
            title="Reset demo state to initial seed data"
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-slate-600 hover:text-slate-900 hover:bg-white/70 font-medium cursor-pointer"
          >
            <RotateCcw className="w-3 h-3" />
            Reset
          </button>
        </div>

        {/* Right User Profile & Logout */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <UserAvatar name={currentUser.name} role={currentUser.role} />
            <div className="hidden sm:flex flex-col text-left leading-tight">
              <span className="text-[13px] font-bold text-slate-900">
                {currentUser.name}
              </span>
              <span className="text-[11px] font-medium text-slate-500">
                {roleDisplayLabel}
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Log out / Return to Login screen"
            className="ml-1 p-2 rounded-lg text-slate-500 hover:text-red-600 hover:bg-red-50 transition-colors cursor-pointer"
            aria-label="Log out"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* Left Sidebar Navigation */}
        <aside
          className={`${
            mobileMenuOpen ? 'translate-x-0' : '-translate-x-full'
          } lg:translate-x-0 fixed lg:static inset-y-0 left-0 z-20 w-56 shrink-0 border-r transition-transform duration-200 flex flex-col justify-between pt-4 pb-4 ${
            navySidebar
              ? 'bg-[#0B1528] border-slate-800 text-slate-200'
              : 'bg-white border-slate-200/90 text-slate-700'
          }`}
        >
          <nav className="px-3 space-y-1" aria-label="Sidebar Navigation">
            {navItems.map((item) => {
              const Icon = item.icon;
              const [itemPath, itemQuery] = item.to.split('?');
              const isPathMatch =
                location.pathname === itemPath ||
                (itemPath !== '/student/dashboard' &&
                  itemPath !== '/professor/dashboard' &&
                  itemPath !== '/pc/dashboard' &&
                  itemPath !== '/student/requests' &&
                  location.pathname.startsWith(itemPath));

              let isActive = isPathMatch;
              if (itemQuery) {
                isActive =
                  location.pathname === itemPath &&
                  location.search.includes(itemQuery);
              } else if (
                (itemPath === '/professor/dashboard' ||
                  itemPath === '/pc/dashboard') &&
                location.search
              ) {
                isActive = false;
              }

              return (
                <NavLink
                  key={item.label}
                  to={item.to}
                  onClick={() => setMobileMenuOpen(false)}
                  className={() =>
                    `flex items-center gap-3 px-3 py-2.5 rounded-lg text-[13px] font-medium transition-colors ${
                      isActive
                        ? navySidebar
                          ? 'bg-[#1662F3] text-white font-semibold shadow-2xs'
                          : 'bg-[#EBF2FF] text-[#1662F3] font-semibold'
                        : navySidebar
                        ? 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
                        : 'text-slate-600 hover:bg-slate-100/80 hover:text-slate-900'
                    }`
                  }
                >
                  <Icon
                    className={`w-4 h-4 shrink-0 ${
                      isActive
                        ? navySidebar
                          ? 'text-white'
                          : 'text-[#1662F3]'
                        : navySidebar
                        ? 'text-slate-400'
                        : 'text-slate-500'
                    }`}
                  />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          {/* Mobile role switcher + sidebar theme toggle */}
          <div className="px-3 pt-4 border-t border-slate-200/60 space-y-2">
            <div className="md:hidden space-y-1 pb-2">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400 px-2">
                Switch Demo Role
              </p>
              <div className="grid grid-cols-3 gap-1">
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('USR-STU-01')}
                  className={`px-2 py-1 text-[11px] rounded font-medium ${
                    currentUser.role === 'STUDENT'
                      ? 'bg-[#1662F3] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Student
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('USR-PROF-01')}
                  className={`px-2 py-1 text-[11px] rounded font-medium ${
                    currentUser.role === 'PROFESSOR'
                      ? 'bg-[#1662F3] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  Prof
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('USR-PC-01')}
                  className={`px-2 py-1 text-[11px] rounded font-medium ${
                    currentUser.role === 'PC_ADMIN'
                      ? 'bg-[#1662F3] text-white'
                      : 'bg-slate-100 text-slate-700'
                  }`}
                >
                  PC Admin
                </button>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setNavySidebar(!navySidebar)}
              className={`w-full flex items-center justify-between px-3 py-2 rounded-lg text-xs font-medium transition-colors cursor-pointer ${
                navySidebar
                  ? 'bg-slate-800/90 text-slate-300 hover:text-white'
                  : 'bg-slate-100/80 text-slate-600 hover:text-slate-900'
              }`}
            >
              <span>Sidebar Theme</span>
              <span className="inline-flex items-center gap-1 font-semibold">
                {navySidebar ? (
                  <>
                    <Moon className="w-3.5 h-3.5 text-blue-400" /> Navy
                  </>
                ) : (
                  <>
                    <Sun className="w-3.5 h-3.5 text-amber-500" /> Light
                  </>
                )}
              </span>
            </button>
          </div>
        </aside>

        {/* Main Content Area */}
        <main className="flex-1 min-w-0 p-4 sm:p-6 lg:p-7 max-w-[1440px]">
          {children}
        </main>
      </div>

      {/* Floating Toast Notifications */}
      {toasts.length > 0 && (
        <div
          className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full pointer-events-none"
          aria-live="polite"
        >
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="pointer-events-auto flex items-start gap-3 p-3.5 rounded-xl bg-white border border-slate-200 shadow-lg text-slate-800"
            >
              {toast.type === 'success' && (
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
              )}
              {toast.type === 'error' && (
                <AlertCircle className="w-5 h-5 text-red-600 shrink-0 mt-0.5" />
              )}
              {toast.type === 'warning' && (
                <AlertCircle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
              )}
              {toast.type === 'info' && (
                <Info className="w-5 h-5 text-[#1662F3] shrink-0 mt-0.5" />
              )}
              <div className="flex-1 min-w-0">
                <p className="text-xs font-bold text-slate-900">{toast.title}</p>
                <p className="text-xs text-slate-600 mt-0.5 leading-relaxed">
                  {toast.message}
                </p>
              </div>
              <button
                type="button"
                onClick={() => dismissToast(toast.id)}
                className="text-slate-400 hover:text-slate-600 p-0.5"
                aria-label="Dismiss notification"
              >
                <X className="w-3.5 h-3.5" />
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

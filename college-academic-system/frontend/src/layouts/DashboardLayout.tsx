import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import {
  BarChart3,
  BookOpen,
  CalendarDays,
  ClipboardList,
  FileSpreadsheet,
  GraduationCap,
  LayoutDashboard,
  LogOut,
  Megaphone,
  Menu,
  Settings,
  ShieldCheck,
  UserCheck,
  UserCircle,
  Users,
  X,
} from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';
import { useAuth } from '@/context/AuthContext';
import { referenceService } from '@/services';
import type { Role } from '@/types';
import { Avatar, Button } from '@/components/ui/primitives';
import { LogoLockup } from '@/components/Logo';
import { NotificationDropdown } from '@/components/NotificationDropdown';

interface NavItem {
  to: string;
  label: string;
  icon: typeof LayoutDashboard;
}

const NAV: Record<Role, NavItem[]> = {
  STUDENT: [
    { to: '/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/attendance', label: 'Attendance', icon: UserCheck },
    { to: '/tests', label: 'Class Test Marks', icon: ClipboardList },
    { to: '/assignments', label: 'Assignments', icon: FileSpreadsheet },
    { to: '/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/notices', label: 'Notices', icon: Megaphone },
    { to: '/profile', label: 'Profile', icon: UserCircle },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  TEACHER: [
    { to: '/teacher/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/teacher/attendance', label: 'Mark Attendance', icon: UserCheck },
    { to: '/teacher/tests', label: 'Class Tests', icon: ClipboardList },
    { to: '/teacher/assignments', label: 'Assignments', icon: FileSpreadsheet },
    { to: '/teacher/subjects', label: 'My Subjects', icon: BookOpen },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/notices', label: 'Notices', icon: Megaphone },
    { to: '/settings', label: 'Settings', icon: Settings },
  ],
  ADMIN: [
    { to: '/admin/dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { to: '/admin/students', label: 'Students', icon: Users },
    { to: '/admin/teachers', label: 'Teachers', icon: GraduationCap },
    { to: '/admin/subjects', label: 'Subjects', icon: BookOpen },
    { to: '/admin/users', label: 'Users & Roles', icon: ShieldCheck },
    { to: '/admin/analytics', label: 'Analytics', icon: BarChart3 },
    { to: '/calendar', label: 'Calendar', icon: CalendarDays },
    { to: '/notices', label: 'Notices', icon: Megaphone },
    { to: '/admin/settings', label: 'Settings', icon: Settings },
  ],
};

function SidebarContent({
  role,
  onNavigate,
  collegeName,
}: {
  role: Role;
  onNavigate?: () => void;
  collegeName?: string;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const roleLabel =
    role === 'STUDENT'
      ? user?.student
        ? `${user.student.course.code ?? 'Student'} · ${user.student.rollNumber}`
        : 'Student'
      : role === 'TEACHER'
        ? (user?.teacher?.designation ?? 'Faculty')
        : 'Administrator';

  const handleLogout = async () => {
    try {
      await logout();
      toast.success('Signed out');
      navigate('/login', { replace: true });
    } catch {
      toast.error('Could not sign out cleanly, but your session was cleared.');
      navigate('/login', { replace: true });
    }
  };

  return (
    <div className="flex h-full flex-col bg-sidebar">
      <div className="border-b border-white/10 px-4 py-5">
        <LogoLockup collegeName={collegeName} />
      </div>

      <nav aria-label="Main" className="scrollbar-slim flex-1 overflow-y-auto px-3 py-4">
        <ul className="space-y-1">
          {NAV[role].map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onNavigate}
                className={({ isActive }) =>
                  cn(
                    'flex items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium transition-colors',
                    isActive
                      ? 'bg-sidebar-active text-white shadow-sm'
                      : 'text-sidebar-muted hover:bg-white/5 hover:text-sidebar-foreground',
                  )
                }
              >
                <item.icon className="h-[18px] w-[18px] shrink-0" aria-hidden="true" />
                <span className="truncate">{item.label}</span>
              </NavLink>
            </li>
          ))}
        </ul>
      </nav>

      <div className="border-t border-white/10 p-3">
        <div className="flex items-center gap-3 rounded-md px-2 py-2">
          <Avatar name={user?.fullName ?? '?'} src={user?.avatarUrl} className="h-9 w-9 bg-white/10" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-semibold text-white">{user?.fullName}</p>
            <p className="truncate text-[11px] text-sidebar-muted">{roleLabel}</p>
          </div>
        </div>
        <button
          type="button"
          onClick={handleLogout}
          className="mt-1 flex w-full items-center gap-3 rounded-md px-3 py-2.5 text-sm font-medium text-sidebar-muted transition-colors hover:bg-danger/15 hover:text-danger"
        >
          <LogOut className="h-[18px] w-[18px]" aria-hidden="true" />
          Logout
        </button>
      </div>
    </div>
  );
}

export function DashboardLayout() {
  const { user } = useAuth();
  const location = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);

  const { data: reference } = useQuery({
    queryKey: ['reference'],
    queryFn: referenceService.get,
    staleTime: 10 * 60 * 1000,
  });

  // Close the mobile drawer whenever the route changes.
  useEffect(() => {
    setMobileOpen(false);
  }, [location.pathname]);

  if (!user) return null;

  const semesterLabel =
    user.role === 'STUDENT' ? user.student?.semester.name : reference?.sessions[0]?.name;

  return (
    <div className="min-h-screen bg-background">
      {/* Desktop sidebar */}
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 lg:block">
        <SidebarContent role={user.role} collegeName={reference?.collegeName} />
      </aside>

      {/* Mobile drawer */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden">
          <button
            type="button"
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-[2px]"
            onClick={() => setMobileOpen(false)}
            aria-label="Close navigation"
          />
          <div className="absolute inset-y-0 left-0 w-72 max-w-[85vw] animate-in slide-in-from-left duration-200">
            <SidebarContent
              role={user.role}
              onNavigate={() => setMobileOpen(false)}
              collegeName={reference?.collegeName}
            />
            <button
              type="button"
              onClick={() => setMobileOpen(false)}
              className="absolute right-3 top-4 rounded-md p-1.5 text-sidebar-muted hover:bg-white/10 hover:text-white"
              aria-label="Close navigation"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>
      )}

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 border-b border-border bg-card/85 backdrop-blur">
          <div className="flex h-16 items-center gap-3 px-4 sm:px-6">
            <Button
              variant="ghost"
              size="icon"
              className="lg:hidden"
              onClick={() => setMobileOpen(true)}
              aria-label="Open navigation"
            >
              <Menu />
            </Button>

            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold text-foreground sm:text-base">
                {reference?.collegeName ?? 'College Academic Management System'}
              </p>
            </div>

            {semesterLabel && (
              <span className="hidden rounded-full bg-primary-soft px-3 py-1.5 text-xs font-semibold text-primary sm:inline-flex">
                {semesterLabel}
              </span>
            )}

            <NotificationDropdown />

            <div className="flex items-center gap-2 border-l border-border pl-3">
              <Avatar name={user.fullName} src={user.avatarUrl} />
              <div className="hidden min-w-0 sm:block">
                <p className="truncate text-sm font-semibold leading-tight">{user.fullName}</p>
                <p className="truncate text-[11px] leading-tight text-muted-foreground">
                  {user.role === 'STUDENT'
                    ? user.student?.rollNumber
                    : user.role === 'TEACHER'
                      ? user.teacher?.employeeCode
                      : 'Administrator'}
                </p>
              </div>
            </div>
          </div>
        </header>

        <main className="mx-auto w-full max-w-[1600px] px-4 py-6 sm:px-6 lg:py-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}

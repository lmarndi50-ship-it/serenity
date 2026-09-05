import { Suspense } from 'react';
import { Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { TooltipProvider } from '@/components/ui/primitives';
import { HOME_ROUTE, useAuth } from '@/context/AuthContext';
import { DashboardLayout } from '@/layouts/DashboardLayout';
import type { Role } from '@/types';

import { LoginPage } from '@/pages/LoginPage';
import { CalendarPage } from '@/pages/CalendarPage';
import { NoticesPage } from '@/pages/NoticesPage';
import { SettingsPage } from '@/pages/SettingsPage';
import { NotFoundPage } from '@/pages/NotFoundPage';

import { StudentDashboardPage } from '@/pages/student/DashboardPage';
import { StudentAttendancePage } from '@/pages/student/AttendancePage';
import { StudentTestsPage } from '@/pages/student/TestsPage';
import { StudentAssignmentsPage } from '@/pages/student/AssignmentsPage';
import { StudentSubjectsPage } from '@/pages/student/SubjectsPage';
import { StudentProfilePage } from '@/pages/student/ProfilePage';

import { TeacherDashboardPage } from '@/pages/teacher/DashboardPage';
import { TeacherAttendancePage } from '@/pages/teacher/AttendancePage';
import { TeacherTestsPage } from '@/pages/teacher/TestsPage';
import { TeacherAssignmentsPage } from '@/pages/teacher/AssignmentsPage';
import { TeacherSubjectsPage } from '@/pages/teacher/SubjectsPage';

import { AdminDashboardPage } from '@/pages/admin/DashboardPage';
import { AdminStudentsPage } from '@/pages/admin/StudentsPage';
import { AdminTeachersPage } from '@/pages/admin/TeachersPage';
import { AdminSubjectsPage } from '@/pages/admin/SubjectsPage';
import { AdminUsersPage } from '@/pages/admin/UsersPage';
import { AdminSettingsPage } from '@/pages/admin/SettingsPage';

function FullPageLoader() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background">
      <Loader2 className="h-6 w-6 animate-spin text-primary" aria-label="Loading" />
    </div>
  );
}

/**
 * Blocks a route until a session exists, and — when `roles` is given — until
 * the signed-in user holds one of them. Anyone else is sent to their own home.
 */
function RequireAuth({ roles }: { roles?: Role[] }) {
  const { user, isLoading } = useAuth();
  const location = useLocation();

  if (isLoading) return <FullPageLoader />;
  if (!user) return <Navigate to="/login" state={{ from: location.pathname }} replace />;
  if (roles && !roles.includes(user.role)) return <Navigate to={HOME_ROUTE[user.role]} replace />;

  return <DashboardLayout />;
}

/** Sends "/" to whichever dashboard the signed-in role belongs on. */
function RoleHome() {
  const { user, isLoading } = useAuth();
  if (isLoading) return <FullPageLoader />;
  return <Navigate to={user ? HOME_ROUTE[user.role] : '/login'} replace />;
}

export default function App() {
  return (
    <TooltipProvider delayDuration={200}>
      <Suspense fallback={<FullPageLoader />}>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<RoleHome />} />

          {/* Student */}
          <Route element={<RequireAuth roles={['STUDENT']} />}>
            <Route path="/dashboard" element={<StudentDashboardPage />} />
            <Route path="/attendance" element={<StudentAttendancePage />} />
            <Route path="/tests" element={<StudentTestsPage />} />
            <Route path="/assignments" element={<StudentAssignmentsPage />} />
            <Route path="/subjects" element={<StudentSubjectsPage />} />
            <Route path="/profile" element={<StudentProfilePage />} />
          </Route>

          {/* Teacher */}
          <Route element={<RequireAuth roles={['TEACHER', 'ADMIN']} />}>
            <Route path="/teacher/dashboard" element={<TeacherDashboardPage />} />
            <Route path="/teacher/attendance" element={<TeacherAttendancePage />} />
            <Route path="/teacher/tests" element={<TeacherTestsPage />} />
            <Route path="/teacher/assignments" element={<TeacherAssignmentsPage />} />
            <Route path="/teacher/subjects" element={<TeacherSubjectsPage />} />
          </Route>

          {/* Admin */}
          <Route element={<RequireAuth roles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboardPage />} />
            <Route path="/admin/analytics" element={<AdminDashboardPage />} />
            <Route path="/admin/students" element={<AdminStudentsPage />} />
            <Route path="/admin/teachers" element={<AdminTeachersPage />} />
            <Route path="/admin/subjects" element={<AdminSubjectsPage />} />
            <Route path="/admin/users" element={<AdminUsersPage />} />
            <Route path="/admin/settings" element={<AdminSettingsPage />} />
          </Route>

          {/* Shared by every signed-in role */}
          <Route element={<RequireAuth />}>
            <Route path="/calendar" element={<CalendarPage />} />
            <Route path="/notices" element={<NoticesPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Route>

          <Route path="*" element={<NotFoundPage />} />
        </Routes>
      </Suspense>
    </TooltipProvider>
  );
}

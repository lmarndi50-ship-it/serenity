import { useQuery } from '@tanstack/react-query';
import { Download, Mail, Phone } from 'lucide-react';
import { toast } from 'sonner';
import { useAuth } from '@/context/AuthContext';
import { studentService } from '@/services';
import { downloadFile, errorMessage } from '@/services/api';
import { formatDate, marksTone } from '@/utils/format';
import { Avatar, Badge, Button, Card, Skeleton } from '@/components/ui/primitives';
import { ErrorState } from '@/components/ui/states';

interface StudentProfile {
  rollNumber: string;
  registrationNo: string;
  admissionYear: number;
  dateOfBirth: string | null;
  guardianName: string | null;
  address: string | null;
  user: { fullName: string; email: string; phone: string | null; avatarUrl: string | null };
  department: { name: string; code: string };
  course: { name: string; code: string };
  semester: { name: string; number: number };
  section: { name: string };
}

/** Semester 3–4 is second year, 5–6 third, and so on. */
function yearLabel(semesterNumber: number): string {
  const year = Math.ceil(semesterNumber / 2);
  const suffix = ['st', 'nd', 'rd', 'th'][Math.min(year, 4) - 1];
  return `${year}${suffix} Year`;
}

export function StudentProfilePage() {
  const { user } = useAuth();

  const query = useQuery({
    queryKey: ['student', 'profile'],
    queryFn: studentService.profile as () => Promise<unknown>,
    select: (data) => data as unknown as StudentProfile,
  });

  const summary = useQuery({
    queryKey: ['student', 'dashboard'],
    queryFn: studentService.dashboard,
    select: (data) => data.summary,
  });

  const exportPerformance = async () => {
    try {
      await downloadFile('/reports/performance', { format: 'pdf' }, 'overall-performance.pdf');
      toast.success('Report downloaded');
    } catch (error) {
      toast.error(errorMessage(error, 'Could not generate the report'));
    }
  };

  if (query.isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-48" />
        <Card className="p-6">
          <div className="flex items-center gap-4">
            <Skeleton className="h-20 w-20 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-6 w-52" />
              <Skeleton className="h-4 w-40" />
            </div>
          </div>
        </Card>
      </div>
    );
  }

  if (query.isError || !query.data) {
    return (
      <Card>
        <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
      </Card>
    );
  }

  const profile = query.data;

  const details: { label: string; value: string }[] = [
    { label: 'Roll Number', value: profile.rollNumber },
    { label: 'Registration Number', value: profile.registrationNo },
    { label: 'Department', value: profile.department.name },
    { label: 'Course', value: profile.course.name },
    { label: 'Semester', value: profile.semester.name },
    { label: 'Section', value: profile.section.name },
    { label: 'Admission Year', value: String(profile.admissionYear) },
    { label: 'Date of Birth', value: formatDate(profile.dateOfBirth) },
    { label: 'Guardian', value: profile.guardianName ?? '—' },
    { label: 'Address', value: profile.address ?? '—' },
  ];

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Profile</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Your enrolment record as held by the institute.
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={exportPerformance}>
          <Download />
          Download performance report
        </Button>
      </header>

      <Card className="overflow-hidden">
        <div className="h-24 bg-gradient-to-r from-primary to-blue-700" aria-hidden="true" />
        <div className="px-6 pb-6">
          <div className="-mt-10 flex flex-wrap items-end gap-4">
            <Avatar
              name={profile.user.fullName}
              src={profile.user.avatarUrl}
              className="h-20 w-20 border-4 border-card text-lg"
            />
            <div className="min-w-0 flex-1 pb-1">
              <h2 className="text-xl font-bold tracking-tight">{profile.user.fullName}</h2>
              <p className="mt-0.5 text-sm text-muted-foreground">
                {profile.course.code.replace('BTECH-', 'B.Tech ')} · {yearLabel(profile.semester.number)} ·
                Roll No: {profile.rollNumber}
              </p>
            </div>
            {summary.data ? (
              <Badge tone={marksTone(summary.data.overall)} className="mb-1.5">
                Overall {summary.data.overall}%
              </Badge>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-4 border-t border-border pt-5 text-sm">
            <a
              href={`mailto:${profile.user.email}`}
              className="inline-flex items-center gap-2 text-muted-foreground hover:text-primary"
            >
              <Mail className="h-4 w-4" aria-hidden="true" />
              {profile.user.email}
            </a>
            {profile.user.phone ? (
              <span className="inline-flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" aria-hidden="true" />
                {profile.user.phone}
              </span>
            ) : null}
          </div>
        </div>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Enrolment Details</h2>
          </div>
          <dl className="grid gap-x-6 border-t border-border sm:grid-cols-2">
            {details.map((item) => (
              <div
                key={item.label}
                className="flex items-baseline justify-between gap-4 border-b border-border/60 px-5 py-3 text-sm"
              >
                <dt className="text-muted-foreground">{item.label}</dt>
                <dd className="text-right font-medium">{item.value}</dd>
              </div>
            ))}
          </dl>
        </Card>

        <Card>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Academic Standing</h2>
          </div>
          {summary.data ? (
            <dl className="border-t border-border">
              {[
                { label: 'Attendance', value: `${summary.data.attendance.percentage}%` },
                { label: 'Class test average', value: `${summary.data.tests.percentage}%` },
                {
                  label: 'Assignments submitted',
                  value: `${summary.data.assignments.submitted} / ${summary.data.assignments.total}`,
                },
                { label: 'Overall score', value: `${summary.data.overall}%` },
              ].map((row) => (
                <div
                  key={row.label}
                  className="flex items-center justify-between border-b border-border/60 px-5 py-3 text-sm last:border-0"
                >
                  <dt className="text-muted-foreground">{row.label}</dt>
                  <dd className="font-semibold tabular-nums">{row.value}</dd>
                </div>
              ))}
            </dl>
          ) : (
            <div className="space-y-3 p-5">
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          )}
          <p className="px-5 pb-5 pt-3 text-xs text-muted-foreground">
            Signed in as {user?.email}
          </p>
        </Card>
      </div>
    </div>
  );
}

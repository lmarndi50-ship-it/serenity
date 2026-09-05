import { useMemo, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  addMonths,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameMonth,
  isToday,
  parseISO,
  startOfMonth,
  startOfWeek,
  subMonths,
} from 'date-fns';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { calendarService } from '@/services';
import { errorMessage } from '@/services/api';
import { eventLabel, eventTone, formatDateTime } from '@/utils/format';
import { cn } from '@/lib/utils';
import type { CalendarEventItem, EventType } from '@/types';
import { Badge, Button, Card, Select, Skeleton } from '@/components/ui/primitives';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { EmptyState, ErrorState } from '@/components/ui/states';

const EVENT_DOT: Record<EventType, string> = {
  TEST: 'bg-primary',
  ASSIGNMENT: 'bg-assignment',
  EXAM: 'bg-danger',
  EVENT: 'bg-slate-400',
  NOTICE: 'bg-warning',
  HOLIDAY: 'bg-success',
};

const TYPES: EventType[] = ['TEST', 'ASSIGNMENT', 'EXAM', 'EVENT', 'NOTICE', 'HOLIDAY'];

export function CalendarPage() {
  const [cursor, setCursor] = useState(() => new Date());
  const [typeFilter, setTypeFilter] = useState<'' | EventType>('');
  const [selected, setSelected] = useState<CalendarEventItem | null>(null);

  const range = useMemo(() => {
    const start = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
    const end = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
    return { start, end };
  }, [cursor]);

  const query = useQuery({
    queryKey: ['calendar', range.start.toISOString(), range.end.toISOString(), typeFilter],
    queryFn: () =>
      calendarService.list({
        from: range.start.toISOString(),
        to: range.end.toISOString(),
        ...(typeFilter ? { type: typeFilter } : {}),
      }),
  });

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range.start, range.end],
  );

  const eventsByDay = useMemo(() => {
    const map = new Map<string, CalendarEventItem[]>();
    for (const event of query.data ?? []) {
      const key = format(parseISO(event.startAt), 'yyyy-MM-dd');
      const list = map.get(key) ?? [];
      list.push(event);
      map.set(key, list);
    }
    return map;
  }, [query.data]);

  const upcoming = useMemo(
    () =>
      (query.data ?? [])
        .filter((e) => parseISO(e.startAt) >= new Date())
        .sort((a, b) => a.startAt.localeCompare(b.startAt))
        .slice(0, 8),
    [query.data],
  );

  return (
    <div className="space-y-6">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Tests, assignment deadlines, exams, notices and college events.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <Select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value as '' | EventType)}
            aria-label="Filter by event type"
            className="h-9 w-[160px] text-xs"
          >
            <option value="">All event types</option>
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {eventLabel(t)}
              </option>
            ))}
          </Select>
          <Button variant="outline" size="sm" onClick={() => setCursor(new Date())}>
            Today
          </Button>
        </div>
      </header>

      <div className="grid gap-4 lg:grid-cols-4">
        <Card className="lg:col-span-3">
          <div className="flex items-center justify-between gap-3 p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">
              {format(cursor, 'MMMM yyyy')}
            </h2>
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCursor((c) => subMonths(c, 1))}
                aria-label="Previous month"
              >
                <ChevronLeft />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                onClick={() => setCursor((c) => addMonths(c, 1))}
                aria-label="Next month"
              >
                <ChevronRight />
              </Button>
            </div>
          </div>

          {query.isError ? (
            <ErrorState message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
          ) : (
            <div className="border-t border-border p-3">
              <div className="grid grid-cols-7 gap-1 pb-2">
                {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((label) => (
                  <div
                    key={label}
                    className="px-1 text-center text-[11px] font-semibold uppercase tracking-wide text-muted-foreground"
                  >
                    <span className="hidden sm:inline">{label}</span>
                    <span className="sm:hidden">{label[0]}</span>
                  </div>
                ))}
              </div>

              <div className="grid grid-cols-7 gap-1">
                {days.map((day) => {
                  const key = format(day, 'yyyy-MM-dd');
                  const dayEvents = eventsByDay.get(key) ?? [];
                  const outside = !isSameMonth(day, cursor);

                  return (
                    <div
                      key={key}
                      className={cn(
                        'min-w-0 min-h-[76px] rounded-md border p-1.5 transition-colors sm:min-h-[104px]',
                        outside ? 'border-transparent bg-muted/30' : 'border-border bg-card',
                        isToday(day) && 'border-primary ring-1 ring-primary/30',
                      )}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={cn(
                            'text-xs font-semibold',
                            outside ? 'text-muted-foreground/60' : 'text-foreground',
                            isToday(day) && 'flex h-5 w-5 items-center justify-center rounded-full bg-primary text-white',
                          )}
                        >
                          {format(day, 'd')}
                        </span>
                        {dayEvents.length > 2 ? (
                          <span className="text-[10px] font-medium text-muted-foreground">
                            +{dayEvents.length - 2}
                          </span>
                        ) : null}
                      </div>

                      <div className="mt-1 space-y-1">
                        {query.isLoading
                          ? null
                          : dayEvents.slice(0, 2).map((event) => (
                              <button
                                key={event.id}
                                type="button"
                                onClick={() => setSelected(event)}
                                className="flex w-full min-w-0 items-center gap-1 rounded-sm bg-muted/70 px-1 py-0.5 text-left transition-colors hover:bg-muted"
                                title={event.title}
                              >
                                <span
                                  className={cn('h-1.5 w-1.5 shrink-0 rounded-full', EVENT_DOT[event.type])}
                                  aria-hidden="true"
                                />
                                <span className="truncate text-[10px] font-medium leading-tight sm:text-[11px]">
                                  {event.title}
                                </span>
                              </button>
                            ))}
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 flex flex-wrap gap-x-4 gap-y-2 border-t border-border pt-3">
                {TYPES.map((type) => (
                  <span key={type} className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <span className={cn('h-2 w-2 rounded-full', EVENT_DOT[type])} aria-hidden="true" />
                    {eventLabel(type)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        <Card>
          <div className="p-5 pb-3">
            <h2 className="text-base font-semibold tracking-tight">Coming up</h2>
          </div>
          <div className="border-t border-border">
            {query.isLoading ? (
              <div className="space-y-3 p-5">
                {Array.from({ length: 5 }).map((_, i) => (
                  <Skeleton key={i} className="h-12 w-full" />
                ))}
              </div>
            ) : upcoming.length === 0 ? (
              <EmptyState
                title="Nothing scheduled"
                message="This month has no upcoming entries."
                icon={<CalendarDays className="h-5 w-5" />}
              />
            ) : (
              <ul className="divide-y divide-border">
                {upcoming.map((event) => (
                  <li key={event.id}>
                    <button
                      type="button"
                      onClick={() => setSelected(event)}
                      className="w-full px-5 py-3 text-left transition-colors hover:bg-muted/50"
                    >
                      <div className="flex items-start gap-3">
                        <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-md bg-muted">
                          <span className="text-sm font-bold leading-none">
                            {format(parseISO(event.startAt), 'd')}
                          </span>
                          <span className="text-[9px] font-semibold uppercase text-muted-foreground">
                            {format(parseISO(event.startAt), 'MMM')}
                          </span>
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-semibold">{event.title}</p>
                          <div className="mt-1">
                            <Badge tone={eventTone(event.type)}>{eventLabel(event.type)}</Badge>
                          </div>
                        </div>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>

      <Dialog open={!!selected} onOpenChange={(open) => !open && setSelected(null)}>
        {selected ? (
          <DialogContent title={selected.title}>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Type</dt>
                <dd>
                  <Badge tone={eventTone(selected.type)}>{eventLabel(selected.type)}</Badge>
                </dd>
              </div>
              {selected.subject ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Subject</dt>
                  <dd className="text-right font-medium">
                    {selected.subject}
                    {selected.subjectCode ? ` (${selected.subjectCode})` : ''}
                  </dd>
                </div>
              ) : null}
              <div className="flex items-center justify-between gap-4">
                <dt className="text-muted-foreground">Date &amp; time</dt>
                <dd className="text-right font-medium">{formatDateTime(selected.startAt)}</dd>
              </div>
              {selected.endAt ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Ends</dt>
                  <dd className="text-right font-medium">{formatDateTime(selected.endAt)}</dd>
                </div>
              ) : null}
              {selected.faculty ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Faculty</dt>
                  <dd className="text-right font-medium">{selected.faculty}</dd>
                </div>
              ) : null}
              {selected.location ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Location</dt>
                  <dd className="text-right font-medium">{selected.location}</dd>
                </div>
              ) : null}
              {selected.maxMarks !== null ? (
                <div className="flex items-center justify-between gap-4">
                  <dt className="text-muted-foreground">Maximum marks</dt>
                  <dd className="text-right font-medium">{selected.maxMarks}</dd>
                </div>
              ) : null}
              {selected.description ? (
                <div className="border-t border-border pt-3">
                  <dt className="mb-1 text-muted-foreground">Description</dt>
                  <dd className="leading-relaxed">{selected.description}</dd>
                </div>
              ) : null}
            </dl>
          </DialogContent>
        ) : null}
      </Dialog>
    </div>
  );
}

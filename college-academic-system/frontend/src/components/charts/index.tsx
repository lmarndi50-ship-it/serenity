import type { ReactNode } from 'react';
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { CHART_COLORS } from '@/utils/format';

const AXIS = {
  stroke: '#94a3b8',
  fontSize: 11,
  tickLine: false,
  axisLine: false,
} as const;

const TOOLTIP_STYLE = {
  borderRadius: 10,
  border: '1px solid #e2e8f0',
  boxShadow: '0 10px 30px -10px rgb(15 23 42 / 0.25)',
  fontSize: 12,
  padding: '8px 10px',
} as const;

/**
 * Attendance donut with the overall percentage in the middle.
 * Values come from the API; nothing here is hard-coded.
 */
export function AttendanceDonut({
  present,
  absent,
  leave,
  percentage,
  height = 260,
}: {
  present: number;
  absent: number;
  leave: number;
  percentage: number;
  height?: number;
}) {
  const data = [
    { name: 'Present', value: present, color: CHART_COLORS.success },
    { name: 'Absent', value: absent, color: CHART_COLORS.danger },
    { name: 'Leave', value: leave, color: CHART_COLORS.warning },
  ].filter((d) => d.value > 0);

  const total = present + absent + leave;

  if (total === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        No attendance recorded yet.
      </div>
    );
  }

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="62%"
            outerRadius="88%"
            paddingAngle={2}
            strokeWidth={0}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string) => [`${value} classes`, name]}
          />
          <Legend
            verticalAlign="bottom"
            height={28}
            iconType="circle"
            iconSize={8}
            formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
          />
        </PieChart>
      </ResponsiveContainer>

      <div className="pointer-events-none absolute inset-x-0 top-[42%] -translate-y-1/2 text-center">
        <p className="text-2xl font-bold leading-none text-foreground">{percentage}%</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Overall
        </p>
      </div>
    </div>
  );
}

/** Weekly attendance trend — bars for the percentage, with a reference line. */
export function AttendanceTrendChart({
  data,
  height = 260,
  threshold = 75,
}: {
  data: { label: string; percentage: number; present: number; absent: number }[];
  height?: number;
  threshold?: number;
}) {
  if (data.length === 0) {
    return (
      <div
        className="flex items-center justify-center text-sm text-muted-foreground"
        style={{ height }}
      >
        Not enough attendance history yet.
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis dataKey="label" {...AXIS} />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} {...AXIS} />
        <Tooltip
          cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number, _name, item) => {
            const row = item.payload as { present: number; absent: number };
            return [`${value}%  (${row.present} present, ${row.absent} absent)`, 'Attendance'];
          }}
        />
        <Bar dataKey="percentage" radius={[6, 6, 0, 0]} maxBarSize={44}>
          {data.map((entry) => (
            <Cell
              key={entry.label}
              fill={
                entry.percentage >= threshold
                  ? CHART_COLORS.success
                  : entry.percentage >= threshold - 10
                    ? CHART_COLORS.warning
                    : CHART_COLORS.danger
              }
            />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/**
 * Overall performance donut.
 *
 * Each arc is the component's *weighted contribution* (score × weight), not its
 * raw percentage — otherwise three similar scores would draw three near-equal
 * thirds and tell the reader nothing about the 30/40/30 weighting. Summed, the
 * arcs equal the overall score shown in the middle.
 */
export function PerformanceDonut({
  attendance,
  tests,
  assignments,
  overall,
  weights = { attendance: 0.3, tests: 0.4, assignments: 0.3 },
  height = 240,
}: {
  attendance: number;
  tests: number;
  assignments: number;
  overall: number;
  weights?: { attendance: number; tests: number; assignments: number };
  height?: number;
}) {
  const round1 = (n: number) => Math.round(n * 10) / 10;

  const data = [
    {
      name: 'Attendance',
      value: round1(attendance * weights.attendance),
      raw: attendance,
      color: CHART_COLORS.primary,
    },
    {
      name: 'Class tests',
      value: round1(tests * weights.tests),
      raw: tests,
      color: CHART_COLORS.success,
    },
    {
      name: 'Assignments',
      value: round1(assignments * weights.assignments),
      raw: assignments,
      color: CHART_COLORS.assignment,
    },
  ];

  return (
    <div className="relative" style={{ height }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            innerRadius="60%"
            outerRadius="86%"
            paddingAngle={3}
            strokeWidth={0}
            startAngle={90}
            endAngle={-270}
          >
            {data.map((entry) => (
              <Cell key={entry.name} fill={entry.color} />
            ))}
          </Pie>
          <Tooltip
            contentStyle={TOOLTIP_STYLE}
            formatter={(value: number, name: string, item) => {
              const row = item.payload as { raw: number };
              return [`${value} pts of the overall score (scored ${row.raw}%)`, name];
            }}
          />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
        <p className="text-3xl font-bold leading-none text-foreground">{overall}%</p>
        <p className="mt-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
          Overall score
        </p>
      </div>
    </div>
  );
}

/** Horizontal comparison bars, used for department-wise attendance. */
export function HorizontalBarChart({
  data,
  height = 260,
  color = CHART_COLORS.primary,
  suffix = '%',
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
  suffix?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 24, left: 8, bottom: 4 }}>
        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke={CHART_COLORS.grid} />
        <XAxis type="number" domain={[0, 100]} tickFormatter={(v: number) => `${v}${suffix}`} {...AXIS} />
        <YAxis type="category" dataKey="name" width={130} {...AXIS} />
        <Tooltip
          cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => `${value}${suffix}`}
        />
        <Bar dataKey="value" fill={color} radius={[0, 6, 6, 0]} maxBarSize={26} />
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Grouped bars, used for semester-wise attendance vs test performance. */
export function GroupedBarChart({
  data,
  height = 260,
  series,
}: {
  data: Record<string, string | number>[];
  height?: number;
  series: { key: string; label: string; color: string }[];
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} {...AXIS} />
        <Tooltip
          cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => `${value}%`}
        />
        <Legend
          iconType="circle"
          iconSize={8}
          formatter={(value) => <span className="text-xs text-muted-foreground">{value}</span>}
        />
        {series.map((s) => (
          <Bar key={s.key} dataKey={s.key} name={s.label} fill={s.color} radius={[6, 6, 0, 0]} maxBarSize={28} />
        ))}
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Smoothed area line, used for the monthly attendance trend. */
export function TrendAreaChart({
  data,
  height = 260,
  color = CHART_COLORS.primary,
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -20, bottom: 0 }}>
        <defs>
          <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity={0.28} />
            <stop offset="100%" stopColor={color} stopOpacity={0.02} />
          </linearGradient>
        </defs>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis domain={[0, 100]} tickFormatter={(v: number) => `${v}%`} {...AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(value: number) => `${value}%`} />
        <Area
          type="monotone"
          dataKey="value"
          stroke={color}
          strokeWidth={2.5}
          fill="url(#trend-fill)"
          dot={{ r: 3, fill: color, strokeWidth: 0 }}
          activeDot={{ r: 5 }}
        />
      </AreaChart>
    </ResponsiveContainer>
  );
}

/** Distribution columns, used for the test score bands. */
export function DistributionChart({
  data,
  height = 260,
}: {
  data: { name: string; value: number }[];
  height?: number;
}) {
  const colorFor = (band: string) => {
    if (band.startsWith('0') || band.startsWith('40')) return CHART_COLORS.danger;
    if (band.startsWith('50') || band.startsWith('60')) return CHART_COLORS.warning;
    return CHART_COLORS.success;
  };

  return (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis allowDecimals={false} {...AXIS} />
        <Tooltip
          cursor={{ fill: 'rgba(37, 99, 235, 0.06)' }}
          contentStyle={TOOLTIP_STYLE}
          formatter={(value: number) => [`${value} results`, 'Count']}
        />
        <Bar dataKey="value" radius={[6, 6, 0, 0]} maxBarSize={48}>
          {data.map((entry) => (
            <Cell key={entry.name} fill={colorFor(entry.name)} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** Simple line, used for smaller supporting charts. */
export function SimpleLineChart({
  data,
  height = 220,
  color = CHART_COLORS.primary,
}: {
  data: { name: string; value: number }[];
  height?: number;
  color?: string;
}) {
  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={data} margin={{ top: 8, right: 8, left: -22, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} stroke={CHART_COLORS.grid} />
        <XAxis dataKey="name" {...AXIS} />
        <YAxis {...AXIS} />
        <Tooltip contentStyle={TOOLTIP_STYLE} />
        <Line type="monotone" dataKey="value" stroke={color} strokeWidth={2.5} dot={{ r: 3 }} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function ChartCard({
  title,
  description,
  action,
  children,
  className,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <div className={`card-surface flex min-w-0 flex-col ${className ?? ''}`}>
      <div className="flex flex-wrap items-start justify-between gap-3 p-5 pb-2">
        <div>
          <h3 className="text-base font-semibold tracking-tight">{title}</h3>
          {description ? (
            <p className="mt-0.5 text-sm text-muted-foreground">{description}</p>
          ) : null}
        </div>
        {action}
      </div>
      <div className="px-2 pb-4 pt-2">{children}</div>
    </div>
  );
}

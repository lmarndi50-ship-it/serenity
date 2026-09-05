import { z } from 'zod';
import { prisma } from '../utils/prisma';
import {
  DEFAULT_THRESHOLDS,
  DEFAULT_WEIGHTS,
  type AttendanceThresholds,
  type ScoreWeights,
} from '../utils/academics';

export const SETTINGS_KEY = 'academic';

export const academicSettingsSchema = z.object({
  weights: z
    .object({
      attendance: z.number().min(0).max(1),
      tests: z.number().min(0).max(1),
      assignments: z.number().min(0).max(1),
    })
    .refine((w) => Math.abs(w.attendance + w.tests + w.assignments - 1) < 0.001, {
      message: 'Weights must add up to 1 (100%).',
    }),
  thresholds: z
    .object({
      good: z.number().min(1).max(100),
      warning: z.number().min(1).max(100),
    })
    .refine((t) => t.warning < t.good, {
      message: 'The warning threshold must be lower than the good threshold.',
    }),
  collegeName: z.string().min(2).max(120),
});

export type AcademicSettings = z.infer<typeof academicSettingsSchema>;

export const DEFAULT_SETTINGS: AcademicSettings = {
  weights: DEFAULT_WEIGHTS,
  thresholds: DEFAULT_THRESHOLDS,
  collegeName: 'Bhubaneswar Institute of Technology',
};

/** Reads the persisted settings, falling back to defaults for missing keys. */
export async function getSettings(): Promise<AcademicSettings> {
  const row = await prisma.appSetting.findUnique({ where: { key: SETTINGS_KEY } });
  if (!row) return DEFAULT_SETTINGS;
  const parsed = academicSettingsSchema.safeParse(row.value);
  return parsed.success ? parsed.data : DEFAULT_SETTINGS;
}

export async function saveSettings(settings: AcademicSettings): Promise<AcademicSettings> {
  await prisma.appSetting.upsert({
    where: { key: SETTINGS_KEY },
    create: { key: SETTINGS_KEY, value: settings },
    update: { value: settings },
  });
  return settings;
}

export async function getWeights(): Promise<ScoreWeights> {
  return (await getSettings()).weights;
}

export async function getThresholds(): Promise<AttendanceThresholds> {
  return (await getSettings()).thresholds;
}

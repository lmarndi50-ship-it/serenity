/* eslint-disable no-console */
/**
 * Daily assignment-deadline reminder job.
 *
 *   npm run notify:deadlines
 *
 * Intended to run once a day from an external scheduler. Examples:
 *
 *   # OS cron — 07:00 every day
 *   0 7 * * *  cd /srv/cams/backend && npm run notify:deadlines >> /var/log/cams-deadlines.log 2>&1
 *
 *   # Kubernetes CronJob / GitHub Actions: run `node dist/src/jobs/notifyDeadlines.js`
 *
 * Safe to run more than once a day — reminders are de-duplicated per student
 * and assignment, so repeat runs send nothing extra.
 *
 * DEADLINE_LEAD_HOURS (default 24) sets how far ahead to look.
 */
import { DEFAULT_LEAD_HOURS, sendDeadlineReminders } from '../services/deadline.service';
import { disconnectPrisma } from '../utils/prisma';

async function main(): Promise<void> {
  const raw = process.env.DEADLINE_LEAD_HOURS;
  const parsed = raw === undefined ? DEFAULT_LEAD_HOURS : Number(raw);

  if (!Number.isFinite(parsed) || parsed <= 0) {
    throw new Error(`DEADLINE_LEAD_HOURS must be a positive number, received "${raw}".`);
  }

  const startedAt = new Date();
  const result = await sendDeadlineReminders({ now: startedAt, leadHours: parsed });

  console.log(
    `[deadlines] ${startedAt.toISOString()} · window ${parsed}h · ` +
      `${result.assignmentsInWindow} assignment(s) due · ` +
      `${result.remindersSent} reminder(s) sent · ` +
      `${result.alreadyReminded} already reminded`,
  );
}

main()
  .then(async () => {
    await disconnectPrisma();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error('[deadlines] failed:', error);
    await disconnectPrisma();
    process.exit(1);
  });

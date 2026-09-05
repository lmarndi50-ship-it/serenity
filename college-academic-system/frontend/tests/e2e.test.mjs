/**
 * End-to-end browser checks against a running stack.
 *
 *   1. backend:  npm run dev      (http://localhost:4000)
 *   2. backend:  npm run seed     (so the expected demo data exists)
 *   3. frontend: npm run dev      (http://localhost:5173)
 *   4. frontend: npm run test:e2e
 *
 * Requires Playwright, which is not a default dependency because it downloads
 * a browser:  npm i -D playwright && npx playwright install chromium
 *
 * Screenshots of every page are written to tests/screenshots/.
 */
import { chromium } from 'playwright';
import fs from 'fs';

const BASE = 'http://localhost:5173';
const OUT = process.env.E2E_SHOTS ?? new URL('./screenshots/', import.meta.url).pathname;
fs.mkdirSync(OUT, { recursive: true });

const consoleErrors = [];
const pageErrors = [];
let fails = 0;

function check(name, cond, extra = '') {
  console.log(`${cond ? 'PASS' : 'FAIL'}  ${name}${extra ? ' — ' + extra : ''}`);
  if (!cond) fails += 1;
}

// PLAYWRIGHT_CHROMIUM lets CI point at a preinstalled browser.
const browser = await chromium.launch(
  process.env.PLAYWRIGHT_CHROMIUM ? { executablePath: process.env.PLAYWRIGHT_CHROMIUM } : {},
);
const context = await browser.newContext({ viewport: { width: 1440, height: 950 } });
const page = await context.newPage();

page.on('console', (msg) => {
  if (msg.type() === 'error') consoleErrors.push(msg.text());
});
page.on('pageerror', (err) => pageErrors.push(err.message));

async function login(email, password) {
  await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
  await page.fill('#identifier', email);
  await page.fill('#password', password);
  await page.click('button[type="submit"]');
  // React Router navigates after the API responds, which is after networkidle.
  await page.waitForURL((url) => !url.pathname.endsWith('/login'), { timeout: 15000 });
  await page.waitForLoadState('networkidle');
}

async function logout() {
  await page.evaluate(() => localStorage.clear());
  await context.clearCookies();
}

// --- login page ---
await page.goto(`${BASE}/login`, { waitUntil: 'networkidle' });
check('login page renders', await page.locator('h2:has-text("Sign in")').isVisible());
await page.screenshot({ path: `${OUT}/01-login.png` });

// --- student ---
await login('student@demo.com', 'Student@123');
check('student redirected to /dashboard', page.url().endsWith('/dashboard'), page.url());
await page.waitForSelector('text=Welcome back', { timeout: 10000 });

const kpiText = await page.locator('main').innerText();
check('KPI cards rendered', /Overall Attendance/.test(kpiText) && /Class Test Average/.test(kpiText));
const attendanceMatch = kpiText.match(/Overall Attendance\s*\n?\s*([\d.]+)%/);
check('attendance KPI shows a real number', !!attendanceMatch, attendanceMatch?.[1] + '%');
check('subject bands rendered', /Critical/.test(kpiText) && /Warning/.test(kpiText));

// Charts must actually paint SVGs, not empty containers.
await page.waitForTimeout(900);
const svgCount = await page.locator('main svg.recharts-surface').count();
check('recharts charts rendered', svgCount >= 3, `${svgCount} chart surfaces`);
await page.screenshot({ path: `${OUT}/02-student-dashboard.png`, fullPage: true });

// Notifications dropdown
await page.click('button[aria-label*="Notifications"]');
await page.waitForTimeout(500);
// The "Mark all as read" button only exists while something is unread, so
// assert on the panel itself rather than on that button.
const panel = page.locator('[role="menu"], [data-radix-popper-content-wrapper]').first();
check('notification dropdown opens', await panel.isVisible().catch(() => false));
await page.screenshot({ path: `${OUT}/03-notifications.png` });
await page.keyboard.press('Escape');

// Trend range filter
await page.selectOption('select[aria-label="Trend range"]', '4w');
await page.waitForTimeout(1200);
check('trend range filter works without error', pageErrors.length === 0);

// Navigate every student page
for (const [path, marker] of [
  ['/attendance', 'Subject-wise Attendance'],
  ['/tests', 'Class Test Marks'],
  ['/assignments', 'Assignments'],
  ['/subjects', 'Subjects'],
  ['/calendar', 'Calendar'],
  ['/notices', 'Notices'],
  ['/profile', 'Profile'],
  ['/settings', 'Settings'],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(600);
  const body = await page.locator('main').innerText();
  check(`student ${path} renders`, body.includes(marker), body.slice(0, 60).replace(/\n/g, ' '));
  await page.screenshot({ path: `${OUT}/student${path.replace('/', '-')}.png`, fullPage: true });
}

// Student must not reach admin routes.
await page.goto(`${BASE}/admin/dashboard`, { waitUntil: 'networkidle' });
check('student blocked from admin route', page.url().endsWith('/dashboard'), page.url());

// --- responsive ---
await page.goto(`${BASE}/dashboard`, { waitUntil: 'networkidle' });
for (const [w, h, label] of [[390, 844, 'mobile'], [768, 1024, 'tablet'], [1024, 800, 'laptop'], [1920, 1080, 'desktop']]) {
  await page.setViewportSize({ width: w, height: h });
  await page.waitForTimeout(700);
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  check(`no horizontal overflow at ${w}px (${label})`, overflow <= 1, `${overflow}px overflow`);
  await page.screenshot({ path: `${OUT}/responsive-${w}.png`, fullPage: w < 800 });
}
await page.setViewportSize({ width: 390, height: 844 });
const menuVisible = await page.locator('button[aria-label="Open navigation"]').isVisible();
check('mobile drawer trigger visible', menuVisible);
if (menuVisible) {
  await page.click('button[aria-label="Open navigation"]');
  await page.waitForTimeout(400);
  check('mobile drawer opens', await page.locator('nav[aria-label="Main"]').last().isVisible());
  await page.screenshot({ path: `${OUT}/responsive-390-drawer.png` });
  await page.keyboard.press('Escape');
}
await page.setViewportSize({ width: 1440, height: 950 });

// --- teacher ---
await logout();
await login('teacher@demo.com', 'Teacher@123');
check('teacher redirected to /teacher/dashboard', page.url().includes('/teacher/dashboard'), page.url());
await page.waitForTimeout(800);
const teacherText = await page.locator('main').innerText();
check('teacher KPIs rendered', /Assigned Subjects/.test(teacherText) && /Total Students/.test(teacherText));
await page.screenshot({ path: `${OUT}/10-teacher-dashboard.png`, fullPage: true });

await page.goto(`${BASE}/teacher/attendance`, { waitUntil: 'networkidle' });
await page.waitForTimeout(1200);
const rosterRows = await page.locator('table tbody tr').count();
check('attendance roster loads', rosterRows > 0, `${rosterRows} students`);
await page.click('button:has-text("Mark All Present")');
await page.waitForTimeout(300);
const presentCount = await page.locator('button[role="radio"][aria-checked="true"]').count();
check('Mark All Present sets every row', presentCount === rosterRows, `${presentCount}/${rosterRows}`);
await page.screenshot({ path: `${OUT}/11-teacher-attendance.png`, fullPage: true });
await page.click('button:has-text("Save Attendance")');
await page.waitForTimeout(1500);
const toastText = await page.locator('[data-sonner-toast]').innerText().catch(() => '');
check('saving attendance shows success toast', /saved/i.test(toastText), toastText.replace(/\n/g, ' '));

for (const [path, marker] of [
  ['/teacher/tests', 'Class Tests'],
  ['/teacher/assignments', 'Assignments'],
  ['/teacher/subjects', 'My Subjects'],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(800);
  const body = await page.locator('main').innerText();
  check(`teacher ${path} renders`, body.includes(marker));
  await page.screenshot({ path: `${OUT}/teacher${path.replace(/\//g, '-')}.png`, fullPage: true });
}

// --- admin ---
await logout();
await login('admin@demo.com', 'Admin@123');
check('admin redirected to /admin/dashboard', page.url().includes('/admin/dashboard'), page.url());
await page.waitForTimeout(1500);
const adminText = await page.locator('main').innerText();
check('admin KPIs rendered', /Total Students/.test(adminText) && /Average Attendance/.test(adminText));
const adminCharts = await page.locator('main svg.recharts-surface').count();
check('admin analytics charts rendered', adminCharts >= 4, `${adminCharts} charts`);
await page.screenshot({ path: `${OUT}/20-admin-dashboard.png`, fullPage: true });

for (const [path, marker] of [
  ['/admin/students', 'Students'],
  ['/admin/teachers', 'Teachers'],
  ['/admin/subjects', 'Subjects'],
  ['/admin/users', 'Users'],
  ['/admin/settings', 'Academic Settings'],
]) {
  await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(900);
  const body = await page.locator('main').innerText();
  check(`admin ${path} renders`, body.includes(marker));
  await page.screenshot({ path: `${OUT}/admin${path.replace(/\//g, '-')}.png`, fullPage: true });
}

// Admin search filters students server-side.
await page.goto(`${BASE}/admin/students`, { waitUntil: 'networkidle' });
await page.fill('input[aria-label="Search students"]', '23CS042');
await page.waitForTimeout(1500);
const filtered = await page.locator('table tbody tr').count();
check('admin student search filters', filtered === 1, `${filtered} rows`);

// 404
await page.goto(`${BASE}/does-not-exist`, { waitUntil: 'networkidle' });
check('404 page renders', await page.locator('text=This page does not exist').isVisible());

// --- console hygiene ---
const realConsoleErrors = consoleErrors.filter(
  (e) => !/favicon|Download the React DevTools|net::ERR_/.test(e),
);
check('no uncaught page errors', pageErrors.length === 0, pageErrors.slice(0, 3).join(' | '));
check('no console errors', realConsoleErrors.length === 0, realConsoleErrors.slice(0, 3).join(' | '));

await browser.close();
console.log(`\n${fails === 0 ? 'ALL PASSED' : fails + ' FAILURES'}`);
process.exit(fails === 0 ? 0 : 1);

/**
 * Run the Sphere AND e-Kshamata suites from one command.
 * ──────────────────────────────────────────────────────
 * They are separate repos with their own node_modules, Playwright config and
 * accounts, so each npm script MUST run inside its own folder — never from
 * D:\Automation, where there is no Playwright install at all. This spawns one
 * child per repo with the right cwd and environment, and prints a single
 * verdict plus where each report landed.
 *
 * The two suites share no state and no accounts, so running them at the same
 * time is safe and roughly halves the wall time. --serial is there for a slow
 * machine, or when you want the logs to stay readable.
 *
 *   npm run both                 smoke on production (default)
 *   npm run both:staging         the same on staging
 *   npm run both -- --serial     one after the other
 *   npm run both -- --task regression
 *
 * Tasks (same name, different script per repo — see TASKS):
 *   smoke       quick public + signed-in check
 *   regression  the full suite
 *   compare     production vs staging, side by side
 */
import { spawn } from 'node:child_process';
import { existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const argv = process.argv.slice(2);
const has = (f) => argv.includes(f);
const flag = (name, dflt) => {
  const i = argv.indexOf(name);
  return i === -1 ? dflt : argv[i + 1];
};

const SERIAL = has('--serial');
const TASK = (flag('--task', 'smoke') || 'smoke').toLowerCase();
const ENVNAME = has('--staging') ? 'staging' : has('--uat') ? 'uat' : 'production';

/** Each repo: where it lives, which portal it tests, and its script per task. */
const REPOS = [
  {
    name: 'Sphere',
    dir: resolve(ROOT, 'SphereWebAutomation'),
    urls: {
      production: 'https://sphere.aastrika.org',
      staging: 'https://portal-staging.aastrika.org',
      uat: 'https://uat.aastrika.org',
    },
    tasks: {
      smoke: ['npm', 'run', 'test:ui'],
      regression: ['npm', 'run', 'test:regression'],
      compare: ['npm', 'run', 'compare:auth'],
    },
    reports: 'SphereWebAutomation/brand-reports + test-reports',
  },
  {
    name: 'e-Kshamata',
    dir: resolve(ROOT, 'EkshamataWebAutomation'),
    urls: {
      production: 'https://ekshamata.aastrika.org',
      staging: 'https://ekshamata-staging.aastrika.org',
      uat: 'https://ekshamata-uat.aastrika.org',
    },
    tasks: {
      smoke: ['npm', 'run', 'smoke'],
      regression: ['npm', 'run', 'test:regression'],
      compare: ['npm', 'run', 'compare:org'],
    },
    reports: 'EkshamataWebAutomation/brand-reports + test-reports',
  },
];

function runOne(repo) {
  return new Promise((done) => {
    const cmd = repo.tasks[TASK];
    if (!cmd) {
      console.log(`  ⊘ ${repo.name}: no "${TASK}" task defined — skipped`);
      return done({ repo, code: 0, skipped: true });
    }
    if (!existsSync(repo.dir)) {
      console.log(`  ✖ ${repo.name}: ${repo.dir} not found`);
      return done({ repo, code: 1 });
    }
    const url = repo.urls[ENVNAME];
    console.log(`  ▶ ${repo.name.padEnd(11)} ${cmd.join(' ')}   → ${url}`);
    const child = spawn(cmd[0], cmd.slice(1), {
      cwd: repo.dir,                       // the whole point: each repo runs in its own folder
      shell: true,                         // npm on Windows needs a shell
      stdio: 'inherit',
      env: { ...process.env, BASE_URL: url, HEADLESS: process.env.HEADLESS ?? 'true' },
    });
    child.on('exit', (code) => done({ repo, code: code ?? 1 }));
  });
}

const started = Date.now();
console.log(`\n🚀 ${TASK} · ${ENVNAME} · ${SERIAL ? 'one after the other' : 'both at once'}\n`);

const results = [];
if (SERIAL) {
  for (const r of REPOS) results.push(await runOne(r));
} else {
  results.push(...await Promise.all(REPOS.map(runOne)));
}

const mins = ((Date.now() - started) / 60000).toFixed(1);
console.log(`\n${'─'.repeat(62)}`);
for (const r of results) {
  const mark = r.skipped ? '⊘ skipped' : r.code === 0 ? '✅ passed ' : '✖ FAILED ';
  console.log(`  ${mark}  ${r.repo.name.padEnd(11)} reports → ${r.repo.reports}`);
}
console.log(`  finished in ${mins} min`);
console.log('─'.repeat(62) + '\n');

// Non-zero when EITHER suite failed, so this can gate a pipeline.
process.exit(results.some((r) => r.code !== 0) ? 1 : 0);

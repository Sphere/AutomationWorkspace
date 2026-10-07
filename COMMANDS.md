# Aastrika Automation — Command Reference

Everything needed to run the three Playwright suites and to keep them in Git.

Shell examples are **PowerShell** (the default on these machines). Where a command
needs an environment variable, the bash equivalent is given alongside, because the
syntax differs and getting it wrong silently runs the wrong environment.

| | |
|---|---|
| **Suites** | `SphereWebAutomation`, `EkshamataWebAutomation`, `CBPAutomation` |
| **Root** | `D:\Automation` |
| **Node** | run every command from **inside a suite folder**, never from `D:\Automation` |

> **Run commands from the suite folder.** `npx playwright test` executed at
> `D:\Automation` finds no config and every spec fails. `cd` into
> `SphereWebAutomation`, `EkshamataWebAutomation` or `CBPAutomation` first.

---

## 1. The repositories

Three separate private repos, one per suite.

| Suite | Repository |
|---|---|
| SphereWebAutomation | https://github.com/Santhoshshivaprakash/SphereWebAutomation |
| EkshamataWebAutomation | https://github.com/Santhoshshivaprakash/E-Kshamata-Web-Automation |
| CBPAutomation | https://github.com/Santhoshshivaprakash/CBP-Automation |

Each has `main` as its only branch and its own `.gitignore`.

### What is tracked, and what never is

Tracked on purpose — the throwaway `@yopmail.com` account ledgers, so the team
shares one history of which accounts exist where:

```
EkshamataWebAutomation/  created-users.txt, last-created-user.json,
                         email-counters.json, test-reports/credentials_*.csv
SphereWebAutomation/     config/accounts.json, registered-accounts.xlsx,
                         generated-emails.txt, .last-registered-email.json
```

Never tracked:

| Excluded | Why |
|---|---|
| `.env` (all three) | API tokens, SMTP password, Gemini key, portal credentials |
| `.auth-state*.json`, `.auth/` | live session cookies |
| `test-reports/`, `compare-reports/`, `regression-results/`, `reports/`, `playwright-report/`, `test-results/` | regenerated every run, thousands of files |
| `node_modules/` | reinstallable |
| `*copy*.json`, `nul` | stray duplicates from a file copy or a shell redirect |

The `credentials_*.csv` files are an exception carved out of an ignored directory.
That needs `test-reports/*` rather than `test-reports/`, because **Git cannot
re-include a file whose parent directory is excluded.**

---

## 2. Git and GitHub

### Daily loop

```powershell
cd D:\Automation\SphereWebAutomation

git status                      # what changed
git status --short               # the same, compact
git diff                         # unstaged changes
git diff --cached                # what is staged

git add -A                       # stage everything not ignored
git commit -m "Fix the T&C gate detection"
git push
```

`git add -A` is safe here: the `.gitignore` files keep credentials and run output
out. Verify with section 2.4 before any commit that touches new files.

### Pull before you push

```powershell
git pull --rebase                # replay your commits on top of the remote
git log --oneline --graph -10     # see the shape of the history
```

### First-time setup for a new clone

```powershell
git clone https://github.com/Santhoshshivaprakash/SphereWebAutomation.git
cd SphereWebAutomation
npm install
npx playwright install chromium
Copy-Item config\accounts.example.json config\accounts.json   # then fill it in
```

`.env` is **not** in the repo. Copy `.env.example` where one exists
(e-kshamata, CBP) and fill in the tokens, or ask for the values.

### 2.4 Check what you are about to publish

Run this **before** committing new files. It catches a credential file that no
`.gitignore` rule covers yet.

```powershell
# filenames that look sensitive
git diff --cached --name-only | Select-String -Pattern "\.env|auth-state|secret|token|cookie"

# actual secret VALUES in staged content
git diff --cached --name-only | ForEach-Object { Select-String -Path $_ -Pattern "eyJ[A-Za-z0-9._-]{30,}|AIza[0-9A-Za-z_-]{30,}|bearer [A-Za-z0-9._-]{20,}" }
```

bash equivalent:

```bash
git diff --cached --name-only | grep -iE "\.env|auth-state|secret|token|cookie"
git diff --cached --name-only -z | xargs -0 grep -ohE "eyJ[A-Za-z0-9._-]{30,}|AIza[0-9A-Za-z_-]{30,}"
```

### Adding a remote to a suite that has none

```powershell
git init
git symbolic-ref HEAD refs/heads/main      # name the branch main
git add -A
git commit -m "Initial commit"
git remote add origin https://github.com/Santhoshshivaprakash/<REPO>.git
git push -u origin main
```

### 2.6 Situations you will actually hit

**The GitHub repo was created with a README, so the push is rejected.**
The histories are unrelated. Merge the stub in rather than force-pushing over it:

```powershell
git fetch origin main
git merge origin/main --allow-unrelated-histories
# conflict on README.md — keep the project one:
git checkout --ours README.md
git add README.md
git commit --no-edit
git push -u origin main
```

**A file is ignored but you want it tracked from now on.**
Delete the rule from `.gitignore` — do *not* use `git add -f`. A force-add stages
the file once and then goes quiet as the suite appends to it.

```powershell
# remove the line from .gitignore, then
git add -A
git commit -m "Track the account ledger"
```

**`git check-ignore` says a file is not ignored, but the rule is clearly there.**
A file already in the index is never reported as ignored. Take it out first:

```powershell
git rm --cached "path\to\file"
git check-ignore -v "path\to\file"        # now it reports the matching rule
```

**A negation like `!test-reports/credentials_*.csv` does nothing.**
Two possible causes, both real:
1. the parent directory is excluded — change `test-reports/` to `test-reports/*`;
2. a broader rule appears **later** in the file and wins — a bare
   `credentials_*.csv` further down overrides the negation above it.

```powershell
git check-ignore -v test-reports\credentials_x.csv    # prints the rule and line number
```

**Something sensitive was committed.**
It is in history even after deleting the file. Remove it from tracking, then
treat the credential as exposed and rotate it:

```powershell
git rm --cached path\to\secret
# add it to .gitignore, then
git commit -m "Stop tracking <file>"
```

**Undo, safely.**

```powershell
git restore path\to\file          # discard unstaged changes to one file
git restore --staged path\to\file  # unstage, keep the edit
git reset --soft HEAD~1            # undo the last commit, keep the changes staged
```

`git reset --hard` and `git push --force` discard work. Prefer the above.

---

## 3. SphereWebAutomation

Portal: `https://sphere.aastrika.org` (production) ·
`https://portal-staging.aastrika.org` (staging)

### Interactive runner — the usual way in

```powershell
cd D:\Automation\SphereWebAutomation
npm run go            # asks for environment, then which spec
npm run go:both       # the same spec on production then staging, one report
```

`npm run go` refuses a `BASE_URL` that is not a Sphere host and asks instead —
see section 6.

### Feature specs

| Command | Spec |
|---|---|
| `npm run run:create-account` | signup end to end (OTP from yopmail) |
| `npm run run:login` | public login |
| `npm run run:otp` | OTP flow |
| `npm run run:account` | Account settings |
| `npm run run:mycourse` | My Courses |
| `npm run run:course-toc` | course table of contents |
| `npm run run:competency` | competency dashboard |
| `npm run run:private` | private learner page |
| `npm run run:public` | public site |
| `npm run run:scorm` | SCORM module |
| `npm run run:fastlogin` | API fast login |
| `npm run login:check` | verify a set of credentials can sign in |

### Course and competency completion

```powershell
npm run run:course                 # interactive: pick the course
npm run courses:list               # list available courses
npm run run:course-fresh           # mint a brand-new user, then complete a course
npm run run:complete-competency    # all 5 levels of a competency
npm run mint:fresh-user            # create one brand-new account, nothing else
```

### Suites and reports

```powershell
npm test                  # every spec, default project
npm run test:ui           # Chrome project only
npm run test:api          # API specs
npm run test:monitor      # monitor project
npm run test:all          # scripted full run
npm run test:list         # inventory of specs

npm run report            # open the last Playwright HTML report
npm run test:regression   # full regression, branded merged report
npm run report:merge      # merge blob reports into the branded report
npm run report:full       # every Chrome spec, headless, against production
npm run report:sanity     # auth + app + course blobs, then merge
```

### Environment comparison

```powershell
npm run compare           # interactive picker
npm run compare:auth      # signed-in comparison
npm run compare:all       # everything, opens the report
npm run compare:journeys  # journeys only
npm run compare:signup    # the signup journey only
npm run compare:local     # production vs localhost:3000
```

---

## 4. EkshamataWebAutomation

Portal: `https://ekshamata.aastrika.org` (production) ·
`https://ekshamata-staging.aastrika.org` (staging)

> e-kshamata and Sphere are **different portals** with different accounts. An
> account created on one does not work on the other, and the two backends are
> separate — which is why users are provisioned per environment.

### Competency climb

```powershell
cd D:\Automation\EkshamataWebAutomation
npm run run:competency        # interactive: org, competency, levels
npm run climb:bnrc            # BNRC preselected
npm run climb:shsb            # SHSB
npm run climb:dmhup           # DMHUP
npm run climb:pvtbihar        # PVTBIHAR
npm run climb:pvtup           # PVTUP
npm run run:stepper           # the stepper spec, interactive
```

Fail a chosen level on purpose and clear it through that level's course:

```powershell
$env:ORG="BNRC"
$env:COMPETENCY="Vaginal examination and plotting on partograph"
$env:LEVELS="5"; $env:FAIL_LEVELS="5"
$env:BASE_URL="https://ekshamata-staging.aastrika.org"
npx playwright test tests/competency-course.spec.ts --project=Chrome
```

`FAIL_LEVELS` counts **loop iterations, not portal levels**. On an account that
has already cleared level 1, iteration 1 is the portal's level 2. Use a fresh
account whenever it matters which level fails — leave `REUSE_USERS` unset.

### Courses and certificates

```powershell
npm run run:course                  # interactive
npm run courses:list                # list courses on production
npm run courses:list:stage          # list courses on staging
npm run run:course:prod             # production
npm run run:course:stage            # staging
npm run run:certificate             # complete a course, collect the certificate
npm run run:certificate:only        # certificate step alone
npm run run:certificate:only:prod   # production
npm run run:certificate:only:stage  # staging
```

### Provisioning users

```powershell
npm run create:creds -- --org BNRC          # every BNRC role, credentials only
npm run create:creds -- --org BNRC,SHSB     # several orgs
npm run create:creds -- --all                # every org, every role
npm run create:creds -- --all --stage        # on staging
npm run create:creds -- --org BNRC --count 3 # three per role

npm run create:pair -- BNRC       # create AND verify a login
npm run create:user               # interactive
npm run verify:account            # check an account can sign in
npm run roles                     # role sweep, pick the org
npm run roles:all                 # every org
```

`create:creds` opens no browser — it is the three provisioning API calls only, so
a batch takes seconds. It proves nothing about logging in; use `create:pair` for
that. Every account is appended to `created-users.txt` with its `env=` host.

> A **freshly provisioned account has no learning plan for a few minutes**. The
> competency home comes up with no cards until the backend fills it, and new
> accounts must accept the Terms of use gate on first login (the suites do this
> automatically).

### Comparison and reports

```powershell
npm run compare           # interactive
npm run compare:bnrc      # BNRC, prod vs stage
npm run compare:orgs      # every role, homepage layout, one consolidated sheet
npm run compare:all
npm run compare:users
npm run test:regression
npm run report
npm run report:brand      # path to the branded report
```

### Other specs

```powershell
npm run smoke                 # smoke spec, headed
npm run login                 # login spec
npm run test:bnrc             # the BNRC org spec, existing user
npm run test:orgs             # the orgs project
npm run test:org-content      # org content checks
npm run test:badge            # Account-page badge
npm run test:badge:mp         # the same, ORG=MP
npm run run:clicks            # click-through spec
npm run run:create-user-test  # user-creation spec
```

---

## 5. CBPAutomation

Portal: `https://cbp-staging.aastrika.org`, SSO via `portal-staging.aastrika.org`

```powershell
cd D:\Automation\CBPAutomation
npm run go                    # interactive runner
npm run login

npm run create                # authoring flow
npm run send-for-review
npm run review
npm run accept-to-publisher
npm run publish-course

npm run lifecycle             # full create → review → publish, headed
npm run lifecycle:report      # the same, headless, builds the report
npm run lifecycle:fast        # fast path against staging
npm run report:build          # rebuild the report from reports/results.json

npm test                      # Chrome project
npm run test:headless
npm run test:all
```

---

## 6. Environment variables

### BASE_URL — the one to be careful with

All three suites read `BASE_URL`, and in PowerShell `$env:BASE_URL` **outlives
the command that set it**. A value left over from an e-kshamata run captures the
next Sphere run silently.

```powershell
$env:BASE_URL="https://portal-staging.aastrika.org"   # set
Remove-Item Env:BASE_URL                               # clear
Get-ChildItem Env:BASE_URL                             # check
```

```bash
export BASE_URL=https://portal-staging.aastrika.org
unset BASE_URL
```

The Sphere runner now rejects a non-Sphere `BASE_URL` and prompts instead, rather
than running Sphere specs against another portal. Clear it anyway — other entry
points read it directly.

### The rest

| Variable | Effect |
|---|---|
| `HEADLESS=true` | no visible browser |
| `REUSE_USERS=1` | reuse the newest matching account instead of provisioning |
| `ORG` | org key (`BNRC`, `SHSB`, `MP`, `DMHUP`, `PVTBIHAR`, …) |
| `CREATE_DESIGNATION` | a specific role within a multi-role org |
| `COMPETENCY` | competency name, exactly as the card shows it |
| `LEVELS` / `FAIL_LEVELS` | how many levels; which to fail on purpose (`all` accepted) |
| `MAX_MODULES` | cap on modules per course |
| `QUIZ_DEBUG=1` | per-step quiz diagnostics (`visibleRadios=… answered=…`) |
| `ENSURE_LANG=hi\|en` | pin the portal language (a persisted account setting) |
| `COURSE_NAME` | course to complete, skipping the prompt |
| `SPHERE_USER_PREFIX` | override the staging email tag; `none` switches it off |
| `USER_ENV_TAG` | e-kshamata equivalent |
| `COMPETENCY_USER_EMAIL` | wins over `TEST_USER_EMAIL` for competency runs |
| `PROD_EMAIL` / `PROD_PASSWORD` | credentials for production runs |
| `STAGING_EMAIL` / `STAGING_PASSWORD` | credentials for staging runs |
| `JSON_OUT` | also write a JSON report to that path |

Account precedence, highest first:
`PROD_EMAIL` / `STAGING_EMAIL` (whichever matches the environment) →
`TEST_USER_EMAIL` → `MONITOR_EMAIL`. So a `PROD_EMAIL` sitting in `.env` wins
over `TEST_USER_EMAIL` and the runner will say so as it starts — worth reading
that line, because it explains a run that signs in as an account you did not
expect.

### URLs

| Environment | URL |
|---|---|
| Sphere production | `https://sphere.aastrika.org` |
| Sphere staging | `https://portal-staging.aastrika.org` |
| e-kshamata production | `https://ekshamata.aastrika.org` |
| e-kshamata staging | `https://ekshamata-staging.aastrika.org` |
| CBP staging | `https://cbp-staging.aastrika.org` |
| Local mirror | `http://localhost:3000` |

---

## 7. Raw Playwright

```powershell
npx playwright test                              # everything
npx playwright test tests/Account.spec.ts        # one spec
npx playwright test --project=Chrome             # one project
npx playwright test -g "partial test name"       # one test
npx playwright test --headed                     # watch it
npx playwright test --debug                      # step through
npx playwright test --reporter=line              # compact output
npx playwright show-report                       # last HTML report
npx playwright install chromium                  # install the browser
```

---

## 8. Troubleshooting

**A run prints the dotenv line and then nothing.**
Orphaned Playwright processes from a killed run are holding things up. Clear them:

```powershell
Get-CimInstance Win32_Process |
  Where-Object { $_.CommandLine -like '*EkshamataWebAutomation*' } |
  ForEach-Object { Stop-Process -Id $_.ProcessId -Force }
```

**Run one browser workload at a time.** Two headed runs on one machine make the
slower one time out and report a failure that is not real.

**Signup fails with "Sorry ! User not created. Please try again in sometime."**
The portal rejects an email whose local part (before the `@`) is **20 characters
or longer**; 19 works. `testautomation` + 5 digits is exactly 19, so any prefix
pushes it over. The UI gives no error — the wizard just resets to a blank form,
which looks like a button that never fired. The suite now shortens the base name
to make room for the `stage-` tag, so staging produces
`stage-testauto12345@yopmail.com`.

**No OTP arrives.** First check whether the account was created at all: watch
`POST /apis/public/v8/signupWithAutoLoginV2/register` in the network panel. A 500
there means no user, and therefore no mail — the inbox being empty is a symptom,
not the cause.

**The competency home shows no cards.** Either the account is brand new and its
learning plan has not been built yet, or it is sitting on the Terms of use gate
at `/app/new-tnc`, which blocks every route.

**Playwright note:** `isVisible({ timeout })` does **not** wait — it is an instant
check and the `timeout` option is ignored. Use
`waitFor({ state: 'visible', timeout })` when something needs waiting for. This
caused two real bugs: a Terms gate that was never accepted, and a retry loop that
reloaded 58 times in the time it should have spent watching for one element.

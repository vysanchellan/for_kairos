# Getting started with Gather: the complete guide

Hi! This guide takes you from "I've just been sent a GitHub link" to "the whole app is running on my computer and I understand what everything does". You don't need to have used Django or React before. Follow it top to bottom the first time; afterwards, [§6 (Running it again later)](#6-running-it-again-later) is all you need.

> **Short version for the impatient:** install Python 3.12+, Node.js 20.19+ and Git → clone the repo → in `backend/` create a virtual environment, install requirements, `migrate`, `seed_demo_data`, `runserver` → in `frontend/` run `npm ci` and `npm run dev` → open http://localhost:5173.

---

## Contents

1. [What this project is](#1-what-this-project-is)
2. [What you need to install (one time only)](#2-what-you-need-to-install-one-time-only)
3. [Get the code onto your computer](#3-get-the-code-onto-your-computer)
4. [Start the backend (the API)](#4-start-the-backend-the-api)
5. [Start the frontend (the website)](#5-start-the-frontend-the-website)
6. [Running it again later](#6-running-it-again-later)
7. [A guided tour of the app](#7-a-guided-tour-of-the-app)
8. [The assignment's demo scenarios, step by step](#8-the-assignments-demo-scenarios-step-by-step)
9. [Running the tests](#9-running-the-tests)
10. [How the project is organised](#10-how-the-project-is-organised)
11. [How it works, in plain English](#11-how-it-works-in-plain-english)
12. [Common changes you might want to make](#12-common-changes-you-might-want-to-make)
13. [Troubleshooting](#13-troubleshooting)
14. [Putting it on your own GitHub](#14-putting-it-on-your-own-github)
15. [Putting it online (optional)](#15-putting-it-online-optional)
16. [Before you submit it anywhere](#16-before-you-submit-it-anywhere)
17. [Glossary](#17-glossary)

---

## 1. What this project is

**Gather** is a small community events website with three kinds of user:

| Role | What they can do |
| --- | --- |
| **Visitor** | Browse published events and register interest anonymously, with no name or email. They just get a reference number like `REG-7KQ2M9XH4P` |
| **Organiser** | Create events, edit their own events, and see how many people have registered |
| **Admin** | Review new events, then publish them (or send them back with a note asking for changes) |

There are no real logins. You pick a role from the **"Viewing as"** menu in the top-right corner, which keeps the demo simple.

It is two programs that run at the same time:

| Part | Technology | Runs at | Job |
| --- | --- | --- | --- |
| **Backend** (the API) | Python, Django, Django REST Framework | http://localhost:8000 | Stores the data and enforces every rule (who can do what, capacity limits and so on) |
| **Frontend** (the website) | React, TypeScript, Vite, Tailwind CSS | http://localhost:5173 | Everything you see and click. It asks the backend for data |

The data lives in a single file, `backend/db.sqlite3` (a SQLite database), which is created when you set things up. It survives restarts, so events you create are still there tomorrow.

Two other documents go deeper:

- **`README.md`**: the official project write-up (setup, API, tests, design decisions).
- **`docs/ARCHITECTURE.md`**: a detailed technical explanation of how and why everything works.

---

## 2. What you need to install (one time only)

You need three free tools: **Python**, **Node.js** and **Git**. Check whether you already have them first.

### 2.1 Open a terminal

- **Windows:** press the Windows key, type **PowerShell**, and open **Windows PowerShell**.
- **macOS:** press `Cmd + Space`, type **Terminal**, and press Enter.

Every command in this guide is typed into that window, followed by Enter.

### 2.2 Check what you already have

Run these one at a time:

```bash
python --version
```

```bash
node --version
```

```bash
git --version
```

On macOS, if `python --version` says "command not found", try `python3 --version`.

| Tool | You need | If it's missing or too old |
| --- | --- | --- |
| Python | **3.12 or newer** (e.g. `Python 3.12.10`) | See 2.3 |
| Node.js | **20.19 or newer**, or 22.12+ (e.g. `v22.14.0`) | See 2.4 |
| Git | Any recent version | See 2.5 (or skip Git and download a ZIP, see §3.2) |

### 2.3 Install Python

- **Windows:** download the latest **Python 3.12 or 3.13** installer from https://www.python.org/downloads/windows/. When you run it, **tick "Add python.exe to PATH"** at the bottom of the first screen, then click *Install Now*. This also installs the `py` launcher used below.
- **macOS:** download the macOS installer from https://www.python.org/downloads/macos/ and run it, or with Homebrew run `brew install python@3.12`.

**Close the terminal and open a new one** afterwards, then check with `python --version` (Windows) or `python3 --version` (macOS).

### 2.4 Install Node.js

Download the **LTS** version from https://nodejs.org and run the installer with the default options. This also installs `npm`, the tool that downloads JavaScript packages. Open a new terminal and check with `node --version`.

### 2.5 Install Git

- **Windows:** https://git-scm.com/download/win. The default options are fine.
- **macOS:** run `git --version`. If Git is missing, macOS offers to install the Command Line Tools; click *Install*.

---

## 3. Get the code onto your computer

### 3.1 With Git (recommended)

Pick a folder for the project (your Desktop is fine), go there in the terminal, and clone:

```bash
cd Desktop
```

```bash
git clone https://github.com/vysanchellan/for_kairos.git
```

```bash
cd for_kairos
```

You're now inside the project folder. It contains `backend/`, `frontend/`, `docs/`, `README.md` and this guide.

### 3.2 Without Git (download a ZIP)

1. Open https://github.com/vysanchellan/for_kairos.
2. Click the green **Code** button, then **Download ZIP**.
3. Unzip it somewhere (e.g. your Desktop). The folder is usually called `for_kairos-main`.
4. In the terminal, `cd` into that folder, e.g. `cd Desktop/for_kairos-main`.

---

## 4. Start the backend (the API)

You'll use **two terminal windows**: one for the backend, one for the frontend. Both need to stay open while you use the app.

In your **first terminal**, inside the project folder:

### 4.1 Go into the backend folder

```bash
cd backend
```

### 4.2 Create a virtual environment (one time only)

A *virtual environment* is a private box of Python packages just for this project, so nothing clashes with other Python projects on your computer.

**Windows (PowerShell):**

```powershell
py -3.12 -m venv .venv
```

(If you installed 3.13, use `py -3.13`. Any version from 3.12 up works.)

**macOS:**

```bash
python3 -m venv .venv
```

This creates a hidden `.venv` folder. It isn't part of the code and is never uploaded to GitHub.

### 4.3 Activate it (every time you open a new terminal for the backend)

**Windows (PowerShell):**

```powershell
.venv\Scripts\Activate.ps1
```

> If you see an error about *"running scripts is disabled on this system"*, run this once in the same window, then try again:
>
> ```powershell
> Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned
> ```
>
> It only affects that terminal window and is safe.

**macOS:**

```bash
source .venv/bin/activate
```

When it works, your prompt starts with `(.venv)`. From now on, `python` and `pip` refer to the project's own copies.

### 4.4 Install the Python packages (one time only)

```bash
pip install -r requirements-dev.txt
```

This downloads Django, Django REST Framework, drf-spectacular (API docs), python-dotenv and pytest (tests). It takes a minute. A notice saying a newer `pip` is available is harmless.

### 4.5 Create your settings file (one time only)

**Windows (PowerShell):**

```powershell
Copy-Item .env.example .env
```

**macOS:**

```bash
cp .env.example .env
```

The `.env` file holds local settings. The defaults are fine and **there are no passwords or API keys to fill in**. (It turns on debug mode for local use. `.env` is never uploaded to GitHub.)

### 4.6 Create the database (one time only)

```bash
python manage.py migrate
```

This creates `db.sqlite3` with empty tables. You'll see a list of lines ending in `... OK`.

### 4.7 Add the demo data (one time only)

```bash
python manage.py seed_demo_data
```

You should see:

```text
Seeded 12 events (8 published, 3 pending review, 1 with changes requested) and 89 registrations.
```

All of this data is fictional: two made-up organisers (*Riverside Neighbourhood Collective* and *Lantern Lane Arts Club*) and 12 events.

### 4.8 Start the server

```bash
python manage.py runserver 8000
```

You'll see something like `Starting development server at http://127.0.0.1:8000/`. **Leave this window open.** This is where the backend's logs appear as you use the app.

**Check it works:** open http://localhost:8000/api/v1/health/ in your browser. You should see `{"status":"ok","database":"ok"}`. The interactive API documentation is at http://localhost:8000/api/docs/.

---

## 5. Start the frontend (the website)

Open a **second terminal window** and go to the project folder again (e.g. `cd Desktop/for_kairos`).

### 5.1 Go into the frontend folder

```bash
cd frontend
```

### 5.2 Install the JavaScript packages (one time only)

```bash
npm ci
```

This reads `package-lock.json` and installs exactly the versions the project was built with into a `node_modules` folder. It takes a minute or two. Warnings are normal; only a line saying `ERR!` is a problem.

### 5.3 Start the dev server

```bash
npm run dev
```

You'll see:

```text
  VITE v8.x  ready in ... ms
  ➜  Local:   http://localhost:5173/
```

**Leave this window open too.**

### 5.4 Open the app

Go to **http://localhost:5173** in your browser (Chrome, Edge, Firefox or Safari). A welcome dialog explains the three roles. Pick one and you're in! 🎉

> The frontend automatically forwards anything starting with `/api` to the backend on port 8000, so the backend from §4 must be running. If you see "We're having trouble connecting", it isn't. See §13.

---

## 6. Running it again later

The one-time steps are done. Next time you only need:

**Terminal 1 (backend):**

```bash
cd Desktop/for_kairos/backend
```

Then activate the environment: `.venv\Scripts\Activate.ps1` on Windows, or `source .venv/bin/activate` on macOS. Then:

```bash
python manage.py runserver 8000
```

**Terminal 2 (frontend):**

```bash
cd Desktop/for_kairos/frontend
```

```bash
npm run dev
```

Then open http://localhost:5173.

**To stop** either server, click its terminal window and press `Ctrl + C`. To leave the virtual environment, type `deactivate`.

**To reset all data** back to the original demo state, stop the backend, then (with the environment activated, in `backend/`):

```bash
python manage.py seed_demo_data --reset
```

⚠️ This deletes everything you created and reseeds the 12 demo events.

---

## 7. A guided tour of the app

### The header

- **Logo and navigation**: the links change depending on your role.
- **☀/☾ button**: switches between light, dark and system theme.
- **"Viewing as" pill**: switches role. Organisers are listed by name (*Riverside Neighbourhood Collective* is `organiser-1`, *Lantern Lane Arts Club* is `organiser-2`). **How do roles work?** at the bottom of the menu reopens the welcome dialog.

### As a Visitor

- **Discover page (`/`)**:
  - A photo hero with live numbers.
  - A scrolling "Coming up" strip.
  - Category chips, a search box and an *Upcoming only* switch. Filters are saved in the URL, so you can share a filtered link.
  - Event cards with a capacity bar: "Only 2 spots left" turns amber, and full events say "Full".
- **Event page**: click any card. The photo morphs smoothly into a large header. Here you'll find the date, time (in *your* time zone), location and description, and the **Register interest** button.
- **Registering**: you get a ticket with your reference (e.g. `REG-WRPH0N1RHA`), a confetti burst, and the spot count updates immediately. Nothing about you is stored, not even your IP address.

### As an Organiser

- **Your events (`/organiser`)**: stats (total, awaiting review, published, registrations), a status filter, and your events with their status. Hover the **?** on a status badge for an explanation.
- **New event**: fill in the title, category, capacity, date/time and location, then pick a **cover photo**. The card on the right is a live preview. Click **Submit for review**. New events are **hidden from visitors** until an admin publishes them.
- **Editing**: if you try to leave with unsaved changes, it asks first. If you lower capacity below the number already registered, the server refuses and the message appears under the capacity field.
- If an admin **requested changes**, you'll see their note. Saving your edit resubmits the event automatically.

### As an Admin

- **Review queue (`/admin`)**: pending events first, with **Publish** (asks you to confirm) and **Request changes** (lets you write a note). The row slides away the moment you confirm, and a toast message confirms it.
- **Recent activity** panel, plus the full **Activity** page: every submission, publish and registration, newest first, with a filter.
- **Public site**: what visitors see.

### Nice details to notice

- Every page has proper **loading skeletons**, **empty states** and **error messages with a Try again button**.
- Stop the backend (`Ctrl + C`) and refresh: you'll see a friendly "We're having trouble connecting" message instead of a broken page.
- It works on phones too. Make the browser narrow or open it on a phone on the same Wi-Fi (advanced).
- With *Reduce motion* turned on in your computer's accessibility settings, all the animations switch off.

---

## 8. The assignment's demo scenarios, step by step

The assignment (section 7) asks for these to be demonstrable. Reset the data first so everything matches:

```bash
python manage.py seed_demo_data --reset
```

### 7.1 Visitor workflow

1. Open http://localhost:5173 and pick **Visitor**.
2. Browse the events and try the *Arts & culture* chip.
3. Open **Community Repair Café** (18 of 20 spots taken).
4. Click **Register interest**. You get a reference, and it now shows 19/20 with "Only 1 spot left".

### 7.2 Organiser workflow

1. *Viewing as* → **Riverside Neighbourhood Collective**.
2. Click **New event**, fill it in, and **Submit for review**. It appears on *Your events* as **Pending review**.
3. *Viewing as* → **Visitor**. The new event is **not** on the Discover page.
4. Switch back to the organiser, click **Edit**, change something, and **Save changes**.

### 7.3 Admin workflow

1. *Viewing as* → **Admin**. The **Review queue** lists the pending events, including yours.
2. Click **Publish** on your event and confirm. It leaves the queue, and *Recent activity* says "Event published".
3. *Viewing as* → **Visitor**. Your event is now on the Discover page.

### 7.4 Registration rules

- **Allowed:** register for any published event with spots left (as above).
- **Rejected because not published:** as an organiser or admin, open a pending event (e.g. *Neighbourhood Seed Swap*). There's no way to register in the UI, and the API refuses with `409 EVENT_NOT_PUBLISHED`. See the `curl` example in README §7.4.
- **Rejected because full:** open **Beginners' Sourdough Workshop** (8/8). It says **Full** and offers no register button. The API refuses with `409 EVENT_FULL`.

### 7.5 Logs

Watch the **backend terminal** while you register for an event. You'll see lines like:

```text
INFO [3f2a…] apps.request: request received method=POST path=/api/v1/events/EVT-1002/registrations/
INFO [3f2a…] apps.registrations.services: event validated ... spots_before=2
INFO [3f2a…] apps.registrations.services: registration stored ... registration=REG-…
INFO [3f2a…] apps.activity.services: activity recorded kind=REGISTRATION_CREATED ...
INFO [3f2a…] apps.request: request completed ... status=201
```

The value in `[...]` is the **request ID**. It's the same on every line for one request, so you can follow it from start to finish. README §7 has `curl` versions of all of these, with real output.

---

## 9. Running the tests

In the backend terminal (environment activated, inside `backend/`):

```bash
pytest
```

You should see `135 passed`. The tests check every business rule: validation (e.g. capacity `0`, `-1`, `"5"` and `5.5` are all rejected), that visitors can't see unpublished events, that only admins can publish, that full events refuse registrations, and that no personal data is stored or logged. One test even makes **8 people try to grab the last spot at the same moment** and checks that only one succeeds.

For the frontend, there are no unit tests (the assignment says they're not required), but you can run the type checker and linter:

```bash
npm run typecheck
```

```bash
npm run lint
```

---

## 10. How the project is organised

```
for_kairos/
├── README.md               ← the official project write-up
├── GETTING_STARTED.md      ← this guide
├── docs/ARCHITECTURE.md    ← deep technical explanation and design decisions
├── backend/                ← Django (Python)
│   ├── manage.py           ← the command runner (migrate, runserver, seed_demo_data…)
│   ├── requirements*.txt   ← Python packages
│   ├── .env.example        ← example settings (copied to .env)
│   ├── config/             ← settings, URL routes, logging setup
│   └── apps/
│       ├── core/           ← shared pieces: request IDs, error format, demo roles, permissions
│       ├── events/         ← events: model, rules, API, seed data command
│       ├── registrations/  ← anonymous registrations and the "last spot" locking
│       └── activity/       ← the activity feed ("Event EVT-1013 was published.")
└── frontend/               ← React (TypeScript)
    ├── package.json        ← JavaScript packages and scripts
    ├── vite.config.ts      ← dev server, including forwarding /api to the backend
    └── src/
        ├── app/            ← page layout, header, routes
        ├── components/     ← reusable UI (buttons, dialogs, toasts) and animation helpers
        ├── features/       ← one folder per area: events, registrations, organiser, admin, role, theme
        ├── lib/api/        ← the code that talks to the backend
        ├── assets/covers/  ← the 15 event photos (+ CREDITS.md)
        └── styles/         ← colours, fonts and other design settings (tokens.css)
```

Inside each backend app the files always play the same parts:

| File | Job |
| --- | --- |
| `models.py` | The database tables |
| `services.py` | Anything that **changes** data, plus the business rules |
| `selectors.py` | Anything that **reads** data, including who's allowed to see what |
| `serializers.py` | Checks the shape of incoming data and formats outgoing JSON |
| `views.py` | The API endpoints. Deliberately thin: check the input, call a service, return the result |
| `tests/` | The automated tests |

---

## 11. How it works, in plain English

**When you click "Register interest":**

1. The website sends `POST /api/v1/events/EVT-1002/registrations/` to the backend. It attaches your demo role and a random **request ID** in the headers.
2. Django checks the role and calls the `register_interest` service.
3. The service **locks** the database, then checks that the event exists, is published, hasn't started, and still has space. If any check fails, it replies with a clear error such as `EVENT_FULL`.
4. If all is well, it saves a registration (just a random reference, the event and the time) and an activity entry, then unlocks.
5. The website shows your ticket and updates the numbers.

**Why the lock?** If two people click for the last spot at exactly the same moment, both could otherwise see "1 left" and both get in. The lock makes the second one wait a split second, see "0 left", and get a polite "this event is full" instead.

**Errors** always come back in the same shape:

```json
{"code": "EVENT_FULL", "message": "Registration is no longer available because this event is full.", "request_id": "…"}
```

They never include technical details. The website turns each `code` into a friendly message.

**Roles** are sent as headers (`X-Demo-Role: admin`). The backend really enforces them (an organiser can't publish), but anyone could fake the header. That's fine for a demo, and the README says so openly. Real login could be swapped in later without changing the rules.

**Photos** are bundled with the app (no uploads). An event stores just the photo's name, e.g. `"sourdough"`.

For the complete version, with diagrams, read `docs/ARCHITECTURE.md`.

---

## 12. Common changes you might want to make

> After changing **frontend** files, the browser updates by itself. After changing **backend** Python files, `runserver` restarts by itself; if not, press `Ctrl + C` and run it again.

| I want to… | Do this |
| --- | --- |
| Change the demo events | Edit `SEED_EVENTS` (and `SEED_COVERS`) in `backend/apps/events/management/commands/seed_demo_data.py`, then run `python manage.py seed_demo_data --reset` |
| Rename or add demo organisers | Edit `DEMO_ORGANISERS` in `backend/apps/core/demo.py` (events refer to them by id, e.g. `organiser-1`) |
| Change the accent colour or other colours | Edit the variables in `frontend/src/styles/tokens.css` (the `:root` block is light mode, `[data-theme="dark"]` is dark mode) |
| Change the homepage text | `frontend/src/features/events/components/DiscoverHero.tsx` |
| Change error messages shown to users | `frontend/src/lib/errors.ts` |
| Add a cover photo | Add `name-800.webp` and `name-1600.webp` to `frontend/src/assets/covers/`, add an entry to `COVERS` in `frontend/src/features/events/covers.ts`, add the same key to `CoverImage` in `backend/apps/events/models.py`, then run `python manage.py makemigrations` and `python manage.py migrate` |
| See the database contents | Use http://localhost:8000/api/docs/ (click **Authorize** to set a role), or open `backend/db.sqlite3` with a free tool such as *DB Browser for SQLite* |

If you change backend behaviour, run `pytest` afterwards to make sure nothing broke.

---

## 13. Troubleshooting

| Problem | Fix |
| --- | --- |
| `python` / `py` is not recognised (Windows) | Python isn't installed or wasn't added to PATH. Reinstall it and tick **"Add python.exe to PATH"**, then open a **new** terminal |
| `py -3.12` says no such version | Use the version you have, e.g. `py -3.13 -m venv .venv`. Check with `py --list` |
| `command not found: python` (macOS) | Use `python3` instead of `python` when creating the venv. After activating, `python` works |
| *"running scripts is disabled on this system"* | Run `Set-ExecutionPolicy -Scope Process -ExecutionPolicy RemoteSigned`, then activate again |
| `No module named django` | The virtual environment isn't active. Activate it (you should see `(.venv)`), then retry. If it still fails, run `pip install -r requirements-dev.txt` |
| `no such table: events_event` | You skipped the migration step. Run `python manage.py migrate` then `python manage.py seed_demo_data` |
| "Demo data already present; nothing to do" | That's fine, the data is already there. Use `--reset` to start over |
| `Error: That port is already in use` (backend) | Another program is using port 8000. Either close it, or run `python manage.py runserver 8001` **and** create `frontend/.env` containing `VITE_API_PROXY_TARGET=http://127.0.0.1:8001`, then restart `npm run dev` |
| `Port 5173 is already in use` (frontend) | An old `npm run dev` is still running somewhere. Close that terminal, or press `Ctrl + C` in it |
| `npm` is not recognised | Install Node.js (§2.4) and open a new terminal |
| `npm ci` complains about the Node version | Install the current Node LTS from https://nodejs.org (20.19+ or 22.12+ is needed) |
| Website says **"We're having trouble connecting"** | The backend isn't running. Start it (§4.8) and click **Try again** |
| The page is blank | Check the frontend terminal for a red error, and make sure you opened http://localhost:5173, not port 8000 |
| Welcome dialog doesn't show again | It only shows on the first visit. Reopen it from *Viewing as* → **How do roles work?** |
| I want to start completely fresh | Stop both servers, delete `backend/db.sqlite3`, then run `python manage.py migrate` and `python manage.py seed_demo_data` |

If something else goes wrong, the **backend terminal** usually says why. Error screens in the app also show a **Reference**, which matches the `[request id]` in the backend logs.

---

## 14. Putting it on your own GitHub

You can copy it to your own account in two ways.

**Option A: Fork (easiest).** Open https://github.com/vysanchellan/for_kairos, click **Fork** (top right), then **Create fork**. You now have your own copy at `github.com/<your-username>/for_kairos`. Rename it under *Settings* if you like. Clone your fork instead of the original from then on.

**Option B: A fresh repo with the full history.**

1. On GitHub, click **+** → **New repository**, give it a name, and leave it **empty** (no README, no .gitignore).
2. In your terminal, inside the project folder you cloned, run:

```bash
git remote set-url origin https://github.com/<your-username>/<your-repo>.git
```

```bash
git push -u origin main
```

GitHub may ask you to sign in; a browser window usually opens for that.

**What never gets uploaded:** `.venv/`, `node_modules/`, `db.sqlite3`, `.env` and build output are all excluded by `.gitignore`. That's correct and intentional. Anyone who clones the repo recreates them with the steps above.

---

## 15. Putting it online (optional)

Running it locally (as above) is all that's needed for a demo or an assessment. If you later want a public link:

- **The frontend** (`frontend/`) can go on Vercel, Netlify or any static host as-is (`npm run build` produces `frontend/dist/`).
- **The backend** needs a host that can run Python **and** keep data. SQLite doesn't work on Vercel, because its servers can't save files permanently, so either:
  - run Django on Vercel too, but switch the database to **Postgres** (e.g. a free Neon database). That needs a small config change: a `vercel.json`, plus reading a `DATABASE_URL` in `backend/config/settings.py`. Or
  - host the backend on a Python-friendly service such as Render, Railway or Fly.io, and point the frontend's `/api` at it.

The code is ready for this (the locking also works properly on Postgres), but it isn't set up yet. Ask Vysan, and it can be added.

---

## 16. Before you submit it anywhere

1. **Write the AI-use declaration.** README §10 has a clearly marked **TODO**. The assignment asks you to say, in your own words, which AI tools were used, how they were used, and what you personally reviewed, changed and tested. Please write that part yourself.
2. **Read `README.md` and `docs/ARCHITECTURE.md`.** The assignment says *"Do not submit code you cannot explain."* The architecture guide is written to prepare you for "why did you do it this way?" questions: there's a section on every design decision and a glossary.
3. **Do a final run-through:** reset the data, follow §8, and run `pytest`.
4. The assignment PDF itself is **not** in the repo on purpose (it's the assessor's document).

---

## 17. Glossary

| Term | Meaning |
| --- | --- |
| **API** | The backend's set of web addresses (like `/api/v1/events/`) that the website calls to get or change data |
| **Backend / frontend** | The server program that stores data and applies rules / the website you see in the browser |
| **Clone** | Download a copy of a Git repository, including its history |
| **Django / DRF** | The Python web framework used for the backend / its add-on for building APIs |
| **`.env` file** | A local settings file that isn't uploaded to GitHub |
| **Localhost** | Your own computer. `http://localhost:5173` means "a website running on this machine, on port 5173" |
| **Migration** | A script that creates or updates the database tables to match the code |
| **npm** | Node's package manager. It downloads the JavaScript libraries the frontend uses |
| **Port** | A numbered "door" on your computer. The backend uses 8000, the frontend 5173 |
| **React / Vite / Tailwind** | The UI library / the fast dev server and bundler / the styling system |
| **Request ID** | A random code attached to every request, so its log lines can be found together |
| **Seed data** | Fictional demo content loaded into the database |
| **SQLite** | A database stored in a single file (`db.sqlite3`); no separate database server is needed |
| **Terminal** | The text window where you type commands (PowerShell on Windows, Terminal on macOS) |
| **Virtual environment (`.venv`)** | A private folder of Python packages just for this project |

Have fun with it! 🙂

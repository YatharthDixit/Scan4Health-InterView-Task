# Scan4Health Intake Queue

Full-stack take-home for the ScanOS intake queue assignment. The app models a diagnostic center front-desk workflow where staff triage patient intake submissions before care.

The implementation prioritizes the core grading signal from the brief: the status state machine is enforced on the backend, surfaced clearly to the frontend, and protected against invalid or stale writes.

## Project Links

- Repository: [YatharthDixit/Scan4Health-InterView-Task](https://github.com/YatharthDixit/Scan4Health-InterView-Task)
- Live deployment: [scan4health.yath.dev](https://scan4health.yath.dev)
- CI/CD: GitHub Actions runs checks, builds Docker images, publishes them to GitHub Container Registry, and deploys to a VPS on `main`.

## Stack

- Backend: Django 5.2, Django REST Framework, SQLite
- Frontend: Next.js 16 App Router, TypeScript, TanStack Query, Tailwind CSS v4, Zod
- Tests: pytest + pytest-django, ESLint, TypeScript, Next production build

## Features

- Paginated queue of submissions, newest first
- Status filters for `new`, `in_review`, `approved`, and `rejected`
- Search by patient name
- Age-group, date-range, and sort controls
- Detail side panel that preserves queue context
- Status transitions that only show valid next actions
- Optimistic UI with rollback/refetch on server errors
- Audit timeline for status changes
- Review notes/comments on each submission
- Create-new-inbound flow
- Loading, error, empty, and terminal-state UI
- Seed command with realistic example submissions

## Status Rules

Allowed transitions are deliberately small:

```text
new -> in_review
in_review -> approved
in_review -> rejected
```

All other transitions are rejected with a structured API error. The frontend never duplicates these rules; it renders actions from the backend-provided `allowed_transitions` field.

## Run Locally

Use two terminals.

### Backend

```bash
cd backend

# Create and activate an isolated Python environment.
python -m venv .venv
source .venv/bin/activate

# Install Django, DRF, CORS support, and test dependencies.
pip install -r requirements.txt

# Apply database schema changes, including the review-comment table.
python manage.py migrate

# Load realistic demo/template data so the queue is useful immediately.
# --force resets existing submissions first; omit it to keep existing data.
python manage.py seed_submissions --force

# Start the API at http://localhost:8000/api.
python manage.py runserver 8000
```

Backend defaults are fine for local development. Optional values are documented in `backend/.env.example`.

### Frontend

```bash
cd frontend

# Install Next.js, React, TanStack Query, Zod, and frontend tooling.
npm install

# Start the web app at http://localhost:3000.
npm run dev
```

Open `http://localhost:3000`.

The frontend defaults to `http://localhost:8000/api` for local review, so no
frontend env file is required unless the API is running somewhere else. Override
with `NEXT_PUBLIC_API_URL`; see `frontend/.env.example`.

### Docker

Docker is optional; the plain local commands above are still the simplest way to review the code.

```bash
# Build and start backend + frontend containers.
# The backend container runs migrations and seeds demo data on first start.
docker compose up --build
```

Open `http://localhost:3000`.

The local Docker setup uses:

- `backend/Dockerfile`: Python runtime, migrations, optional seed, Gunicorn on port `8000`
- `frontend/Dockerfile`: Next.js standalone production build on port `3000`
- `compose.yaml`: local two-service stack with a persistent SQLite volume

## API Overview

| Method | Path | Purpose |
| --- | --- | --- |
| `GET` | `/api/submissions/` | List submissions with pagination/filter/search/sort |
| `POST` | `/api/submissions/` | Create a new inbound submission |
| `GET` | `/api/submissions/{id}/` | Retrieve detail, events, and review notes |
| `POST` | `/api/submissions/{id}/transition/` | Move to a valid next status |
| `POST` | `/api/submissions/{id}/comments/` | Add a review note |

List query params:

```text
status=new|in_review|approved|rejected
search=<patient name>
age_group=pediatric|adult|senior
date_from=YYYY-MM-DD
date_to=YYYY-MM-DD
sort=newest|oldest|patient|age_desc|age_asc
page=<number>
page_size=<number>
```

Every deliberate API error uses one envelope:

```json
{
  "error": {
    "code": "invalid_transition",
    "detail": "Cannot move submission from 'approved' to 'in_review'.",
    "extra": {
      "current_status": "approved",
      "allowed_transitions": []
    }
  }
}
```

## Key Design Decisions

The finite-state machine lives in one place: `backend/submissions/constants.py`. The model, service, serializers, tests, and frontend behavior all derive from that source.

Status changes are an action, not a generic field update. There is no writable `status` serializer path and no generic `PATCH`/`PUT` endpoint, so callers cannot bypass transition validation.

All write logic for status changes lives in `backend/submissions/services.py`. The service validates unknown statuses before database work, locks/compares the current status inside a transaction, writes a `StatusEvent`, and returns fresh state.

The transition service uses `select_for_update()` plus a compare-and-swap update. SQLite does not provide the same row-lock behavior as Postgres, so the compare-and-swap protects the important stale-write edge locally as well.

The frontend treats the API contract as runtime data. Zod validates successful responses, TanStack Query owns server state, and mutations update the detail/list caches while still settling from server truth.

The detail view is a side panel because triage is a rapid queue workflow. Staff can inspect, act, close, and keep their list/filter context.

Design tokens are centralized in `frontend/src/app/globals.css`. Components use semantic token classes such as `bg-surface-muted`, `text-danger`, and `border-line` rather than raw palette colors.

## Verification

Backend:

```bash
cd backend

# Run the backend test suite, including transition-rule and API-contract tests.
.venv/bin/python -m pytest -q

# Ask Django to validate settings, app config, models, URLs, and checks.
.venv/bin/python manage.py check

# Confirm model changes are fully represented by committed migrations.
.venv/bin/python manage.py makemigrations --check --dry-run
```

Frontend:

```bash
cd frontend

# Run ESLint over the Next.js/TypeScript app.
npm run lint

# Compile a production build. Webpack is used because some sandboxes block
# Turbopack helper processes that bind local ports.
npx next build --webpack

# Run TypeScript's type checker without emitting files.
npx tsc --noEmit
```

`next build --webpack` is used for verification because Turbopack may try to spawn a local helper process that binds a port in restricted sandboxed environments.

## CI and VPS Deployment

GitHub Actions are included in `.github/workflows`. The repository is set up
for CI/CD: code pushed to `main` is checked, packaged into Docker images, pushed
to GitHub Container Registry, and deployed to the VPS serving
`https://scan4health.yath.dev`.

`ci.yml` runs on pushes and pull requests:

- backend tests
- Django system checks
- migration drift check
- frontend lint
- frontend production build
- TypeScript type check

`deploy.yml` runs on pushes to `main` and can also be triggered manually from
the GitHub Actions tab. It builds backend/frontend Docker images, pushes them to
GitHub Container Registry, copies `docker-compose.prod.yml` to a VPS, writes the
runtime `.env`, and runs `docker compose up -d`.

Required GitHub secrets:

```text
VPS_HOST=<server ip or hostname>
VPS_USER=<ssh user>
VPS_SSH_KEY=<private ssh key with access to the server>
VPS_APP_DIR=/home/yath/scan4health
DJANGO_SECRET_KEY=<strong secret>
DJANGO_ALLOWED_HOSTS=your-domain.example,<server ip>
FRONTEND_ORIGIN=https://your-domain.example
```

Keep one-line secrets such as `VPS_HOST`, `VPS_USER`, and `VPS_APP_DIR` free of
extra newlines or spaces. `VPS_SSH_KEY` is the one expected multiline value.

Optional GitHub secrets:

```text
BACKEND_PORT=8000
FRONTEND_PORT=3000
SEED_DEMO_DATA=false
```

Optional GitHub repository variable:

```text
NEXT_PUBLIC_API_URL=https://your-domain.example/api
```

The deploy workflow falls back to same-origin `/api`, which is the expected
setup when Nginx serves the frontend and proxies `/api/` to Django on one
domain. Set `NEXT_PUBLIC_API_URL` only if the frontend and API are hosted on
different public origins.

The VPS must already have Docker and the Docker Compose plugin installed. TLS and reverse proxying are intentionally left to the server owner; a common setup is Nginx or Caddy forwarding `/api` to the backend port and the root path to the frontend port.

## Deliberate Scope

- No authentication or staff identity; the assignment did not require auth, and adding it would distract from the state-machine core.
- No realtime updates; TanStack Query refetching and server-side conflict handling cover the current workflow.
- No generic admin CRUD; status movement is intentionally constrained to the transition action.

## What I Would Add Next

- Reviewer identity from auth instead of a free-text note author
- Rejection reason as a required field for `in_review -> rejected`
- Server-side ordering/filter tests around larger datasets
- A small Playwright smoke test for create, review, approve/reject, and comments

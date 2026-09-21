# Deployment Guide

The README covers local development. This document covers what changes for a
real deployment. Package installation, lint, automated tests, Prisma Client
generation, and source builds were verified on 2026-09-21. The Docker stack
and a live PostgreSQL/browser deployment still require an environment-level
smoke test.

## 1. Architecture

```
Internet → [TLS-terminating reverse proxy] → frontend (static files, nginx)
                                            → backend API (Node/Express, port 4000)
                                            → PostgreSQL (private network only)
```

The backend should **never** be directly internet-facing. Put a reverse
proxy (nginx, Caddy, or a managed load balancer) in front of it for TLS
termination, and keep PostgreSQL on a private network/VPC with no public
IP.

## 2. Docker Compose (single-server deployment)

`docker-compose.yml` in the repo root builds and runs Postgres, the backend,
and the frontend together. For production use:

1. Replace the placeholder JWT secrets with real generated values (see the
   README) and pass them as environment variables rather than committing
   them:
   ```bash
   export JWT_ACCESS_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
   export JWT_REFRESH_SECRET=$(node -e "console.log(require('crypto').randomBytes(48).toString('hex'))")
   docker compose up -d
   ```
2. Set `NODE_ENV=production`; the backend then forces secure cookies. Use
   `COOKIE_SAME_SITE=none` when frontend and API use different origins, or
   `lax` when they share a site. Set `COOKIE_DOMAIN` only when a shared parent
   domain is required—never set it to `localhost` in production.
3. Set real `SMTP_*` values so password resets and staff welcome emails
   actually deliver — see `.env.example`. Without these, the app still
   works, but reset links only ever appear in the backend container logs.
4. Set backend `APP_ORIGINS` to the exact comma-separated trusted frontend
   origins and point frontend `VITE_API_URL` at the public backend URL. Keep
   `FRONTEND_URL` set to the primary frontend URL for reset/welcome links.
5. Don't rely on the compose file's inline `migrate deploy && db seed`
   command for a real database you care about — seeding creates demo
   accounts with a known password. Run migrations as a separate one-off
   step and skip seeding (or seed only once, on an empty database, and
   then disable the demo accounts).

### Render backend + Vercel frontend

The server binds to `0.0.0.0` and honors Render's injected `PORT`. For a
typical split deployment, configure:

```dotenv
# Backend (Render)
NODE_ENV=production
APP_ORIGINS=https://your-app.vercel.app
FRONTEND_URL=https://your-app.vercel.app
COOKIE_SAME_SITE=none

# Frontend (Vercel build variable)
VITE_API_URL=https://your-api.onrender.com/api
```

The included `frontend/vercel.json` rewrites unknown paths to `index.html`,
so bookmarked routes and notification deep links resolve through the SPA.
After changing either origin, update both environment configurations and
redeploy; the CORS allowlist uses exact origins.

## 3. Reverse proxy (nginx example)

If you're not using the frontend container's built-in nginx as the public
edge, put a proxy in front of both services:

```nginx
server {
    listen 443 ssl http2;
    server_name your-domain.example;

    ssl_certificate     /etc/letsencrypt/live/your-domain.example/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.example/privkey.pem;

    location /api/ {
        proxy_pass http://backend:4000/api/;
        proxy_set_header Host $host;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }

    location / {
        proxy_pass http://frontend:80/;
        proxy_set_header Host $host;
    }
}

server {
    listen 80;
    server_name your-domain.example;
    return 301 https://$host$request_uri;
}
```

Use [Certbot](https://certbot.eff.org/) or your platform's managed
certificate service for TLS certs — don't hand-roll certificate renewal.

The backend reads the client IP from `X-Forwarded-For` for audit logging
(`getClientIp` in `audit.service.ts`); make sure your proxy sets that header
and that nothing between the proxy and the backend strips it.

## 4. Database

- Use a managed Postgres service (RDS, Cloud SQL, Supabase, Neon, etc.) in
  production rather than the bundled Docker container — you want automated
  backups and point-in-time recovery for patient data.
- Run `npx prisma migrate deploy` (not `migrate dev`) against production —
  `migrate dev` can prompt interactively and isn't meant for non-dev
  environments.
- Take the audit trail seriously: `AuditLog` rows should never be deletable
  by the application itself, and backups should cover this table with the
  same retention as clinical data.

## 5. Secrets management

`.env` files are fine for local development but shouldn't be how secrets
reach a production server. Use your platform's secret manager (AWS Secrets
Manager, GCP Secret Manager, Doppler, etc.) or at minimum injected
environment variables from your deployment platform (Fly.io, Render,
Railway, etc.) rather than a checked-in or manually-copied `.env` file on
the server.

Rotate `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` periodically; rotating
invalidates all existing sessions, so plan for that (e.g. rotate during a
maintenance window, or accept everyone gets logged out).

## 6. Things this project does not yet handle

Being direct about what's still missing for a genuinely production-grade
deployment:

- **No automated backups configuration** — set these up at the database
  provider level.
- **No horizontal scaling guidance** — the backend is stateless (JWT-based
  auth, no in-memory session store), so it should scale horizontally behind
  a load balancer without code changes, but this hasn't been tested under
  load.
- **Dependency checks are not a full security audit** — GitHub Actions runs
  production `npm audit` checks and Dependabot proposes weekly updates, but a
  healthcare deployment still needs professional penetration testing and a
  documented vulnerability-response process.
- **No log aggregation** — `morgan` logs to stdout; pipe that into your
  platform's log collector (CloudWatch, Datadog, etc.) rather than reading
  container logs by hand in production.
- **No health-check-based auto-restart wiring** beyond the `/api/health`
  endpoint existing — your orchestrator (Docker Swarm, Kubernetes, or your
  PaaS) needs to be configured to actually poll it.

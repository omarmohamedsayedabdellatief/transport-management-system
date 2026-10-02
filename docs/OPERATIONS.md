# Deployment, verification, and recovery

## Local configuration

Keep secrets in `server/.env`, never in committed files. A reference is provided in `server/.env.example`. The local setup uses PostgreSQL bound to loopback on port 55432 and local-only development trust authentication. API port 5001 avoids the macOS AirPlay service on port 5000. Vite proxies `/api` to port 5001 and is bound to loopback by the launcher.

`npm run dev` starts the API watcher and Vite, and starts an existing `.local/postgres` cluster if its PostgreSQL tools are available. `npm run build` verifies both TypeScript projects and generates the production assets. Use `npm run db:deploy` for versioned schema updates. Do not use `db push` to update an established production database.

## Existing databases

This checkout's original local database was backed up, baselined with `202609260001_baseline`, and upgraded using the subsequent migrations. On a fresh database, `prisma migrate deploy` applies all migrations. An existing database with the old schema must first be backed up and compared against the baseline before marking that migration applied. Never mark a migration applied just to bypass a schema mismatch. Historical legacy trips created before the new workflow have zero/default billing snapshots and require explicit reconciliation before automated billing.

## Container deployment

A Dockerfile and Compose configuration are included. The container path has not been executed on this host because Docker is unavailable. The local Node/PostgreSQL path was tested.

Provide `POSTGRES_PASSWORD`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, and `CLIENT_ORIGIN` in an untracked root `.env` or the deployment environment. Use randomly generated secrets of at least 32 characters. A hexadecimal database password avoids URL-encoding issues in the example connection string. Set the origin to the actual HTTPS site.

```sh
docker compose up --build -d
```

The app binds to host loopback port 5001. Put an HTTPS reverse proxy in front of it for external access. PostgreSQL is not published to the host. The app serves the built frontend and API on the same origin. `/health` checks the process; `/ready` also checks the database.

Create a unique administrator with `prisma/create_admin.ts` using private environment variables `ADMIN_EMAIL`, `ADMIN_PASSWORD`, and optional `ADMIN_NAME`; do not load demo seeds. Supply these variables to a one-off container process with your deployment's secret mechanism and execute `npm run admin:create` from `/app/server`.

The login limiter is per process, suitable for a single-instance pilot. A multi-instance rollout requires a shared limiter/session policy and load testing. There is no background notification delivery or GPS ingestion configured.

## Backups

For the configured local demo, a backup can be made without printing credentials:

```sh
/usr/local/opt/postgresql@17/bin/pg_dump \
  -h 127.0.0.1 -p 55432 -U tms_local -Fc tms_db \
  -f .local/backups/on-time-backup.dump
```

Adjust the binary path on Apple Silicon or other operating systems. For hosted PostgreSQL, use the platform's protected credentials and backup mechanism. Keep encrypted copies outside the server and define retention/recovery targets with the business. Do not commit database dumps.

Test restoration into a new, empty database, never over the running application's database:

```sh
createdb -h 127.0.0.1 -p 55432 -U tms_local tms_restore_test
pg_restore -h 127.0.0.1 -p 55432 -U tms_local \
  --no-owner --exit-on-error -d tms_restore_test .local/backups/on-time-backup.dump
```

Compare passenger, trip, document, and payment counts and inspect representative records. Point a separate non-production application instance at the restored database to test access. A backup that has not been restored is not a verified recovery procedure.

## Release checks

- Build server and client.
- Deploy migrations to a dedicated `_test` database and run `TEST_DATABASE_URL=... npm test`. This suite clears that database's application tables.
- Exercise setup, trip generation, attendance, billing, and scoped portal access with representative records.
- Check Arabic/English, narrow screens, keyboard navigation, and the in-app guide.
- Reconcile opening balances and historical spreadsheets separately. Destructive legacy workbook import is disabled.
- Review actual contracts, payment recipients, monthly rate rules, tax treatment, and audit requirements before a client pilot.
- Test backup restoration and document who operates it.

## Current product boundaries

Automated operational billing supports fixed monthly and per-trip contracts. Monthly billing requires at least one completed service in the month and does not prorate automatically. Supplier cost is a per-trip amount saved on the trip. Multiple suppliers sharing one trip's cost, versioned supplier contracts, credit notes/refunds, automatic statutory tax calculation, government invoice submission, direct bank payments, GPS, optimized routing, offline sync, and message delivery are outside this release. Existing fleet reports and new operational/financial balances are available; a complete consolidated accounting ledger is not implemented.

The in-app manual describes these boundaries where they affect a user's action. Keep this document and `/guide` updated when those capabilities are implemented.

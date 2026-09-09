# ANSTAY Villa Ops

MVP v0.3 for multi-villa operations.

## Modules
- Dashboard & monthly forecast
- CRM / lead pipeline
- Booking calendar with overlap protection
- Housekeeping / operations tasks
- Employees & attendance (GPS prototype)
- Inventory & stock movements
- Finance / invoice status / payable tracking
- Villa contracts and monthly P&L
- JSON backup / restore

## Seeded villa rules
- Nhàn: revenue share 50/50, room revenue only; other revenue excluded from share.
- SOL: fixed rent 50,000,000 VND/month net.
- Nắng: fixed rent 25,000,000 VND/month net.
- SAM, Gió, Tim: owned.

## Backend
A Neon Postgres project named `anstay-villa-ops` has been created. Schema is stored in `docs/schema.sql`.
The v0.3 UI intentionally uses browser localStorage until server-side credentials/auth are wired through Vercel environment variables. Do not expose database credentials in client-side code.

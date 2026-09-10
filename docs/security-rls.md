# ANSTAY v0.5 — Security & RLS

Production uses Neon Auth + Neon Data API. Anonymous access to public business tables and sequences is revoked. Authenticated access is then restricted by PostgreSQL Row Level Security.

## Application roles
- admin: full operational access
- sales: CRM, customers, bookings, booking payments
- ops: bookings, housekeeping, employees, shifts, attendance, stock
- housekeeping: housekeeping tasks and attendance
- stock: inventory and stock movements
- accounting: finance, settlements, booking payments, financial reads
- employee: own attendance / own adjustment requests

`app_user_profiles` links a Neon Auth user ID to an ANSTAY employee and application role. The first administrator is already mapped to employee `ADM001`.

## Attendance
Production check-in/check-out uses PostgreSQL RPC functions. Employee identity is resolved from the authenticated user and timestamps come from PostgreSQL `now()`, not the browser clock. GPS coordinates are submitted with the RPC. Only one open attendance shift per employee is allowed.

Attendance correction requests are inserted as `pending`. Admin/ops can approve or reject them.

## Booking
Database triggers prevent overlapping active bookings for the same villa and synchronize housekeeping tasks from booking lifecycle changes.

## Important
No database password or privileged `DATABASE_URL` is shipped to the browser. The frontend uses Neon Auth tokens and the Data API; PostgreSQL RLS remains the enforcement layer.

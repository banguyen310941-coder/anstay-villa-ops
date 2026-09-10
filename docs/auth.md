# Authentication architecture

ANSTAY Villa Ops uses Neon Auth backed by Better Auth.

Production origin:
- https://anstay-villa-ops.vercel.app

Current status:
- Neon Auth provisioned on production database branch.
- Email/password enabled.
- Production origin added to trusted origins.
- Initial admin user provisioned and assigned `admin` role.
- Frontend v0.4 includes sign-in, sign-out, password-reset request, reset-password handling, and a clearly separated local demo mode.

Next security milestone:
1. Provision Data API with Neon Auth JWT verification.
2. Create explicit Postgres application roles.
3. Enable RLS on operational tables.
4. Add policies by app role and villa scope.
5. Remove local-demo writes from production mode after server sync is validated.

No credentials are committed to GitHub.

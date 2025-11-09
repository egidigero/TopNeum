# Database scripts for TopNeum

This folder contains SQL scripts to create the database schema, views and seed data used by the app.

Important: there are multiple `scripts/00X` files. Run them with care and in order.

Recommended order (for a fresh database):

1. `001-create-schema.sql`  — creates users, productos, tarifas, leads_whatsapp, pedidos, pagos, pedido_items, etc.
2. `002-create-pricing-view.sql` — creates a pricing view used by the app
3. `003-seed-data.sql` — basic seed (admin user, sample tarifa, sample productos, sample lead)

Files we added later (do not run unless you know what you're doing):
- `004-create-products.sql` — alternate `products` table (different schema). This is an alternative design; do NOT run it if you intend to use the existing `productos` schema.
- `005-grants-for-n8n.sql` — helper to create a read-only role for n8n (contains placeholders; edit before running).

Quick run (psql required)

# PowerShell example — set your connection string in the NEON_NEON_DATABASE_URL env var
$env:NEON_NEON_DATABASE_URL = "postgresql://<user>:<password>@<host>:<port>/<database>?sslmode=require"
psql $env:NEON_NEON_DATABASE_URL -f "${PWD}\scripts\001-create-schema.sql"
psql $env:NEON_NEON_DATABASE_URL -f "${PWD}\scripts\002-create-pricing-view.sql"
psql $env:NEON_NEON_DATABASE_URL -f "${PWD}\scripts\003-seed-data.sql"

# Remove the env var after
Remove-Item Env:NEON_NEON_DATABASE_URL

Notes & troubleshooting
- If you're using Neon Cloud, you can run the SQL in the Neon Console instead of psql.
- The schema uses `uuid-ossp` and `uuid_generate_v4()`; the script creates the extension.
- The seed contains placeholder hashed passwords for testing. Replace them for production.
- Do NOT run `004-create-products.sql` if you want the `productos` table used by the app.

How the app connects
- The app expects the environment variable `NEON_NEON_DATABASE_URL` to be set (see `lib/db.ts`).
- For local development, copy `.env.local.example` to `.env.local` and fill the connection string.

Start the dev server
After running the migration scripts and setting `.env.local`, run:

npm run dev

or

pnpm dev

If the app fails to connect, check the connection string and network/firewall rules and make sure your DB accepts connections from your machine.

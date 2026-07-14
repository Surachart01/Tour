Database data export
Created: 2026-07-14T14:41:35.070Z

This export contains data only. Prisma schema/migrations should be applied to the new database first.

Restore example:
  cd backend-express
  DATABASE_URL='postgresql://...' node scripts/import-database-data.js ../database-exports/<folder>/manifest.json

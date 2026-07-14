import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");
const repoRoot = path.resolve(backendRoot, "..");

dotenv.config({ path: path.join(backendRoot, ".env") });

const prisma = new PrismaClient();

function toClientKey(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function serializeValue(value) {
  if (typeof value === "bigint") return value.toString();
  if (value instanceof Date) return value.toISOString();
  if (value && typeof value === "object" && value.constructor?.name === "Decimal") {
    return value.toString();
  }
  return value;
}

async function main() {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
  const exportDir = path.join(repoRoot, "database-exports", timestamp);
  const tablesDir = path.join(exportDir, "tables");
  await fs.mkdir(tablesDir, { recursive: true });

  const manifest = {
    exported_at: new Date().toISOString(),
    source: "prisma-json-export",
    tables: [],
  };

  for (const model of Prisma.dmmf.datamodel.models) {
    const clientKey = toClientKey(model.name);
    if (!prisma[clientKey]?.findMany) {
      console.warn(`Skipping ${model.name}: Prisma delegate not found`);
      continue;
    }

    const rows = await prisma[clientKey].findMany();
    const fileName = `${model.name}.json`;
    await fs.writeFile(
      path.join(tablesDir, fileName),
      JSON.stringify(rows, (_key, value) => serializeValue(value), 2)
    );

    manifest.tables.push({
      model: model.name,
      db_name: model.dbName || model.name,
      file: `tables/${fileName}`,
      rows: rows.length,
    });
    console.log(`${model.name}: ${rows.length} rows`);
  }

  await fs.writeFile(
    path.join(exportDir, "manifest.json"),
    JSON.stringify(manifest, null, 2)
  );

  await fs.writeFile(
    path.join(exportDir, "README.txt"),
    [
      "Database data export",
      `Created: ${manifest.exported_at}`,
      "",
      "This export contains data only. Prisma schema/migrations should be applied to the new database first.",
      "",
      "Restore example:",
      "  cd backend-express",
      "  DATABASE_URL='postgresql://...' node scripts/import-database-data.js ../database-exports/<folder>/manifest.json",
      "",
    ].join("\n")
  );

  console.log(`\nExport completed: ${exportDir}`);
}

main()
  .catch((error) => {
    console.error("Export failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

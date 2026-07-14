import fs from "fs/promises";
import path from "path";
import { fileURLToPath } from "url";
import dotenv from "dotenv";
import { Prisma, PrismaClient } from "@prisma/client";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const backendRoot = path.resolve(__dirname, "..");

dotenv.config({ path: path.join(backendRoot, ".env") });

const prisma = new PrismaClient();

function toClientKey(modelName) {
  return modelName.charAt(0).toLowerCase() + modelName.slice(1);
}

function getPrimaryKeyField(modelName) {
  const model = Prisma.dmmf.datamodel.models.find((item) => item.name === modelName);
  return model?.fields.find((field) => field.isId)?.name || "id";
}

function deserializeRow(row) {
  const result = {};
  for (const [key, value] of Object.entries(row)) {
    result[key] = value;
  }
  return result;
}

function orderTablesByDependencies(tables) {
  const tableModels = new Set(tables.map((table) => table.model));
  const modelMeta = new Map(
    Prisma.dmmf.datamodel.models.map((model) => [model.name, model])
  );
  const dependencies = new Map();

  for (const table of tables) {
    const model = modelMeta.get(table.model);
    const deps = new Set();

    for (const field of model?.fields || []) {
      if (
        field.kind === "object" &&
        field.relationFromFields?.length &&
        tableModels.has(field.type) &&
        field.type !== table.model
      ) {
        deps.add(field.type);
      }
    }

    dependencies.set(table.model, deps);
  }

  const ordered = [];
  const remaining = new Map(tables.map((table) => [table.model, table]));

  while (remaining.size) {
    const ready = [...remaining.values()].find((table) =>
      [...(dependencies.get(table.model) || [])].every((dep) => !remaining.has(dep))
    );

    if (!ready) {
      const [first] = remaining.values();
      ordered.push(first);
      remaining.delete(first.model);
      continue;
    }

    ordered.push(ready);
    remaining.delete(ready.model);
  }

  return ordered;
}

async function main() {
  const manifestArg = process.argv[2];
  if (!manifestArg) {
    throw new Error("Usage: node scripts/import-database-data.js <path-to-manifest.json>");
  }

  const manifestPath = path.resolve(process.cwd(), manifestArg);
  const exportDir = path.dirname(manifestPath);
  const manifest = JSON.parse(await fs.readFile(manifestPath, "utf8"));

  const orderedTables = orderTablesByDependencies(manifest.tables);

  for (const table of orderedTables) {
    const clientKey = toClientKey(table.model);
    if (!prisma[clientKey]?.upsert) {
      console.warn(`Skipping ${table.model}: Prisma delegate not found`);
      continue;
    }

    const rows = JSON.parse(await fs.readFile(path.join(exportDir, table.file), "utf8"));
    const primaryKey = getPrimaryKeyField(table.model);
    let imported = 0;

    for (const row of rows) {
      if (row[primaryKey] === undefined || row[primaryKey] === null) {
        await prisma[clientKey].create({ data: deserializeRow(row) });
      } else {
        await prisma[clientKey].upsert({
          where: { [primaryKey]: row[primaryKey] },
          update: deserializeRow(row),
          create: deserializeRow(row),
        });
      }
      imported += 1;
    }

    console.log(`${table.model}: ${imported} rows imported`);
  }
}

main()
  .catch((error) => {
    console.error("Import failed:", error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import prisma from './config/db.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
  const sqlPath = path.resolve(__dirname, '../../public.sql');
  if (!fs.existsSync(sqlPath)) {
    console.error(`public.sql not found at ${sqlPath}`);
    process.exit(1);
  }
  const sqlText = fs.readFileSync(sqlPath, 'utf8');

  // Simple regex parser for CREATE TABLE
  const tableDefs = {};
  const createTableRegex = /CREATE TABLE "public"\."(\w+)" \(([\s\S]*?)\)\r?\n;/g;
  let match;
  
  // Since SQL might have newlines or semicolon placements, let's parse more flexibly
  const blocks = sqlText.split(/CREATE TABLE "public"\./);
  for (let i = 1; i < blocks.length; i++) {
    const block = blocks[i];
    const nameMatch = block.match(/^"(\w+)"/);
    if (!nameMatch) continue;
    const tableName = nameMatch[1];
    
    // Find content within outer parentheses
    const startIdx = block.indexOf('(');
    if (startIdx === -1) continue;
    
    // Simple paren matching
    let parenCount = 1;
    let endIdx = startIdx + 1;
    while (parenCount > 0 && endIdx < block.length) {
      if (block[endIdx] === '(') parenCount++;
      else if (block[endIdx] === ')') parenCount--;
      endIdx++;
    }
    
    const body = block.substring(startIdx + 1, endIdx - 1);
    const columns = [];
    const lines = body.split('\n');
    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('CONSTRAINT') || trimmed.startsWith('PRIMARY KEY') || trimmed.startsWith('UNIQUE') || trimmed.startsWith('KEY') || trimmed.startsWith('FOREIGN KEY')) continue;
      
      const colMatch = trimmed.match(/^"(\w+)"/);
      if (colMatch) {
        columns.push(colMatch[1]);
      }
    }
    tableDefs[tableName] = columns;
  }

  console.log(`Parsed ${Object.keys(tableDefs).length} table schemas from public.sql.`);

  // Now query information_schema to check if columns are missing
  for (const [tableName, legacyCols] of Object.entries(tableDefs)) {
    try {
      const tableExists = await prisma.$queryRawUnsafe(
        `SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_schema = 'public' 
          AND table_name = '${tableName}'
        );`
      );

      if (!tableExists[0].exists) {
        // Check if there's a mapped model with different casing or map
        console.log(`❌ Table "${tableName}" is missing in the new schema database!`);
        continue;
      }

      // Get current columns in PostgreSQL
      const currentColsResult = await prisma.$queryRawUnsafe(
        `SELECT column_name FROM information_schema.columns 
         WHERE table_schema = 'public' 
         AND table_name = '${tableName}'`
      );
      const currentCols = currentColsResult.map(r => r.column_name);

      // Compare
      const missingCols = [];
      for (const col of legacyCols) {
        if (col === 'deleted_at') continue;
        if (!currentCols.includes(col)) {
          missingCols.push(col);
        }
      }

      if (missingCols.length > 0) {
        console.log(`⚠️ Table "${tableName}": Missing columns in new schema -> [${missingCols.join(', ')}]`);
      }
    } catch (err) {
      console.warn(`Error comparing table "${tableName}":`, err.message);
    }
  }

  console.log('Done comparing schemas.');
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());

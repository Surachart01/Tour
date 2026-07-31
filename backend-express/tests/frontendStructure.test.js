import test from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync, statSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const testDirectory = resolve(fileURLToPath(new URL('.', import.meta.url)));
const productionDirectory = resolve(testDirectory, '../../frontend-main/production');
const htmlFiles = readdirSync(productionDirectory)
  .filter((file) => file.endsWith('.html'))
  .map((file) => resolve(productionDirectory, file));
const sidebarControlFile = resolve(productionDirectory, 'js/common/sidebar-control.js');

function activeHtml(source) {
  return source.replace(/<!--[\s\S]*?-->/g, '');
}

test('production pages do not contain duplicate HTML ids', () => {
  const duplicateIds = [];

  for (const file of htmlFiles) {
    const source = activeHtml(readFileSync(file, 'utf8'));
    const counts = new Map();

    for (const match of source.matchAll(/\sid=["']([^"']+)["']/g)) {
      counts.set(match[1], (counts.get(match[1]) || 0) + 1);
    }

    for (const [id, count] of counts) {
      if (count > 1) duplicateIds.push(`${file}: ${id} (${count})`);
    }
  }

  assert.deepEqual(duplicateIds, []);
});

test('production pages reference existing local scripts and styles', () => {
  const missingReferences = [];

  for (const file of htmlFiles) {
    const source = activeHtml(readFileSync(file, 'utf8'));

    for (const match of source.matchAll(/(?:src|href)=["']([^"']+)["']/g)) {
      const reference = match[1].split(/[?#]/)[0];
      if (
        !reference ||
        /^(?:https?:|data:|mailto:|tel:|javascript:|#|\/\/)/.test(reference) ||
        /[${}{}`]/.test(reference)
      ) continue;

      const target = reference.startsWith('/')
        ? resolve(productionDirectory, reference.replace(/^\/+/, '').replace(/^production\//, ''))
        : resolve(dirname(file), reference);

      if (!existsSync(target) || (existsSync(target) && statSync(target).isDirectory())) {
        missingReferences.push(`${file}: ${reference}`);
      }
    }
  }

  assert.deepEqual(missingReferences, []);
});

test('every production page with the application sidebar loads the shared sidebar controller', () => {
  const pagesMissingController = [];

  for (const file of htmlFiles) {
    const source = activeHtml(readFileSync(file, 'utf8'));
    if (!source.includes('id="sidebar-menu"')) continue;

    if (!/js\/common\/sidebar-control\.js(?:\?[^"']*)?["']/.test(source)) {
      pagesMissingController.push(file);
    }
  }

  assert.deepEqual(pagesMissingController, []);
});

test('shared sidebar controller provides the complete reporting navigation', () => {
  const source = readFileSync(sidebarControlFile, 'utf8');

  assert.match(source, /payment\.html/);
  assert.match(source, /Statement/);
  assert.match(source, /analytics\.html/);
  assert.match(source, />Dashboard</);
  assert.match(source, /room_nights\.html/);
  assert.match(source, /Room Nights/);
  assert.match(source, /check_invoices\.html/);
  assert.match(source, /Check Invoice/);
  assert.match(source, /MutationObserver/);
});

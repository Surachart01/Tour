import test from 'node:test';
import assert from 'node:assert/strict';
import { spawnSync } from 'node:child_process';

function importModuleInProduction(modulePath, extraEnv = {}) {
  return spawnSync(
    process.execPath,
    ['--input-type=module', '--eval', `import ${JSON.stringify(modulePath)}`],
    {
      cwd: process.cwd(),
      env: {
        ...process.env,
        NODE_ENV: 'production',
        JWT_SECRET: '',
        BANK_ENCRYPTION_KEY: '',
        ...extraEnv,
      },
      encoding: 'utf8',
    },
  );
}

test('production refuses to start without a JWT secret', () => {
  const result = importModuleInProduction('./src/middleware/auth.js');
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /JWT_SECRET must be configured/);
});

test('production refuses to start without a bank encryption key', () => {
  const result = importModuleInProduction('./src/utils/crypto.js', {
    JWT_SECRET: 'test-production-jwt-secret',
  });
  assert.notEqual(result.status, 0);
  assert.match(result.stderr, /BANK_ENCRYPTION_KEY must be configured/);
});

test('production accepts explicitly configured security secrets', () => {
  const authResult = importModuleInProduction('./src/middleware/auth.js', {
    JWT_SECRET: 'test-production-jwt-secret',
    BANK_ENCRYPTION_KEY: 'test-bank-encryption-key-32byte',
  });
  const cryptoResult = importModuleInProduction('./src/utils/crypto.js', {
    JWT_SECRET: 'test-production-jwt-secret',
    BANK_ENCRYPTION_KEY: 'test-bank-encryption-key-32byte',
  });

  assert.equal(authResult.status, 0, authResult.stderr);
  assert.equal(cryptoResult.status, 0, cryptoResult.stderr);
});

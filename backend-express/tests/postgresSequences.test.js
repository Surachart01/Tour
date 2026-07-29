import test from 'node:test';
import assert from 'node:assert/strict';
import {
  isAutoincrementIdConflict,
  runWithSequenceRecovery,
  synchronizeAutoincrementSequences
} from '../src/utils/postgresSequences.js';

test('database sequence synchronization advances imported serial IDs safely', async () => {
  let executedSql = '';
  const prisma = {
    async $executeRawUnsafe(sql) {
      executedSql = sql;
    }
  };

  await synchronizeAutoincrementSequences(prisma);

  assert.match(executedSql, /information_schema\.columns/);
  assert.match(executedSql, /column_default LIKE 'nextval\(%'/);
  assert.match(executedSql, /LOCK TABLE %I\.%I IN SHARE ROW EXCLUSIVE MODE/);
  assert.match(executedSql, /SELECT MAX\(%I\)/);
  assert.match(executedSql, /SELECT setval\(%L, %s, true\)/);
  assert.match(executedSql, /SELECT setval\(%L, 1, false\)/);
});

test('database sequence synchronization requires a Prisma client', async () => {
  await assert.rejects(
    synchronizeAutoincrementSequences(null),
    /A Prisma client is required/
  );
});

test('sequence recovery retries an operation once after an ID collision', async () => {
  let operationCalls = 0;
  let sequenceRepairs = 0;
  const prisma = {
    async $executeRawUnsafe() {
      sequenceRepairs += 1;
    }
  };

  const result = await runWithSequenceRecovery(prisma, async () => {
    operationCalls += 1;
    if (operationCalls === 1) {
      const error = new Error('Duplicate primary key');
      error.code = 'P2002';
      error.meta = { target: ['id'] };
      throw error;
    }
    return { id: 334 };
  });

  assert.deepEqual(result, { id: 334 });
  assert.equal(operationCalls, 2);
  assert.equal(sequenceRepairs, 1);
});

test('sequence recovery does not retry other unique constraint errors', async () => {
  let operationCalls = 0;
  const prisma = {
    async $executeRawUnsafe() {
      assert.fail('Sequence repair should not run for a non-ID conflict.');
    }
  };

  await assert.rejects(
    runWithSequenceRecovery(prisma, async () => {
      operationCalls += 1;
      const error = new Error('Duplicate package code');
      error.code = 'P2002';
      error.meta = { target: ['code'] };
      throw error;
    }),
    /Duplicate package code/
  );

  assert.equal(operationCalls, 1);
  assert.equal(
    isAutoincrementIdConflict({ code: 'P2002', meta: { target: ['code'] } }),
    false
  );
});

const synchronizeSequencesSql = `
  DO $$
  DECLARE
    sequence_record record;
    maximum_id bigint;
  BEGIN
    FOR sequence_record IN
      SELECT
        table_schema,
        table_name,
        column_name,
        pg_get_serial_sequence(
          format('%I.%I', table_schema, table_name),
          column_name
        ) AS sequence_name
      FROM information_schema.columns
      WHERE table_schema = 'public'
        AND column_default LIKE 'nextval(%'
    LOOP
      IF sequence_record.sequence_name IS NULL THEN
        CONTINUE;
      END IF;

      EXECUTE format(
        'LOCK TABLE %I.%I IN SHARE ROW EXCLUSIVE MODE',
        sequence_record.table_schema,
        sequence_record.table_name
      );

      EXECUTE format(
        'SELECT MAX(%I) FROM %I.%I',
        sequence_record.column_name,
        sequence_record.table_schema,
        sequence_record.table_name
      )
      INTO maximum_id;

      IF maximum_id IS NULL THEN
        EXECUTE format(
          'SELECT setval(%L, 1, false)',
          sequence_record.sequence_name
        );
      ELSE
        EXECUTE format(
          'SELECT setval(%L, %s, true)',
          sequence_record.sequence_name,
          maximum_id
        );
      END IF;
    END LOOP;
  END $$;
`;

export async function synchronizeAutoincrementSequences(prismaClient) {
  if (!prismaClient?.$executeRawUnsafe) {
    throw new TypeError('A Prisma client is required to synchronize database sequences.');
  }

  await prismaClient.$executeRawUnsafe(synchronizeSequencesSql);
}

export function isAutoincrementIdConflict(error) {
  if (error?.code !== 'P2002') return false;

  const target = Array.isArray(error.meta?.target)
    ? error.meta.target
    : [error.meta?.target];

  return target
    .filter(Boolean)
    .some((field) => String(field).toLowerCase() === 'id');
}

export async function runWithSequenceRecovery(prismaClient, operation) {
  if (typeof operation !== 'function') {
    throw new TypeError('A database operation is required.');
  }

  try {
    return await operation();
  } catch (error) {
    if (!isAutoincrementIdConflict(error)) {
      throw error;
    }

    await synchronizeAutoincrementSequences(prismaClient);
    return operation();
  }
}

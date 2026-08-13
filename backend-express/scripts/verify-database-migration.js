import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const expectedTables = [
  'users',
  'agents',
  'hotels',
  'room_types',
  'trips',
  'tours',
  'transfers',
  'excursions',
  'special_packages',
  'countries',
  'cities',
  'notifications',
  'tour_services',
  'organizations',
  'user_profiles',
  'workflow_email_log',
  'tax_invoice_documents',
  'check_invoice_records',
  'invoices',
];

async function main() {
  const tableCounts = await prisma.$queryRawUnsafe(`
    SELECT table_name,
           (xpath('/row/count/text()', query_to_xml(
             format('SELECT count(*) AS count FROM %I.%I', table_schema, table_name),
             false, true, ''
           )))[1]::text::bigint AS row_count
    FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
    ORDER BY table_name
  `);

  const countByTable = Object.fromEntries(
    tableCounts.map(({ table_name: table, row_count: count }) => [table, Number(count)]),
  );

  const missingTables = expectedTables.filter((table) => !(table in countByTable));
  const users = await prisma.user.findMany({
    select: { username: true, role: true, agentId: true },
    orderBy: { id: 'asc' },
  });
  const orphanChecks = await prisma.$queryRawUnsafe(`
    SELECT
      (SELECT count(*)::int FROM users u LEFT JOIN agents a ON a.id = u.agent_id WHERE a.id IS NULL) AS users_without_agents,
      (SELECT count(*)::int FROM room_types r LEFT JOIN hotels h ON h.id = r.hotel_id WHERE h.id IS NULL) AS room_types_without_hotels,
      (SELECT count(*)::int FROM trips t LEFT JOIN agents a ON a.id = t.agent_id WHERE t.agent_id IS NOT NULL AND a.id IS NULL) AS trips_without_agents,
      (SELECT count(*)::int FROM tour_services s LEFT JOIN tours t ON t.id = s.tour_id WHERE s.tour_id IS NOT NULL AND t.id IS NULL) AS services_without_tours
  `);

  const result = {
    totalTables: tableCounts.length,
    missingTables,
    keyCounts: Object.fromEntries(expectedTables.map((table) => [table, countByTable[table] ?? null])),
    userRoles: users,
    orphanChecks: orphanChecks[0],
  };

  console.log(JSON.stringify(result, null, 2));

  const hasOrphans = Object.values(orphanChecks[0]).some((count) => Number(count) > 0);
  if (missingTables.length || hasOrphans) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());

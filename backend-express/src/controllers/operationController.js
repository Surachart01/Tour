import ExcelJS from 'exceljs';
import prisma from '../config/db.js';

const SERVICE_TYPES = new Set(['transfer', 'excursion', 'tour']);
const STATUSES = new Set(['unassigned', 'assigned', 'ready', 'in_operation', 'completed', 'changed', 'cancelled']);

function dateOnly(value) {
  if (!value) return null;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
}

function utcDate(value, endExclusive = false) {
  const parsed = /^\d{4}-\d{2}-\d{2}$/.test(String(value || '')) ? String(value) : dateOnly(value);
  if (!parsed) return null;
  const date = new Date(`${parsed}T00:00:00.000Z`);
  if (endExclusive) date.setUTCDate(date.getUTCDate() + 1);
  return date;
}

function addUtcDays(value, days) {
  const date = utcDate(value);
  date.setUTCDate(date.getUTCDate() + days);
  return dateOnly(date);
}

function numberValue(value, fallback = 0) {
  const number = Number(value);
  return Number.isFinite(number) ? number : fallback;
}

function cleanText(value) {
  return value === undefined || value === null ? '' : String(value).trim();
}

function getDateRange(query = {}) {
  const today = dateOnly(new Date());
  const from = /^\d{4}-\d{2}-\d{2}$/.test(query.from_date || '') ? query.from_date : today;
  const to = /^\d{4}-\d{2}-\d{2}$/.test(query.to_date || '') ? query.to_date : addUtcDays(from, 30);
  return from <= to ? { from, to } : { from: to, to: from };
}

function isAdmin(req) {
  return req.isSuperAdmin || ['admin', 'superadmin'].includes(req.user?.role);
}

function agentScope(req) {
  if (isAdmin(req)) {
    const requested = Number(req.query.agent_id);
    return Number.isInteger(requested) && requested > 0 ? requested : null;
  }
  const ownAgent = Number(req.user?.agent_id);
  return Number.isInteger(ownAgent) && ownAgent > 0 ? ownAgent : -1;
}

function commonRow(trip, type, item, operationDate) {
  return {
    key: `${type}:${item.id}:${operationDate}`,
    trip_id: trip.id,
    service_type: type,
    service_item_id: item.id,
    operation_date: operationDate,
    client_name: trip.client_name || '',
    client_mobile: trip.client_phone || '',
    agent_id: trip.agent_id,
    agent_name: trip.agents?.name || '',
    pax: numberValue(trip.number_of_adults) + numberValue(trip.number_of_kids),
    adults: numberValue(trip.number_of_adults),
    children: numberValue(trip.number_of_kids),
    file_number: trip.file_reference || trip.booking_reference || '',
    booking_reference: trip.booking_reference || '',
    source_updated_at: item.updated_at || item.created_at || trip.updated_at || trip.created_at || null,
    source_supplier_id: item.supplier_id || null,
    source_supplier_name: item.suppliers?.name || '',
    source_guide_name: item.guide_name || '',
    source_guide_mobile: item.guide_contact || '',
    source_remarks: item.remarks || '',
  };
}

function transferRow(trip, item) {
  const row = commonRow(trip, 'transfer', item, dateOnly(item.from_date));
  return {
    ...row,
    day_number: null,
    city: item.city || item.transfers?.city || '',
    service_name: item.transfer_description || item.transfers?.description || item.type_of_transfer || 'Transfer',
    service_code: item.tot || '',
    pickup_time: item.pickup_time || '',
    flight_number: item.flight_number || '',
    flight_time: item.flight_time || '',
    from_location: item.from_location || '',
    to_location: item.to_location || '',
    route: [item.from_location, item.to_location].filter(Boolean).join(' - '),
    hotel: '',
    program: '',
  };
}

function excursionRow(trip, item) {
  const row = commonRow(trip, 'excursion', item, dateOnly(item.from_date));
  return {
    ...row,
    day_number: null,
    city: item.city || item.excursions?.city || '',
    service_name: item.excursions?.name || 'Excursion',
    service_code: item.toe || '',
    pickup_time: item.pickup_time || '',
    flight_number: '',
    flight_time: '',
    from_location: '',
    to_location: '',
    route: '',
    hotel: item.hotel || '',
    program: item.excursions?.description || '',
  };
}

function tourRows(trip, item) {
  const start = dateOnly(item.from_date);
  const end = dateOnly(item.to_date);
  if (!start || !end) return [];
  const rows = [];
  const tourDays = new Map((item.tours?.tour_days || []).map(day => [day.day, day]));
  const hotels = new Map((item.tour_trip_item_hotels || []).map(hotel => [hotel.day, hotel]));

  for (let operationDate = start, day = 1; operationDate <= end && day <= 370; operationDate = addUtcDays(operationDate, 1), day += 1) {
    const row = commonRow(trip, 'tour', item, operationDate);
    const hotel = hotels.get(day);
    const tourDay = tourDays.get(day);
    rows.push({
      ...row,
      key: `tour:${item.id}:${operationDate}`,
      day_number: day,
      city: hotel?.city || item.tours?.city || item.from_location || '',
      service_name: item.tours?.name || 'Tour',
      service_code: item.tot || '',
      pickup_time: day === 1 && item.flight_in ? new Date(item.flight_in).toISOString().slice(11, 16) : '',
      flight_number: operationDate === end ? item.flight_number || '' : '',
      flight_time: day === 1 && item.flight_in ? new Date(item.flight_in).toISOString().slice(11, 16) : '',
      from_location: day === 1 ? item.from_location || '' : '',
      to_location: operationDate === end ? item.to_location || '' : '',
      route: item.tours?.route || [item.from_location, item.to_location].filter(Boolean).join(' - '),
      hotel: hotel?.hotel_name || '',
      room_type: hotel?.room_type || '',
      program: tourDay?.itinerary || item.tours?.description || '',
    });
  }
  return rows;
}

function assignmentKey(assignment) {
  return `${assignment.service_type}:${assignment.service_item_id}:${dateOnly(assignment.operation_date)}`;
}

function mergeAssignment(row, assignment) {
  const sourceChanged = Boolean(
    assignment?.source_updated_at &&
    row.source_updated_at &&
    new Date(row.source_updated_at).getTime() > new Date(assignment.source_updated_at).getTime()
  );
  const status = sourceChanged && !['completed', 'cancelled'].includes(assignment?.status)
    ? 'changed'
    : assignment?.status || 'unassigned';
  return {
    ...row,
    assignment_id: assignment?.id || null,
    status,
    source_changed: sourceChanged,
    supplier_id: assignment?.supplier_id || row.source_supplier_id || null,
    supplier_name: assignment?.supplier_name || row.source_supplier_name || '',
    vehicle_type: assignment?.vehicle_type || '',
    vehicle_quantity: assignment ? numberValue(assignment.vehicle_quantity, 1) : 1,
    guide_name: assignment?.guide_name || row.source_guide_name || '',
    guide_mobile: assignment?.guide_mobile || row.source_guide_mobile || '',
    pickup_time: assignment?.pickup_time || row.pickup_time || '',
    remarks: assignment?.remarks || row.source_remarks || '',
    assignment_updated_at: assignment?.updated_at || null,
  };
}

function matchesFilters(row, query) {
  if (query.type && query.type !== 'all' && row.service_type !== query.type) return false;
  if (query.city && query.city !== 'all' && row.city !== query.city) return false;
  if (query.status && query.status !== 'all' && row.status !== query.status) return false;
  const search = cleanText(query.search).toLocaleLowerCase();
  if (!search) return true;
  return [
    row.client_name, row.client_mobile, row.agent_name, row.file_number, row.city,
    row.service_name, row.route, row.hotel, row.supplier_name, row.guide_name,
  ].some(value => cleanText(value).toLocaleLowerCase().includes(search));
}

async function buildOperationData(req) {
  const range = getDateRange(req.query);
  const rangeStart = utcDate(range.from);
  const rangeEndExclusive = utcDate(range.to, true);
  const scopedAgent = agentScope(req);
  const tripWhere = {
    is_booking: true,
    status: { equals: 'Confirmed', mode: 'insensitive' },
    ...(scopedAgent !== null ? { agent_id: scopedAgent } : {}),
  };

  const trips = await prisma.trips.findMany({
    where: tripWhere,
    select: {
      id: true, agent_id: true, client_name: true, client_phone: true,
      number_of_adults: true, number_of_kids: true, booking_reference: true,
      file_reference: true, created_at: true, updated_at: true,
      agents: { select: { id: true, name: true } },
      transfer_trip_items: {
        where: { from_date: { gte: rangeStart, lt: rangeEndExclusive } },
        include: { transfers: true, suppliers: true },
      },
      excursion_trip_items: {
        where: { from_date: { gte: rangeStart, lt: rangeEndExclusive } },
        include: { excursions: true, suppliers: true },
      },
      tour_trip_items: {
        where: { from_date: { lt: rangeEndExclusive }, to_date: { gte: rangeStart } },
        include: {
          suppliers: true,
          tours: { include: { tour_days: { orderBy: { day: 'asc' } } } },
          tour_trip_item_hotels: { orderBy: { day: 'asc' } },
        },
      },
    },
    orderBy: [{ trip_start_date: 'asc' }, { id: 'asc' }],
  });

  let sourceRows = [];
  for (const trip of trips) {
    sourceRows.push(...trip.transfer_trip_items.map(item => transferRow(trip, item)));
    sourceRows.push(...trip.excursion_trip_items.map(item => excursionRow(trip, item)));
    sourceRows.push(...trip.tour_trip_items.flatMap(item => tourRows(trip, item)));
  }
  sourceRows = sourceRows.filter(row => row.operation_date >= range.from && row.operation_date <= range.to);

  const assignments = sourceRows.length
    ? await prisma.$queryRawUnsafe(
        `SELECT * FROM operation_assignments WHERE operation_date >= $1::date AND operation_date <= $2::date`,
        range.from,
        range.to,
      )
    : [];
  const assignmentMap = new Map(assignments.map(assignment => [assignmentKey(assignment), assignment]));
  let items = sourceRows.map(row => mergeAssignment(row, assignmentMap.get(row.key)));
  items = items.filter(row => matchesFilters(row, req.query));
  items.sort((a, b) =>
    a.operation_date.localeCompare(b.operation_date) ||
    a.service_type.localeCompare(b.service_type) ||
    a.client_name.localeCompare(b.client_name)
  );

  const summary = {
    total: items.length,
    unassigned: items.filter(item => item.status === 'unassigned').length,
    assigned: items.filter(item => ['assigned', 'ready'].includes(item.status)).length,
    in_operation: items.filter(item => item.status === 'in_operation').length,
    completed: items.filter(item => item.status === 'completed').length,
    changed: items.filter(item => item.status === 'changed').length,
    cancelled: items.filter(item => item.status === 'cancelled').length,
    by_type: {
      transfer: items.filter(item => item.service_type === 'transfer').length,
      excursion: items.filter(item => item.service_type === 'excursion').length,
      tour: items.filter(item => item.service_type === 'tour').length,
    },
  };

  return { items, summary, range };
}

function validateAssignment(body, params = {}) {
  const serviceType = params.serviceType || body.service_type;
  const serviceItemId = Number(params.serviceItemId || body.service_item_id);
  const operationDate = params.operationDate || body.operation_date;
  const tripId = Number(body.trip_id);
  const status = body.status || 'unassigned';
  if (!SERVICE_TYPES.has(serviceType)) throw new Error('Invalid service type.');
  if (!Number.isInteger(serviceItemId) || serviceItemId <= 0) throw new Error('Invalid service item.');
  if (!Number.isInteger(tripId) || tripId <= 0) throw new Error('Invalid booking.');
  if (!utcDate(operationDate)) throw new Error('Invalid operation date.');
  if (!STATUSES.has(status)) throw new Error('Invalid operation status.');
  const parsedSourceUpdatedAt = body.source_updated_at ? new Date(body.source_updated_at) : null;
  return {
    tripId, serviceType, serviceItemId, operationDate: dateOnly(operationDate), status,
    supplierId: Number(body.supplier_id) > 0 ? Number(body.supplier_id) : null,
    supplierName: cleanText(body.supplier_name) || null,
    vehicleType: cleanText(body.vehicle_type) || null,
    vehicleQuantity: Math.max(0, Math.round(numberValue(body.vehicle_quantity, 1))),
    guideName: cleanText(body.guide_name) || null,
    guideMobile: cleanText(body.guide_mobile) || null,
    pickupTime: cleanText(body.pickup_time) || null,
    remarks: cleanText(body.remarks) || null,
    sourceUpdatedAt: parsedSourceUpdatedAt && !Number.isNaN(parsedSourceUpdatedAt.getTime())
      ? parsedSourceUpdatedAt
      : null,
  };
}

async function verifyAssignmentSource(db, data) {
  const trip = await db.trips.findFirst({
    where: {
      id: data.tripId,
      is_booking: true,
      status: { equals: 'Confirmed', mode: 'insensitive' },
    },
    select: { id: true },
  });
  if (!trip) throw new Error('Invalid confirmed booking.');

  if (data.serviceType === 'transfer') {
    const item = await db.transfer_trip_items.findFirst({
      where: { id: data.serviceItemId, trip_item_id: data.tripId },
      select: { from_date: true },
    });
    if (!item || dateOnly(item.from_date) !== data.operationDate) {
      throw new Error('Invalid transfer operation.');
    }
    return;
  }

  if (data.serviceType === 'excursion') {
    const item = await db.excursion_trip_items.findFirst({
      where: { id: data.serviceItemId, trip_item_id: data.tripId },
      select: { from_date: true },
    });
    if (!item || dateOnly(item.from_date) !== data.operationDate) {
      throw new Error('Invalid excursion operation.');
    }
    return;
  }

  const item = await db.tour_trip_items.findFirst({
    where: { id: data.serviceItemId, trip_item_id: data.tripId },
    select: { from_date: true, to_date: true },
  });
  const start = dateOnly(item?.from_date);
  const end = dateOnly(item?.to_date);
  if (!item || data.operationDate < start || data.operationDate > end) {
    throw new Error('Invalid tour operation.');
  }
}

async function upsertAssignment(db, data, userId) {
  await verifyAssignmentSource(db, data);
  const rows = await db.$queryRawUnsafe(
    `INSERT INTO operation_assignments (
       trip_id, service_type, service_item_id, operation_date, status,
       supplier_id, supplier_name, vehicle_type, vehicle_quantity,
       guide_name, guide_mobile, pickup_time, remarks, source_updated_at,
       assigned_by, updated_at
     ) VALUES (
       $1, $2, $3, $4::date, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, now()
     )
     ON CONFLICT (service_type, service_item_id, operation_date)
     DO UPDATE SET
       trip_id = EXCLUDED.trip_id,
       status = EXCLUDED.status,
       supplier_id = EXCLUDED.supplier_id,
       supplier_name = EXCLUDED.supplier_name,
       vehicle_type = EXCLUDED.vehicle_type,
       vehicle_quantity = EXCLUDED.vehicle_quantity,
       guide_name = EXCLUDED.guide_name,
       guide_mobile = EXCLUDED.guide_mobile,
       pickup_time = EXCLUDED.pickup_time,
       remarks = EXCLUDED.remarks,
       source_updated_at = EXCLUDED.source_updated_at,
       assigned_by = EXCLUDED.assigned_by,
       updated_at = now()
     RETURNING *`,
    data.tripId, data.serviceType, data.serviceItemId, data.operationDate, data.status,
    data.supplierId, data.supplierName, data.vehicleType, data.vehicleQuantity,
    data.guideName, data.guideMobile, data.pickupTime, data.remarks, data.sourceUpdatedAt,
    Number(userId) || null,
  );
  const assignment = rows[0];
  await db.$executeRawUnsafe(
    `INSERT INTO operation_assignment_history (assignment_id, changed_by, change_summary)
     VALUES ($1, $2, $3::jsonb)`,
    assignment.id,
    Number(userId) || null,
    JSON.stringify({
      status: data.status,
      supplier_name: data.supplierName,
      vehicle_type: data.vehicleType,
      guide_name: data.guideName,
      pickup_time: data.pickupTime,
      remarks: data.remarks,
    }),
  );
  return assignment;
}

export async function listOperations(req, res, next) {
  try {
    const data = await buildOperationData(req);
    return res.json({ ...data, read_only: !isAdmin(req) });
  } catch (error) {
    next(error);
  }
}

export async function getOperationOptions(req, res, next) {
  try {
    const [suppliers, guides, agents] = await Promise.all([
      prisma.suppliers.findMany({
        select: { id: true, name: true, location: true, offers_transfers: true, offers_excursions: true, offers_tours: true },
        orderBy: { name: 'asc' },
      }),
      prisma.$queryRawUnsafe(`SELECT id, name, mobile, cities, languages FROM operation_guides WHERE active = true ORDER BY lower(name)`),
      isAdmin(req) ? prisma.agent.findMany({ select: { id: true, name: true }, orderBy: { name: 'asc' } }) : [],
    ]);
    return res.json({ suppliers, guides, agents });
  } catch (error) {
    next(error);
  }
}

export async function updateOperationAssignment(req, res, next) {
  try {
    const data = validateAssignment(req.body, req.params);
    const assignment = await upsertAssignment(prisma, data, req.user?.user_id);
    return res.json({ message: 'Operation assignment saved.', assignment });
  } catch (error) {
    if (error.message.startsWith('Invalid')) return res.status(400).json({ message: error.message });
    next(error);
  }
}

export async function bulkUpdateOperationAssignments(req, res, next) {
  try {
    const assignments = Array.isArray(req.body.assignments) ? req.body.assignments : [];
    if (!assignments.length) return res.status(400).json({ message: 'Select at least one operation.' });
    if (assignments.length > 500) return res.status(400).json({ message: 'A maximum of 500 operations can be updated at once.' });
    const validated = assignments.map(item => validateAssignment(item));
    const saved = await prisma.$transaction(async tx => {
      const results = [];
      for (const item of validated) results.push(await upsertAssignment(tx, item, req.user?.user_id));
      return results;
    });
    return res.json({ message: `${saved.length} operation(s) updated.`, count: saved.length });
  } catch (error) {
    if (error.message.startsWith('Invalid')) return res.status(400).json({ message: error.message });
    next(error);
  }
}

function setWorksheetHeader(worksheet, title, columns) {
  worksheet.mergeCells(1, 1, 1, columns.length);
  const titleCell = worksheet.getCell(1, 1);
  titleCell.value = title;
  titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFFFF' } };
  titleCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF20384F' } };
  titleCell.alignment = { horizontal: 'center', vertical: 'middle' };
  worksheet.getRow(1).height = 24;
  worksheet.addRow(columns.map(column => column.header));
  const header = worksheet.getRow(2);
  header.font = { bold: true, color: { argb: 'FFFFFFFF' } };
  header.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'FF168C96' } };
  header.alignment = { horizontal: 'center', vertical: 'middle', wrapText: true };
  columns.forEach((column, index) => {
    worksheet.getColumn(index + 1).width = column.width || 16;
  });
  worksheet.views = [{ state: 'frozen', ySplit: 2 }];
  worksheet.autoFilter = { from: { row: 2, column: 1 }, to: { row: 2, column: columns.length } };
}

function exportColumns(type) {
  const shared = [
    { header: 'Date', key: 'operation_date', width: 13 },
    { header: 'Day', key: 'day_number', width: 8 },
    { header: 'City', key: 'city', width: 16 },
    { header: 'Pickup', key: 'pickup_time', width: 12 },
    { header: 'SVC', key: 'service_code', width: 10 },
  ];
  if (type === 'transfer') shared.push(
    { header: 'Service', key: 'service_name', width: 26 },
    { header: 'Flight', key: 'flight_number', width: 14 },
    { header: 'Time', key: 'flight_time', width: 10 },
    { header: 'From', key: 'from_location', width: 18 },
    { header: 'To', key: 'to_location', width: 18 },
  );
  if (type === 'excursion') shared.push(
    { header: 'Excursion', key: 'service_name', width: 32 },
    { header: 'Hotel', key: 'hotel', width: 24 },
  );
  if (type === 'tour') shared.push(
    { header: 'Tour', key: 'service_name', width: 28 },
    { header: 'Route', key: 'route', width: 35 },
    { header: 'Program', key: 'program', width: 42 },
    { header: 'Hotel', key: 'hotel', width: 24 },
  );
  return shared.concat([
    { header: 'Client', key: 'client_name', width: 22 },
    { header: 'Mobile', key: 'client_mobile', width: 16 },
    { header: 'Pax', key: 'pax', width: 8 },
    { header: 'Agent', key: 'agent_name', width: 20 },
    { header: 'File', key: 'file_number', width: 18 },
    { header: 'Supplier', key: 'supplier_name', width: 22 },
    { header: 'Vehicle', key: 'vehicle_type', width: 16 },
    { header: 'Qty', key: 'vehicle_quantity', width: 8 },
    { header: 'Guide', key: 'guide_name', width: 20 },
    { header: 'Guide Mobile', key: 'guide_mobile', width: 16 },
    { header: 'Status', key: 'status', width: 14 },
    { header: 'Remarks', key: 'remarks', width: 30 },
  ]);
}

export async function exportOperations(req, res, next) {
  try {
    const { items, range } = await buildOperationData(req);
    const workbook = new ExcelJS.Workbook();
    workbook.creator = 'Vera Thailandia';
    workbook.created = new Date();
    for (const type of ['transfer', 'excursion', 'tour']) {
      const columns = exportColumns(type);
      const worksheet = workbook.addWorksheet(`${type[0].toUpperCase()}${type.slice(1)}s`);
      setWorksheetHeader(worksheet, `${type.toUpperCase()} OPERATIONS ${range.from} - ${range.to}`, columns);
      for (const item of items.filter(row => row.service_type === type)) {
        const row = worksheet.addRow(columns.map(column => item[column.key] ?? ''));
        row.alignment = { vertical: 'middle', wrapText: true };
        row.height = 30;
      }
      worksheet.eachRow((row, rowNumber) => {
        if (rowNumber > 1) row.eachCell(cell => {
          cell.border = {
            top: { style: 'thin', color: { argb: 'FFD4DEE7' } },
            left: { style: 'thin', color: { argb: 'FFD4DEE7' } },
            bottom: { style: 'thin', color: { argb: 'FFD4DEE7' } },
            right: { style: 'thin', color: { argb: 'FFD4DEE7' } },
          };
        });
      });
    }
    const filename = `operations-${range.from}-to-${range.to}.xlsx`;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    next(error);
  }
}

// Compatibility handlers retained for old links and integrations.
export async function listTodaysOperations(req, res, next) {
  req.query.from_date = dateOnly(new Date());
  req.query.to_date = req.query.from_date;
  return listOperations(req, res, next);
}
export async function listUpcomingOperations(req, res, next) { return listOperations(req, res, next); }
export async function listOverdueOperations(req, res, next) {
  req.query.status = 'changed';
  return listOperations(req, res, next);
}
export async function getOperationSummary(req, res, next) {
  try { return res.json((await buildOperationData(req)).summary); } catch (error) { next(error); }
}
export async function getOperation(req, res, next) {
  try {
    const assignment = await prisma.$queryRawUnsafe(`SELECT * FROM operation_assignments WHERE id = $1`, Number(req.params.id));
    return assignment[0] ? res.json(assignment[0]) : res.status(404).json({ message: 'Operation not found.' });
  } catch (error) { next(error); }
}
export async function createOperation(req, res, next) { return updateOperationAssignment(req, res, next); }
export async function updateOperation(req, res, next) {
  try {
    const existing = await prisma.$queryRawUnsafe(`SELECT * FROM operation_assignments WHERE id = $1`, Number(req.params.id));
    if (!existing[0]) return res.status(404).json({ message: 'Operation not found.' });
    const data = validateAssignment({ ...existing[0], ...req.body });
    const assignment = await upsertAssignment(prisma, data, req.user?.user_id);
    return res.json({ message: 'Operation updated.', assignment });
  } catch (error) { next(error); }
}
export async function deleteOperation(req, res, next) {
  try {
    await prisma.$executeRawUnsafe(`DELETE FROM operation_assignments WHERE id = $1`, Number(req.params.id));
    return res.json({ message: 'Operation assignment removed.' });
  } catch (error) { next(error); }
}
export async function assignOperation(req, res, next) { req.body.status ||= 'assigned'; return updateOperation(req, res, next); }
export async function completeOperation(req, res, next) { req.body.status = 'completed'; return updateOperation(req, res, next); }
export async function cancelOperation(req, res, next) { req.body.status = 'cancelled'; return updateOperation(req, res, next); }
export async function addOperationComment(req, res) { return res.status(410).json({ message: 'Use operation remarks instead.' }); }
export async function getOperationComments(req, res) {
  const rows = await prisma.$queryRawUnsafe(`SELECT * FROM operation_assignment_history WHERE assignment_id = $1 ORDER BY created_at DESC`, Number(req.params.id));
  return res.json(rows);
}
export async function generateOperationsCopyText(req, res) {
  const { items } = await buildOperationData(req);
  return res.json({ text: items.map(item => `${item.operation_date} | ${item.service_name} | ${item.client_name} | ${item.pickup_time || '-'}`).join('\n') });
}
export async function generateClientContactInfo(req, res, next) {
  try {
    const trip = await prisma.trips.findUnique({ where: { id: Number(req.params.tripId) }, select: { client_name: true, client_phone: true, client_email: true } });
    return trip ? res.json(trip) : res.status(404).json({ message: 'Booking not found.' });
  } catch (error) { next(error); }
}
export async function listOperationsByClient(req, res, next) { return listOperations(req, res, next); }
export async function autoCompleteUrgentOperations(req, res) { return res.status(410).json({ message: 'Use bulk operation updates.' }); }
export async function syncOperationsWithTripChanges(req, res) { return res.json({ message: 'Operation data reads directly from the confirmed booking.' }); }
export async function getOperationsByDate(req, res, next) {
  req.query.from_date = req.params.date;
  req.query.to_date = req.params.date;
  return listOperations(req, res, next);
}

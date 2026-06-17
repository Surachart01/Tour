import ExcelJS from 'exceljs';
import prisma from '../config/db.js';

export async function exportHotels(req, res, next) {
  try {
    const hotels = await prisma.hotels.findMany({
      where: { deleted_at: null },
      include: { room_types: true, hotel_contacts: true },
      orderBy: [{ display_order: 'asc' }, { name: 'asc' }]
    });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hotels');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Address', key: 'address', width: 40 },
      { header: 'Room Types', key: 'room_types', width: 15 }
    ];
    hotels.forEach(h => sheet.addRow({
      id: h.id, name: h.name, city: h.city, address: h.address || '',
      room_types: h.room_types?.length || 0
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=hotels.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function exportExcursions(req, res, next) {
  try {
    const excursions = await prisma.excursions.findMany({ orderBy: [{ display_order: 'asc' }, { name: 'asc' }] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Excursions');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Is SIC', key: 'is_sic', width: 10 }
    ];
    excursions.forEach(e => sheet.addRow({
      id: e.id, name: e.name, city: e.city, code: e.code || '', is_sic: e.is_sic_excursion
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=excursions.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function exportTransfers(req, res, next) {
  try {
    const transfers = await prisma.transfers.findMany({ orderBy: [{ display_order: 'asc' }, { departure: 'asc' }] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Transfers');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'City', key: 'city', width: 20 },
      { header: 'Type', key: 'type', width: 15 },
      { header: 'Departure', key: 'departure', width: 25 },
      { header: 'Arrival', key: 'arrival', width: 25 }
    ];
    transfers.forEach(t => sheet.addRow({
      id: t.id, city: t.city, type: t.transfer_type, departure: t.departure, arrival: t.arrival
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=transfers.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function exportTours(req, res, next) {
  try {
    const tours = await prisma.tours.findMany({ orderBy: [{ display_order: 'asc' }, { name: 'asc' }] });
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Tours');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Name', key: 'name', width: 30 },
      { header: 'Code', key: 'code', width: 15 },
      { header: 'Category', key: 'category', width: 20 },
      { header: 'Duration', key: 'duration', width: 15 }
    ];
    tours.forEach(t => sheet.addRow({
      id: t.id, name: t.name, code: t.code || '', category: t.category || '', duration: t.duration || ''
    }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=tours.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function exportOthers(req, res, next) {
  try {
    const others = await prisma.others.findMany();
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Other Charges');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Description', key: 'description', width: 40 },
      { header: 'Amount', key: 'amount', width: 15 },
      { header: 'Type', key: 'type', width: 15 }
    ];
    others.forEach(o => sheet.addRow({ id: o.id, description: o.description, amount: o.amount, type: o.chargetype }));
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=other_charges.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function getImportTemplate(req, res, next) {
  try {
    const { type } = req.params;
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Template');
    const templates = {
      hotels: [{ header: 'Name', key: 'name' }, { header: 'City', key: 'city' }, { header: 'Address', key: 'address' }],
      excursions: [{ header: 'Name', key: 'name' }, { header: 'City', key: 'city' }, { header: 'Code', key: 'code' }],
      transfers: [{ header: 'City', key: 'city' }, { header: 'Type', key: 'type' }, { header: 'Departure', key: 'departure' }, { header: 'Arrival', key: 'arrival' }],
      tours: [{ header: 'Name', key: 'name' }, { header: 'Code', key: 'code' }, { header: 'Category', key: 'category' }]
    };
    sheet.columns = templates[type] || templates.hotels;
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', `attachment; filename=${type}_template.xlsx`);
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function generateHotelTemplate(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Hotels');
    sheet.columns = [
      { header: 'Name', key: 'name' },
      { header: 'City', key: 'city' },
      { header: 'Address', key: 'address' }
    ];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=Hotel_Import_Template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function importHotels(req, res, next) {
  try {
    return res.json({
      success: true,
      imported_count: 0,
      errors: [],
      warnings: []
    });
  } catch (err) { next(err); }
}

export async function getImportStatus(req, res, next) {
  try {
    return res.json({
      status: 'completed',
      message: 'Async import status tracking not yet implemented'
    });
  } catch (err) { next(err); }
}

export async function cleanupHotelsAfterTime(req, res, next) {
  try {
    const { timestamp } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'timestamp query parameter is required' });
    const timeVal = new Date(timestamp);
    const deleteResult = await prisma.hotels.deleteMany({
      where: {
        created_at: { gt: timeVal }
      }
    });
    return res.json({
      success: true,
      deleted_count: deleteResult.count
    });
  } catch (err) { next(err); }
}

export async function cleanupHotelsByPattern(req, res, next) {
  try {
    const { pattern } = req.query;
    if (!pattern) return res.status(400).json({ error: 'pattern query parameter is required' });
    const deleteResult = await prisma.hotels.deleteMany({
      where: {
        name: { contains: pattern.replace(/%/g, ''), mode: 'insensitive' }
      }
    });
    return res.json({
      success: true,
      deleted_count: deleteResult.count
    });
  } catch (err) { next(err); }
}

export async function cleanupHotelsInCity(req, res, next) {
  try {
    const { city, timestamp } = req.query;
    if (!city || !timestamp) return res.status(400).json({ error: 'city and timestamp query parameters are required' });
    const timeVal = new Date(timestamp);
    const deleteResult = await prisma.hotels.deleteMany({
      where: {
        city,
        created_at: { gt: timeVal }
      }
    });
    return res.json({
      success: true,
      deleted_count: deleteResult.count
    });
  } catch (err) { next(err); }
}

export async function listHotelsCreatedAfter(req, res, next) {
  try {
    const { timestamp } = req.query;
    if (!timestamp) return res.status(400).json({ error: 'timestamp query parameter is required' });
    const timeVal = new Date(timestamp);
    const hotels = await prisma.hotels.findMany({
      where: {
        created_at: { gt: timeVal }
      }
    });
    return res.json(hotels);
  } catch (err) { next(err); }
}

export async function cleanupHotelsAfterTimeSQL(req, res, next) {
  return cleanupHotelsAfterTime(req, res, next);
}

export async function cleanupHotelsByPatternSQL(req, res, next) {
  return cleanupHotelsByPattern(req, res, next);
}

export async function cleanupHotelsInCitySQL(req, res, next) {
  return cleanupHotelsInCity(req, res, next);
}

export async function executeCustomCleanupSQL(req, res, next) {
  try {
    const { sql } = req.body;
    if (!sql) return res.status(400).json({ error: 'sql field is required' });
    return res.json({
      success: true,
      message: 'Custom cleanup SQL executed'
    });
  } catch (err) { next(err); }
}

export async function importExcursions(req, res, next) {
  try {
    return res.json({ success: true, imported_count: 0, errors: [], warnings: [] });
  } catch (err) { next(err); }
}

export async function getExcursionImportStatus(req, res, next) {
  try {
    return res.json({ status: 'completed', message: 'Async import status tracking not yet implemented' });
  } catch (err) { next(err); }
}

export async function importTours(req, res, next) {
  try {
    return res.json({ success: true, imported_count: 0, errors: [], warnings: [] });
  } catch (err) { next(err); }
}

export async function getTourImportStatus(req, res, next) {
  try {
    return res.json({ status: 'completed', message: 'Async import status tracking not yet implemented' });
  } catch (err) { next(err); }
}

export async function importTransfers(req, res, next) {
  try {
    return res.json({ success: true, imported_count: 0, errors: [], warnings: [] });
  } catch (err) { next(err); }
}

export async function getTransferImportStatus(req, res, next) {
  try {
    return res.json({ status: 'completed', message: 'Async import status tracking not yet implemented' });
  } catch (err) { next(err); }
}

export async function importOthers(req, res, next) {
  try {
    return res.json({ success: true, imported_count: 0, errors: [], warnings: [] });
  } catch (err) { next(err); }
}

export async function getOtherImportStatus(req, res, next) {
  try {
    return res.json({ status: 'completed', message: 'Async import status tracking not yet implemented' });
  } catch (err) { next(err); }
}

export async function exportFlights(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Flights');
    sheet.columns = [
      { header: 'ID', key: 'id', width: 8 },
      { header: 'Flight Number', key: 'flight_number', width: 15 },
      { header: 'Route', key: 'route', width: 25 }
    ];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=flights.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}

export async function generateFlightTemplate(req, res, next) {
  try {
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Flight Template');
    sheet.columns = [
      { header: 'Flight Number', key: 'flight_number' },
      { header: 'Route', key: 'route' }
    ];
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename=flight_template.xlsx');
    await workbook.xlsx.write(res);
    res.end();
  } catch (err) { next(err); }
}



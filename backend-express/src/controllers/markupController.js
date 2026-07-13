import prisma from '../config/db.js';
import { ensureMarkupSchema } from '../utils/schemaMaintenance.js';

let hotelMarkupAmountPrecisionReady = false;

async function ensureHotelMarkupAmountPrecision() {
  if (hotelMarkupAmountPrecisionReady) return;
  await ensureMarkupSchema();
  await prisma.$executeRawUnsafe(
    'ALTER TABLE hotel_markup_percentages ALTER COLUMN markup_percentage TYPE numeric(10,2)'
  );
  hotelMarkupAmountPrecisionReady = true;
  await prisma.$disconnect();
}

function buildHotelMarkupRows(rows) {
  return (rows || []).map(h => ({
    price_from: h.price_from,
    price_to: h.price_to,
    markup_percentage: h.markup_percentage
  }));
}

function handleMarkupError(err, res, next) {
  const message = String(err?.message || '');
  if (message.includes('numeric field overflow') || message.includes('precision 5')) {
    return res.status(400).json({
      message: 'Hotel Markup now uses fixed THB amounts. The database column must support values such as 1000. Please retry after the latest deployment finishes.'
    });
  }
  return next(err);
}

function isCachedPlanError(err) {
  return String(err?.message || '').includes('cached plan must not change result type');
}

async function withCachedPlanRetry(operation) {
  try {
    return await operation();
  } catch (err) {
    if (!isCachedPlanError(err)) throw err;
    await prisma.$disconnect();
    return operation();
  }
}

export async function createMarkup(req, res, next) {
  try {
    const data = req.body;
    await ensureHotelMarkupAmountPrecision();
    const markup = await withCachedPlanRetry(() => prisma.markups.create({
      data: {
        markup_group: data.markup_group, excursion_markup_unit: data.excursion_markup_unit,
        excursion_markup: data.excursion_markup, tour_markup_unit: data.tour_markup_unit,
        tour_markup: data.tour_markup, transfer_markup_unit: data.transfer_markup_unit,
        transfer_markup: data.transfer_markup, currency_id: data.currency_id,
        extra_bed_markup_unit: data.extra_bed_markup_unit || 'flat rate',
        extra_bed_markup: data.extra_bed_markup !== undefined ? data.extra_bed_markup : 0,
        hotel_markup_unit: data.hotel_markup_unit || null,
        hotel_markup_value: data.hotel_markup_value || null,
        hotel_markup_percentages: data.hotel_markup_percentages ? {
          create: buildHotelMarkupRows(data.hotel_markup_percentages)
        } : undefined
      },
      include: { hotel_markup_percentages: true, currencies: true }
    }));
    return res.status(201).json(markup);
  } catch (err) { return handleMarkupError(err, res, next); }
}

export async function getMarkup(req, res, next) {
  try {
    await ensureMarkupSchema();
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid markup ID');
    const markup = await withCachedPlanRetry(() => prisma.markups.findUnique({
      where: { id },
      include: { hotel_markup_percentages: true, currencies: true }
    }));
    if (!markup) return res.status(404).send('Markup not found');
    return res.json(markup);
  } catch (err) { next(err); }
}

export async function getAllMarkups(req, res, next) {
  try {
    await ensureMarkupSchema();
    const markups = await withCachedPlanRetry(() => prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true },
      orderBy: { markup_group: 'asc' }
    }));
    return res.json(markups);
  } catch (err) { next(err); }
}

export async function listMarkupGroupNames(req, res, next) {
  try {
    await ensureMarkupSchema();
    const markups = await withCachedPlanRetry(() => prisma.markups.findMany({
      select: { markup_group: true }
    }));
    return res.json(markups.map(m => m.markup_group));
  } catch (err) { next(err); }
}

export async function listMarkupsByGroup(req, res, next) {
  try {
    await ensureMarkupSchema();
    const { group } = req.params;
    const markup = await withCachedPlanRetry(() => prisma.markups.findUnique({
      where: { markup_group: group },
      include: { hotel_markup_percentages: true, currencies: true }
    }));
    if (!markup) return res.status(404).send('Markup group not found');
    return res.json(markup);
  } catch (err) { next(err); }
}

export async function updateMarkup(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid markup ID');
    const data = req.body;
    await ensureHotelMarkupAmountPrecision();
    await withCachedPlanRetry(() => prisma.$transaction(async (tx) => {
      await tx.hotel_markup_percentages.deleteMany({ where: { markup_id: id } });
      await tx.markups.update({
        where: { id },
        data: {
          markup_group: data.markup_group, excursion_markup_unit: data.excursion_markup_unit,
          excursion_markup: data.excursion_markup, tour_markup_unit: data.tour_markup_unit,
          tour_markup: data.tour_markup, transfer_markup_unit: data.transfer_markup_unit,
          transfer_markup: data.transfer_markup, currency_id: data.currency_id,
          extra_bed_markup_unit: data.extra_bed_markup_unit !== undefined ? data.extra_bed_markup_unit : undefined,
          extra_bed_markup: data.extra_bed_markup !== undefined ? data.extra_bed_markup : undefined,
          hotel_markup_unit: data.hotel_markup_unit !== undefined ? data.hotel_markup_unit : undefined,
          hotel_markup_value: data.hotel_markup_value !== undefined ? data.hotel_markup_value : undefined,
          hotel_markup_percentages: data.hotel_markup_percentages ? {
            create: buildHotelMarkupRows(data.hotel_markup_percentages)
          } : undefined
        }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    }));
    return res.json({ status: 'success' });
  } catch (err) { return handleMarkupError(err, res, next); }
}

export async function deleteMarkup(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid markup ID');
    await withCachedPlanRetry(() => prisma.markups.delete({ where: { id } }));
    return res.status(200).send('Markup deleted');
  } catch (err) { next(err); }
}

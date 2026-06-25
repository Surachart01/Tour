import prisma from '../config/db.js';

export async function createMarkup(req, res, next) {
  try {
    const data = req.body;
    const markup = await prisma.markups.create({
      data: {
        markup_group: data.markup_group, excursion_markup_unit: data.excursion_markup_unit,
        excursion_markup: data.excursion_markup, tour_markup_unit: data.tour_markup_unit,
        tour_markup: data.tour_markup, transfer_markup_unit: data.transfer_markup_unit,
        transfer_markup: data.transfer_markup, currency_id: data.currency_id,
        hotel_markup_unit: data.hotel_markup_unit || null,
        hotel_markup_value: data.hotel_markup_value || null,
        hotel_markup_percentages: data.hotel_markup_percentages ? {
          create: data.hotel_markup_percentages.map(h => ({
            price_from: h.price_from, price_to: h.price_to, markup_percentage: h.markup_percentage
          }))
        } : undefined
      },
      include: { hotel_markup_percentages: true, currencies: true }
    });
    return res.status(201).json(markup);
  } catch (err) { next(err); }
}

export async function getMarkup(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid markup ID');
    const markup = await prisma.markups.findUnique({
      where: { id },
      include: { hotel_markup_percentages: true, currencies: true }
    });
    if (!markup) return res.status(404).send('Markup not found');
    return res.json(markup);
  } catch (err) { next(err); }
}

export async function getAllMarkups(req, res, next) {
  try {
    const markups = await prisma.markups.findMany({
      include: { hotel_markup_percentages: true, currencies: true },
      orderBy: { markup_group: 'asc' }
    });
    return res.json(markups);
  } catch (err) { next(err); }
}

export async function listMarkupGroupNames(req, res, next) {
  try {
    const markups = await prisma.markups.findMany({
      select: { markup_group: true }
    });
    return res.json(markups.map(m => m.markup_group));
  } catch (err) { next(err); }
}

export async function listMarkupsByGroup(req, res, next) {
  try {
    const { group } = req.params;
    const markup = await prisma.markups.findUnique({
      where: { markup_group: group },
      include: { hotel_markup_percentages: true, currencies: true }
    });
    if (!markup) return res.status(404).send('Markup group not found');
    return res.json(markup);
  } catch (err) { next(err); }
}

export async function updateMarkup(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid markup ID');
    const data = req.body;
    await prisma.$transaction(async (tx) => {
      await tx.hotel_markup_percentages.deleteMany({ where: { markup_id: id } });
      await tx.markups.update({
        where: { id },
        data: {
          markup_group: data.markup_group, excursion_markup_unit: data.excursion_markup_unit,
          excursion_markup: data.excursion_markup, tour_markup_unit: data.tour_markup_unit,
          tour_markup: data.tour_markup, transfer_markup_unit: data.transfer_markup_unit,
          transfer_markup: data.transfer_markup, currency_id: data.currency_id,
          hotel_markup_unit: data.hotel_markup_unit !== undefined ? data.hotel_markup_unit : undefined,
          hotel_markup_value: data.hotel_markup_value !== undefined ? data.hotel_markup_value : undefined,
          hotel_markup_percentages: data.hotel_markup_percentages ? {
            create: data.hotel_markup_percentages.map(h => ({
              price_from: h.price_from, price_to: h.price_to, markup_percentage: h.markup_percentage
            }))
          } : undefined
        }
      });
    }, {
      maxWait: 15000,
      timeout: 30000
    });
    return res.json({ status: 'success' });
  } catch (err) { next(err); }
}

export async function deleteMarkup(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid markup ID');
    await prisma.markups.delete({ where: { id } });
    return res.status(200).send('Markup deleted');
  } catch (err) { next(err); }
}

import prisma from '../config/db.js';

// ==================== TOUR BLACKOUT DATES ====================
export async function createTourBlackoutDate(req, res, next) {
  try {
    const tourId = parseInt(req.params.id);
    if (isNaN(tourId)) return res.status(400).send('Invalid tour ID');
    const { start_date, end_date, reason } = req.body;
    const blackout = await prisma.tour_blackout_dates.create({
      data: { tour_id: tourId, start_date: new Date(start_date), end_date: new Date(end_date), reason: reason || null }
    });
    return res.status(201).json(blackout);
  } catch (err) { next(err); }
}

export async function getTourBlackoutDates(req, res, next) {
  try {
    const tourId = parseInt(req.params.id);
    if (isNaN(tourId)) return res.status(400).send('Invalid tour ID');
    const blackouts = await prisma.tour_blackout_dates.findMany({ where: { tour_id: tourId } });
    return res.json(blackouts);
  } catch (err) { next(err); }
}

export async function updateTourBlackoutDate(req, res, next) {
  try {
    const blackoutId = parseInt(req.params.blackout_id);
    if (isNaN(blackoutId)) return res.status(400).send('Invalid blackout ID');
    const { start_date, end_date, reason } = req.body;
    const blackout = await prisma.tour_blackout_dates.update({
      where: { id: blackoutId },
      data: { start_date: new Date(start_date), end_date: new Date(end_date), reason }
    });
    return res.json(blackout);
  } catch (err) { next(err); }
}

export async function deleteTourBlackoutDate(req, res, next) {
  try {
    const blackoutId = parseInt(req.params.blackout_id);
    if (isNaN(blackoutId)) return res.status(400).send('Invalid blackout ID');
    await prisma.tour_blackout_dates.delete({ where: { id: blackoutId } });
    return res.status(204).send();
  } catch (err) { next(err); }
}

// ==================== EXCURSION BLACKOUT DATES ====================
export async function createExcursionBlackoutDate(req, res, next) {
  try {
    const excursionId = parseInt(req.params.id);
    if (isNaN(excursionId)) return res.status(400).send('Invalid excursion ID');
    const { start_date, end_date, reason } = req.body;
    const blackout = await prisma.excursion_blackout_dates.create({
      data: { excursion_id: excursionId, start_date: new Date(start_date), end_date: new Date(end_date), reason: reason || null }
    });
    return res.status(201).json(blackout);
  } catch (err) { next(err); }
}

export async function getExcursionBlackoutDates(req, res, next) {
  try {
    const excursionId = parseInt(req.params.id);
    if (isNaN(excursionId)) return res.status(400).send('Invalid excursion ID');
    const blackouts = await prisma.excursion_blackout_dates.findMany({ where: { excursion_id: excursionId } });
    return res.json(blackouts);
  } catch (err) { next(err); }
}

export async function updateExcursionBlackoutDate(req, res, next) {
  try {
    const blackoutId = parseInt(req.params.blackout_id);
    const { start_date, end_date, reason } = req.body;
    const blackout = await prisma.excursion_blackout_dates.update({
      where: { id: blackoutId },
      data: { start_date: new Date(start_date), end_date: new Date(end_date), reason }
    });
    return res.json(blackout);
  } catch (err) { next(err); }
}

export async function deleteExcursionBlackoutDate(req, res, next) {
  try {
    const blackoutId = parseInt(req.params.blackout_id);
    await prisma.excursion_blackout_dates.delete({ where: { id: blackoutId } });
    return res.status(204).send();
  } catch (err) { next(err); }
}

// ==================== TRANSFER BLACKOUT DATES ====================
export async function createTransferBlackoutDate(req, res, next) {
  try {
    const transferId = parseInt(req.params.id);
    if (isNaN(transferId)) return res.status(400).send('Invalid transfer ID');
    const { start_date, end_date, reason } = req.body;
    const blackout = await prisma.transfer_blackout_dates.create({
      data: { transfer_id: transferId, start_date: new Date(start_date), end_date: new Date(end_date), reason: reason || null }
    });
    return res.status(201).json(blackout);
  } catch (err) { next(err); }
}

export async function getTransferBlackoutDates(req, res, next) {
  try {
    const transferId = parseInt(req.params.id);
    if (isNaN(transferId)) return res.status(400).send('Invalid transfer ID');
    const blackouts = await prisma.transfer_blackout_dates.findMany({ where: { transfer_id: transferId } });
    return res.json(blackouts);
  } catch (err) { next(err); }
}

export async function updateTransferBlackoutDate(req, res, next) {
  try {
    const blackoutId = parseInt(req.params.blackout_id);
    const { start_date, end_date, reason } = req.body;
    const blackout = await prisma.transfer_blackout_dates.update({
      where: { id: blackoutId },
      data: { start_date: new Date(start_date), end_date: new Date(end_date), reason }
    });
    return res.json(blackout);
  } catch (err) { next(err); }
}

export async function deleteTransferBlackoutDate(req, res, next) {
  try {
    const blackoutId = parseInt(req.params.blackout_id);
    await prisma.transfer_blackout_dates.delete({ where: { id: blackoutId } });
    return res.status(204).send();
  } catch (err) { next(err); }
}

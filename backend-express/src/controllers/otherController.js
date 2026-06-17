import prisma from '../config/db.js';

export async function listOthers(req, res, next) {
  try {
    const others = await prisma.others.findMany({ orderBy: { description: 'asc' } });
    return res.json(others);
  } catch (err) { next(err); }
}

export async function createOther(req, res, next) {
  try {
    const data = req.body;
    const other = await prisma.others.create({
      data: { description: data.description, amount: data.amount, chargetype: data.chargetype }
    });
    return res.status(201).json(other);
  } catch (err) { next(err); }
}

export async function getOther(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const other = await prisma.others.findUnique({ where: { id } });
    if (!other) return res.status(404).send('Not found');
    return res.json(other);
  } catch (err) { next(err); }
}

export async function updateOther(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const data = req.body;
    const other = await prisma.others.update({
      where: { id },
      data: { description: data.description, amount: data.amount, chargetype: data.chargetype }
    });
    return res.json(other);
  } catch (err) { next(err); }
}

export async function deleteOther(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    await prisma.others.delete({ where: { id } });
    return res.status(200).send('Deleted');
  } catch (err) { next(err); }
}

import prisma from '../config/db.js';

export async function createSupplier(req, res, next) {
  try {
    const data = req.body;
    const supplier = await prisma.suppliers.create({
      data: {
        name: data.name, description: data.description || null,
        email: data.email || null, telephone: data.telephone || null,
        location: data.location || null,
        offers_transfers: data.offers_transfers || false,
        offers_excursions: data.offers_excursions || false,
        offers_tours: data.offers_tours || false
      }
    });
    return res.status(201).json(supplier);
  } catch (err) { next(err); }
}

export async function getSupplier(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid supplier ID');
    const supplier = await prisma.suppliers.findUnique({ where: { id } });
    if (!supplier) return res.status(404).send('Supplier not found');
    return res.json(supplier);
  } catch (err) { next(err); }
}

export async function listSupplierNames(req, res, next) {
  try {
    const { service_type, city } = req.query;
    let where = {};
    if (city) where.location = { contains: city, mode: 'insensitive' };
    const suppliers = await prisma.suppliers.findMany({ where, orderBy: { name: 'asc' } });
    let filtered = suppliers;
    if (service_type) {
      filtered = suppliers.filter(s => {
        if (service_type === 'transfers') return s.offers_transfers;
        if (service_type === 'excursions') return s.offers_excursions;
        if (service_type === 'tours') return s.offers_tours;
        return true;
      });
    }
    return res.json(filtered.map(s => ({ id: s.id, name: s.name, location: s.location })));
  } catch (err) { next(err); }
}

export async function listAllSuppliers(req, res, next) {
  try {
    const suppliers = await prisma.suppliers.findMany({ orderBy: { name: 'asc' } });
    return res.json(suppliers);
  } catch (err) { next(err); }
}

export async function listSuppliersByLocation(req, res, next) {
  try {
    const { city } = req.query;
    if (!city) return res.status(400).send('City parameter is required');
    const suppliers = await prisma.suppliers.findMany({
      where: { location: { contains: city, mode: 'insensitive' } }
    });
    return res.json(suppliers);
  } catch (err) { next(err); }
}

export async function updateSupplier(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid supplier ID');
    const data = req.body;
    const supplier = await prisma.suppliers.update({
      where: { id },
      data: {
        name: data.name, description: data.description,
        email: data.email, telephone: data.telephone, location: data.location,
        offers_transfers: data.offers_transfers,
        offers_excursions: data.offers_excursions,
        offers_tours: data.offers_tours
      }
    });
    return res.json(supplier);
  } catch (err) { next(err); }
}

export async function deleteSupplier(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid supplier ID');
    await prisma.suppliers.delete({ where: { id } });
    return res.status(204).send();
  } catch (err) { next(err); }
}

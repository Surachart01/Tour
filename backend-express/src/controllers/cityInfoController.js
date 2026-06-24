import prisma from '../config/db.js';

export async function createCityInfo(req, res, next) {
  try {
    const data = req.body;
    if (!data.cityName || !data.description) {
      return res.status(400).send('cityName and description are required');
    }
    const cityInfo = await prisma.cityInfo.create({
      data: {
        cityName: data.cityName,
        description: data.description,
        highlights: Array.isArray(data.highlights) ? data.highlights.join(',') : (data.highlights || ''),
        bestTime: data.bestTime || null
      }
    });
    return res.status(201).json(cityInfo);
  } catch (err) {
    next(err);
  }
}

export async function getCityInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const cityInfo = await prisma.cityInfo.findUnique({
      where: { id }
    });
    if (!cityInfo) return res.status(404).send('City Information not found');
    return res.json(cityInfo);
  } catch (err) {
    next(err);
  }
}

export async function getAllCityInfo(req, res, next) {
  try {
    const cityInfos = await prisma.cityInfo.findMany({
      orderBy: { cityName: 'asc' }
    });
    return res.json(cityInfos);
  } catch (err) {
    next(err);
  }
}

export async function updateCityInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    const data = req.body;
    const cityInfo = await prisma.cityInfo.update({
      where: { id },
      data: {
        cityName: data.cityName,
        description: data.description,
        highlights: Array.isArray(data.highlights) ? data.highlights.join(',') : (data.highlights || ''),
        bestTime: data.bestTime || null
      }
    });
    return res.json(cityInfo);
  } catch (err) {
    next(err);
  }
}

export async function deleteCityInfo(req, res, next) {
  try {
    const id = parseInt(req.params.id);
    if (isNaN(id)) return res.status(400).send('Invalid ID');
    await prisma.cityInfo.delete({
      where: { id }
    });
    return res.status(204).send();
  } catch (err) {
    next(err);
  }
}

import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import {
  listCurrencies,
  createCurrency,
  getCountries,
  getCitiesByCountry,
  addCityToCountry,
  detectCountryFromProfile,
  createCity,
  ensureCity,
  getOrganizationServiceCountries,
  setOrganizationServiceCountries
} from '../controllers/locationController.js';

const router = express.Router();
router.use(validateJWT);

router.get('/currencies', listCurrencies);
router.post('/currencies', authorize('admin'), createCurrency);

// Go matching endpoints
router.get('/locations/countries', getCountries);
router.get('/locations/countries/:countryCode/cities', getCitiesByCountry);
router.post('/locations/countries/:countryCode/cities', addCityToCountry);
router.post('/locations/detect-country', detectCountryFromProfile);
router.post('/locations/cities', authorize('admin'), createCity);
router.post('/locations/ensure-city/:cityName/:countryCode', ensureCity);

// Organization Geography endpoints
router.get('/organizations/:orgID/service-countries', getOrganizationServiceCountries);
router.put('/organizations/:orgID/service-countries', setOrganizationServiceCountries);

export default router;



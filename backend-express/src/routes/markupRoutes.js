import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { createMarkup, getMarkup, getAllMarkups, listMarkupGroupNames, listMarkupsByGroup, updateMarkup, deleteMarkup } from '../controllers/markupController.js';

const router = express.Router();
router.use(validateJWT);

router.post('/markups', authorize('admin'), createMarkup);
router.get('/markups/names', listMarkupGroupNames);
router.get('/markups', authorize('admin'), getAllMarkups);
router.get('/markups/:id(\\d+)', authorize('admin'), getMarkup);
router.get('/markups/:group', listMarkupsByGroup);
router.put('/markups/:id', authorize('admin'), updateMarkup);
router.delete('/markups/:id', authorize('admin'), deleteMarkup);

export default router;

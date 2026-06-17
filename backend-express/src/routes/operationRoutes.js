import express from 'express';
import { validateJWT, authorize } from '../middleware/auth.js';
import { createOperation, listOperations, listTodaysOperations, listUpcomingOperations, listOverdueOperations, getOperationSummary, getOperation, updateOperation, deleteOperation, assignOperation, completeOperation, cancelOperation, addOperationComment, getOperationComments, generateOperationsCopyText, generateClientContactInfo, listOperationsByClient, autoCompleteUrgentOperations, syncOperationsWithTripChanges, getOperationsByDate } from '../controllers/operationController.js';
const router = express.Router();
router.use(validateJWT);
// Specific routes BEFORE parameterized
router.post('/operations', authorize('admin', 'agent'), createOperation);
router.get('/operations/today', authorize('admin', 'agent'), listTodaysOperations);
router.get('/operations/upcoming', authorize('admin', 'agent'), listUpcomingOperations);
router.get('/operations/overdue', authorize('admin', 'agent'), listOverdueOperations);
router.get('/operations/summary', authorize('admin', 'agent'), getOperationSummary);
router.post('/operations/copy-text', authorize('admin', 'agent'), generateOperationsCopyText);
router.get('/operations/client-contact/:tripId', authorize('admin', 'agent'), generateClientContactInfo);
router.get('/operations/by-client', authorize('admin', 'agent'), listOperationsByClient);
router.post('/operations/urgent-complete/:tripId', authorize('admin'), autoCompleteUrgentOperations);
router.post('/operations/sync-trip/:tripId', authorize('admin', 'agent'), syncOperationsWithTripChanges);
router.get('/operations/date/:date', authorize('admin', 'agent'), getOperationsByDate);
router.get('/operations', authorize('admin', 'agent'), listOperations);
// Parameterized routes
router.get('/operations/:id', authorize('admin', 'agent'), getOperation);
router.put('/operations/:id', authorize('admin', 'agent'), updateOperation);
router.delete('/operations/:id', authorize('admin'), deleteOperation);
router.post('/operations/:id/assign', authorize('admin', 'agent'), assignOperation);
router.post('/operations/:id/complete', authorize('admin', 'agent'), completeOperation);
router.post('/operations/:id/cancel', authorize('admin', 'agent'), cancelOperation);
router.post('/operations/:id/comments', authorize('admin', 'agent'), addOperationComment);
router.get('/operations/:id/comments', authorize('admin', 'agent'), getOperationComments);
export default router;

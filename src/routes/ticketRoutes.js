const express = require('express');
const router = express.Router();
const {
  createTicket,
  getTickets,
  getTicketById,
  updateTicketStatus,
  assignTicket,
  updateTicketPriority,
  escalateTicket,
  addComment,
  rateTicket,
} = require('../controllers/ticketController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router
  .route('/')
  .post(createTicket)
  .get(getTickets);

router.route('/:id').get(getTicketById);

router.patch(
  '/:id/status',
  authorize('STAFF', 'ADMIN', 'MANAGEMENT', 'STUDENT'),
  updateTicketStatus
);

router.patch(
  '/:id/assign',
  authorize('STAFF', 'ADMIN', 'MANAGEMENT'),
  assignTicket
);

router.patch(
  '/:id/priority',
  authorize('STAFF', 'ADMIN', 'MANAGEMENT'),
  updateTicketPriority
);

router.post('/:id/escalate', escalateTicket);

router.post('/:id/comments', addComment);

router.post('/:id/rate', rateTicket);

module.exports = router;

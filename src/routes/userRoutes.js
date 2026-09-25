const express = require('express');
const router = express.Router();
const {
  getUsers,
  createUser,
  toggleUserAccess,
  getStaffList,
  exportUsersExcel,
} = require('../controllers/userController');
const { protect, authorize } = require('../middleware/auth');

router.use(protect);

router.get('/staff', authorize('STAFF', 'ADMIN', 'MANAGEMENT'), getStaffList);
router.get('/export-excel', authorize('ADMIN', 'MANAGEMENT'), exportUsersExcel);

router
  .route('/')
  .get(authorize('ADMIN', 'MANAGEMENT'), getUsers)
  .post(authorize('ADMIN'), createUser);

router.patch(
  '/:id/access',
  authorize('ADMIN'),
  toggleUserAccess
);

module.exports = router;

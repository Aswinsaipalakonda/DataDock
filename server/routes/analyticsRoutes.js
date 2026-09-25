const express = require('express');
const router = express.Router();
const analyticsController = require('../controllers/analyticsController');
const { authenticate, authorizeRoles } = require('../middleware/auth');

router.use(authenticate, authorizeRoles('admin'));

router.get('/stats', analyticsController.getStats);
router.get('/logs', analyticsController.getAuditLogs);
router.get('/backups', analyticsController.listBackups);
router.post('/backups/trigger', analyticsController.triggerBackup);

module.exports = router;

const express   = require('express');
const router    = express.Router();
const auth      = require('../middleware/authMiddleware');
const isAdmin   = require('../middleware/isAdmin');
const ctrl      = require('../controllers/adminController');

router.use(auth, isAdmin);

router.get('/overview',                   ctrl.getOverview);
router.get('/reports',                    ctrl.getReports);
router.patch('/reports/:id/resolve',      ctrl.resolveReport);
router.get('/users',                      ctrl.getUsers);
router.post('/users/:id/ban',             ctrl.banUser);
router.post('/users/:id/unban',           ctrl.unbanUser);
router.get('/removed-comments',           ctrl.getRemovedComments);
router.patch('/comments/:id/restore',     ctrl.restoreComment);
router.delete('/comments/:id',            ctrl.hardDeleteComment);
router.get('/moderation-log',             ctrl.getModerationLog);

module.exports = router;

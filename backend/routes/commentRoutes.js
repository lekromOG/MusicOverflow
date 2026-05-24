const express = require('express');
const router = express.Router();
const { getComments, addComment, deleteComment } = require('../controllers/commentController');
const authMiddleware = require('../middleware/authMiddleware');

router.get('/song/:songId', getComments);
router.post('/song/:songId', authMiddleware, addComment);
router.delete('/:commentId', authMiddleware, deleteComment);

module.exports = router;

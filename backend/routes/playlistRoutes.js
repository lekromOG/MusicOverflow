const express = require('express');
const router = express.Router();
const { getPlaylistsByUser } = require('../controllers/playlistController');

router.get('/user/:userId', getPlaylistsByUser);

module.exports = router;

const express = require('express');
const multer = require('multer');
const router = express.Router();
const { getSongs, getSongById, streamSong, uploadSong, streamCover, incrementPlay, toggleLike, deleteSong } = require('../controllers/songController');
const authMiddleware = require('../middleware/authMiddleware');

const ALLOWED_AUDIO_TYPES = new Set([
    'audio/mpeg',    // .mp3
    'audio/mp3',     // .mp3 (some OS/browser variants)
    'audio/wav',     // .wav
    'audio/x-wav',
    'audio/wave',
    'audio/ogg',     // .ogg
    'audio/flac',    // .flac
    'audio/x-flac',
    'audio/aac',     // .aac
    'audio/mp4',     // .m4a
    'audio/x-m4a',
]);

const ALLOWED_IMAGE_TYPES = new Set([
    'image/jpeg',    // .jpg / .jpeg
    'image/png',     // .png
    'image/gif',     // .gif
]);

const upload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 100 * 1024 * 1024 },
    fileFilter: (_req, file, cb) => {
        if (file.fieldname === 'audio') {
            if (ALLOWED_AUDIO_TYPES.has(file.mimetype)) cb(null, true);
            else cb(new Error('Audio must be MP3, WAV, OGG, FLAC, or AAC/M4A'));
        } else if (file.fieldname === 'cover') {
            if (ALLOWED_IMAGE_TYPES.has(file.mimetype)) cb(null, true);
            else cb(new Error('Cover art must be JPEG, PNG, or GIF'));
        } else {
            cb(new Error('Unexpected field: ' + file.fieldname));
        }
    },
});

router.get('/', getSongs);
router.post('/upload', authMiddleware, upload.fields([
    { name: 'audio', maxCount: 1 },
    { name: 'cover', maxCount: 1 },
]), uploadSong);
router.post('/:id/play', incrementPlay);
router.post('/:id/like', authMiddleware, toggleLike);
router.delete('/:id', authMiddleware, deleteSong);
router.get('/:id/cover', streamCover);
router.get('/:id/stream', streamSong);
router.get('/:id', getSongById);

module.exports = router;

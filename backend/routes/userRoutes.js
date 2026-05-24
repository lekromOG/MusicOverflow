const express = require('express');
const multer = require('multer');
const router = express.Router();
const {
  createUser,
  getUser,
  updateUser,
  uploadProfilePicture,
  streamProfilePicture,
  uploadBanner,
  streamBanner,
  getUserSongs,
  getUserPlaylists,
  getUserReposts,
} = require('../controllers/userController');
const { loginUser } = require('../controllers/loginController');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');

const imageUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = new Set(['image/jpeg', 'image/png', 'image/gif']);
    if (allowed.has(file.mimetype)) cb(null, true);
    else cb(new Error('Image must be JPEG, PNG, or GIF'));
  },
});

router.post('/register', createUser);
router.post('/login', loginUser);

router.get('/:id/profile-picture', streamProfilePicture);
router.post('/:id/profile-picture', authMiddleware, imageUpload.single('image'), uploadProfilePicture);

router.get('/:id/banner', streamBanner);
router.post('/:id/banner', authMiddleware, imageUpload.single('image'), uploadBanner);

router.get('/:id/songs', getUserSongs);
router.get('/:id/playlists', getUserPlaylists);
router.get('/:id/reposts', getUserReposts);

router.put('/:id', authMiddleware, updateUser);
router.get('/:id', getUser);

router.get('/', async (req, res) => {
  try {
    const users = await User.find();
    res.json(users);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const { createUser, getUser } = require('../controllers/userController');
const { loginUser } = require('../controllers/loginController');
const isAdmin = require('../middleware/isAdmin');
const authMiddleware = require('../middleware/authMiddleware');
const User = require('../models/user');

router.post('/register', createUser);
router.post('/login', loginUser);
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

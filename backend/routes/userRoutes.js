const express = require('express');
const router = express.Router();
const { createUser, getUser } = require('../controllers/userController');
const User = require('../models/user');

router.post('/register', createUser);

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

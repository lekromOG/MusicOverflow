const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const User = require('../models/user');
const Song = require('../models/song');
const Playlist = require('../models/playlist');

const createUser = async (req, res) => {
  try {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
      return res.status(400).json({
        error: 'Please provide username, email, and password'
      });
    }

    const salt = await bcrypt.genSalt(10);
    const hashedPassword = await bcrypt.hash(password, salt);

    const newUser = new User({
      username,
      email,
      password: hashedPassword
    });

    await newUser.save();
    res.status(201).json({
      message: 'User created successfully',
      user: newUser
    });
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const getUser = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).populate('followers following');
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const updateUser = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Not authorized to update this profile' });
    }

    const { username, bio } = req.body;
    const updates = {};
    if (username !== undefined) updates.username = username;
    if (bio !== undefined) updates.bio = bio;

    const user = await User.findByIdAndUpdate(id, updates, { new: true, runValidators: true });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user);
  } catch (error) {
    res.status(400).json({ error: error.message });
  }
};

const uploadProfilePicture = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const { GridFSBucket } = mongoose.mongo;
    const bucket = new GridFSBucket(mongoose.connection.db);

    const existingUser = await User.findById(id).select('profilePictureId');
    if (existingUser?.profilePictureId) {
      try { await bucket.delete(existingUser.profilePictureId); } catch (_) {}
    }

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(req.file.buffer);
    });

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { profilePictureId: uploadStream.id },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const streamProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('profilePictureId');
    if (!user?.profilePictureId) return res.status(404).json({ error: 'No profile picture' });

    const { GridFSBucket } = mongoose.mongo;
    const bucket = new GridFSBucket(mongoose.connection.db);
    const files = await bucket.find({ _id: user.profilePictureId }).toArray();
    if (!files.length) return res.status(404).json({ error: 'File not found' });

    const file = files[0];
    res.set({
      'Content-Type': file.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=86400',
    });
    bucket.openDownloadStream(user.profilePictureId).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const uploadBanner = async (req, res) => {
  try {
    const { id } = req.params;
    if (req.user._id.toString() !== id) {
      return res.status(403).json({ error: 'Not authorized' });
    }
    if (!req.file) return res.status(400).json({ error: 'No image provided' });

    const { GridFSBucket } = mongoose.mongo;
    const bucket = new GridFSBucket(mongoose.connection.db);

    const existingUser = await User.findById(id).select('bannerImageId');
    if (existingUser?.bannerImageId) {
      try { await bucket.delete(existingUser.bannerImageId); } catch (_) {}
    }

    const uploadStream = bucket.openUploadStream(req.file.originalname, {
      contentType: req.file.mimetype,
    });
    await new Promise((resolve, reject) => {
      uploadStream.on('finish', resolve);
      uploadStream.on('error', reject);
      uploadStream.end(req.file.buffer);
    });

    const updatedUser = await User.findByIdAndUpdate(
      id,
      { bannerImageId: uploadStream.id },
      { new: true }
    );
    res.json(updatedUser);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const streamBanner = async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('bannerImageId');
    if (!user?.bannerImageId) return res.status(404).json({ error: 'No banner image' });

    const { GridFSBucket } = mongoose.mongo;
    const bucket = new GridFSBucket(mongoose.connection.db);
    const files = await bucket.find({ _id: user.bannerImageId }).toArray();
    if (!files.length) return res.status(404).json({ error: 'File not found' });

    const file = files[0];
    res.set({
      'Content-Type': file.contentType || 'image/jpeg',
      'Content-Length': file.length,
      'Cache-Control': 'public, max-age=86400',
    });
    bucket.openDownloadStream(user.bannerImageId).pipe(res);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserSongs = async (req, res) => {
  try {
    const songs = await Song.find({ artist: req.params.id, isPublic: true })
      .populate('artist', 'username profilePicture profilePictureId')
      .sort({ createdAt: -1 });
    res.json(songs);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserPlaylists = async (req, res) => {
  try {
    const playlists = await Playlist.find({ owner: req.params.id, isPublic: true })
      .populate('owner', 'username')
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const getUserReposts = async (req, res) => {
  try {
    const user = await User.findById(req.params.id)
      .populate({
        path: 'reposts',
        populate: { path: 'artist', select: 'username profilePicture profilePictureId' }
      });
    if (!user) return res.status(404).json({ error: 'User not found' });
    res.json(user.reposts || []);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
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
};

const Playlist = require('../models/playlist');

const getPlaylistsByUser = async (req, res) => {
  try {
    const playlists = await Playlist.find({ owner: req.params.userId, isPublic: true })
      .populate('owner', 'username')
      .sort({ createdAt: -1 });
    res.json(playlists);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = { getPlaylistsByUser };

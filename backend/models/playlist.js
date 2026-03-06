const mongoose = require('mongoose');

const playlistSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Playlist name is required'],
      trim: true
    },
    owner: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    songs: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Song'
      }
    ],
    coverArt: {
      type: String,
      default: 'default-playlist.png'
    },
    isPublic: {
      type: Boolean,
      default: true
    },
    description: {
      type: String,
      default: ''
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Playlist', playlistSchema);
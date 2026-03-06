const mongoose = require('mongoose');

const songSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Song title is required'],
      trim: true
    },
    artist: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    audioFileId: {
      type: mongoose.Schema.Types.ObjectId, // gridFS file ID
      required: true
    },
    coverArt: {
      type: String,
      default: 'default-cover.png'
    },
    duration: {
      type: Number, // in seconds
      required: true
    },
    genre: {
      type: String,
      enum: ['Pop', 'Rock', 'Hip-Hop', 'Jazz', 'Classical', 'Electronic', 'R&B', 'Rap', 'Other'],
      default: 'Other'
    },
    tags: [{ type: String, trim: true }],
    plays: {
      type: Number,
      default: 0
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isPublic: {
      type: Boolean,
      default: true
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Song', songSchema);
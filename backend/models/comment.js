const mongoose = require('mongoose');

const commentSchema = new mongoose.Schema(
  {
    content: {
      type: String,
      required: [true, 'Comment content is required'],
      trim: true,
      maxlength: [500, 'Comment cannot exceed 500 characters']
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    song: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Song',
      required: true
    },
    songTimestamp: {
      type: Number, // in seconds
      default: null
    },
    likes: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    isDeleted: {
      type: Boolean,
      default: false 
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Comment', commentSchema);
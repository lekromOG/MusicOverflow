const mongoose = require('mongoose');

const moderationLogSchema = new mongoose.Schema(
  {
    targetUser: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true
    },
    moderatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', // The admin who took the action
      required: true
    },
    action: {
      type: String,
      enum: ['ban', 'unban', 'mute', 'warning', 'content_removed'],
      required: true
    },
    reason: {
      type: String,
      required: [true, 'A reason for moderation is required'],
      trim: true
    },
    expiresAt: {
      type: Date,
      default: null // null = permanent
    }
  },
  { timestamps: true }
);

module.exports = mongoose.model('ModerationLog', moderationLogSchema);
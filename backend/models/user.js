const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      trim: true,
      minlength: [3, 'Username must be at least 3 characters']
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: 6,
      select: false // Don't return password by default in queries
    },
    profilePicture: {
      type: String,
      default: 'default-profile.png'
    },
    isBanned: {
        type: Boolean,
        default: false
    },
    banExpiresAt: {
        type: Date,
        default: null // null = not banned or permanent ban
    },
    bio: {
      type: String,
      default: ''
    },
    isAdmin: {
      type: Boolean,
      default: false
    },
    isPremium: {
      type: Boolean,
      default: false
    },
    followers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    following: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User'
      }
    ],
    lastLogin: {
      type: Date,
      default: null
    }
  },
  {
    timestamps: true 
  }
);

module.exports = mongoose.model('User', userSchema);
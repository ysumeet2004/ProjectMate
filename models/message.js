const mongoose = require('mongoose');

/**
 * Message Schema
 * Stores direct messages between users within the ProjectMate platform
 */
const messageSchema = new mongoose.Schema({
  senderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  recipientId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'project',
    default: null, // Can be null for general messages
  },
  content: {
    type: String,
    required: true,
    maxlength: 5000,
  },
  attachments: [
    {
      type: String,
      url: String,
      filename: String,
      size: Number,
    }
  ],
  isRead: {
    type: Boolean,
    default: false,
  },
  readAt: {
    type: Date,
    default: null,
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
  editedAt: {
    type: Date,
    default: null,
  },
});

// Index for efficient queries
messageSchema.index({ senderId: 1, recipientId: 1, createdAt: -1 });
messageSchema.index({ recipientId: 1, isRead: 1 });

const Message = mongoose.model('message', messageSchema);

module.exports = Message;

const mongoose = require('mongoose');

/**
 * Review Schema
 * Stores user reviews and ratings for trust/credibility
 * Users can review each other after collaborating on projects
 */
const reviewSchema = new mongoose.Schema({
  fromUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  toUserId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'user',
    required: true,
  },
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'project',
    required: true,
  },
  rating: {
    type: Number,
    required: true,
    min: 1,
    max: 5,
  },
  title: {
    type: String,
    required: true,
    maxlength: 100,
  },
  content: {
    type: String,
    required: true,
    maxlength: 1000,
  },
  // Specific feedback attributes
  communication: {
    type: Number,
    min: 1,
    max: 5,
  },
  reliability: {
    type: Number,
    min: 1,
    max: 5,
  },
  skillLevel: {
    type: Number,
    min: 1,
    max: 5,
  },
  collaboration: {
    type: Number,
    min: 1,
    max: 5,
  },
  tags: [
    {
      type: String,
      enum: [
        'Reliable',
        'Great communicator',
        'Fast learner',
        'Team player',
        'Professional',
        'Skilled',
        'Responsive',
        'Organized'
      ]
    }
  ],
  isVerified: {
    type: Boolean,
    default: true, // Only users who actually collaborated can review
  },
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

// Ensure one review per project collaboration pair
reviewSchema.index({ fromUserId: 1, toUserId: 1, projectId: 1 }, { unique: true });

const Review = mongoose.model('review', reviewSchema);

module.exports = Review;

const mongoose = require('mongoose');

//creating user schema
const userSchema = new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true,
    },
    password:{
        type:String,
        required:true,
    },
    bio: {
        type: String,
        default: '',
        maxlength: 500
    },
    avatar: {
        type: String,
        default: ''
    },
    skills:{
        type: [String], // Changed to array for better handling
        default: []
    },
    phone: {
        type: String,
        default: ''
    },
    showPhone: {
        type: Boolean,
        default: false
    },
    links: [
      {
        name: { type: String, default: '' },
        url: { type: String, default: '' }
      }
    ],
    location: {
        type: String,
        default: ''
    },
    timezone: {
        type: String,
        default: ''
    },
    // OAuth Fields
    githubId: {
        type: String,
        unique: true,
        sparse: true
    },
    githubProfile: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    googleProfile: {
        type: mongoose.Schema.Types.Mixed,
        default: null
    },
    // Privacy & Visibility Settings
    profileVisibility: {
        type: String,
        enum: ['public', 'private'],
        default: 'public'
    },
    showEmail: {
        type: Boolean,
        default: false
    },
    showProjectHistory: {
        type: Boolean,
        default: true
    },
    // Notification Preferences
    notifyApplications: {
        type: Boolean,
        default: true
    },
    notifyApplicationStatus: {
        type: Boolean,
        default: true
    },
    notifyMessages: {
        type: Boolean,
        default: true
    },
    notifyProjectUpdates: {
        type: Boolean,
        default: true
    },
    notificationFrequency: {
        type: String,
        enum: ['immediate', 'daily', 'weekly', 'none'],
        default: 'daily'
    },
    // Collaboration Preferences
    defaultCommitment: {
        type: String,
        enum: ['flexible', 'part-time', 'full-time', 'weekend'],
        default: 'flexible'
    },
    experienceLevel: {
        type: String,
        enum: ['beginner', 'intermediate', 'advanced', 'expert'],
        default: 'intermediate'
    },
    collabAsync: {
        type: Boolean,
        default: true
    },
    collabMeetings: {
        type: Boolean,
        default: false
    },
    collabOpenFeedback: {
        type: Boolean,
        default: true
    },
    // Account Status
    isActive: {
        type: Boolean,
        default: true
    },
    deactivatedAt: {
        type: Date,
        default: null
    }
}, {
    timestamps: true // Adds createdAt and updatedAt
});

//creating user model
const user = mongoose.model('user',userSchema);

module.exports = user;
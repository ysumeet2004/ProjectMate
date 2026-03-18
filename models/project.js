const { request } = require('express');
const mongoose = require('mongoose');

//creating project schema
const projectSchema = new mongoose.Schema({
    title:{
        type:String,
        required:true
    },
    desc:{
        type:String,
        required:true,
    },
    skills_req:{
        type:String,
    },
    domain:{
        type:String,
    },
    createdOn:{
        type:Date,
        default:Date.now(),
    },
    expires_in:{
        type:Number,
        default:30,
        min:7,
        max:90,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,
    },

    applicants: [{
      user: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true
      },
      appliedAt: {
        type: Date,
        default: Date.now
      }
    }],

    // Maximum number of seats (applicants that can be approved)
    maxApplicants: {
      type: Number,
      default: 1,
      min: 1,
      max: 4
    },

    // Users approved as collaborators for this project
    approved_users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],

    // Users rejected for this project
    rejected_users: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user'
      }
    ],

    status: {
      type: String,
      enum: ['OPEN', 'IN_PROGRESS', 'FINISHED'],
      default: 'OPEN',
    },
});

//creating user model
const project = mongoose.model('project',projectSchema);

module.exports = project;
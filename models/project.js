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
        default:3,
        min:1,
        max:7,
    },
    createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'user',
        required: true,},

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
}]
,
approved_user: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'user',
  default: null
},status: {
    type: String,
    enum: ['OPEN', 'FINISHED'],
    default: 'OPEN',
  },
});

//creating user model
const project = mongoose.model('project',projectSchema);

module.exports = project;
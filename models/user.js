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
    skills:{
        type:String,
    },
});

//creating user model
const user = mongoose.model('user',userSchema);

module.exports = user;
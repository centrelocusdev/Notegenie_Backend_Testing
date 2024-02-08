const mongoose = require('mongoose');

const User2FSchema = mongoose.Schema({
    email: String,
    otp: String
})

module.exports = mongoose.model('User2F' , User2FSchema);
const mongoose = require('mongoose');

const otpSchema = new mongoose.Schema({
    target: String, // email or phone
    otp: String,
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: { expires: 300 } // This deletes the document after 300 seconds (5 mins)
    }
});

module.exports = mongoose.model('OTP', otpSchema);
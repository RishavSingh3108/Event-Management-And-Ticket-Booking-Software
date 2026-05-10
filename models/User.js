const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dob: { type: Date, required: true }, // Added this line
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'User' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String },
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['User', 'Admin'], default: 'User' }
});

// THIS LINE IS CRITICAL:
module.exports = mongoose.model('User', userSchema);
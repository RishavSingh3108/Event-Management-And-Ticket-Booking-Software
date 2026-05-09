const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dob: { type: Date, required: true }, // Added this line
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Admin' },
    // Admins might have special business details
    businessDetails: {
        gstNumber: String,
        aadharNumber: String,
        foodLicense: String,
        gpsLocation: String
    },
    profileImage: { type: String, default: '/uploads/default-admin.png' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
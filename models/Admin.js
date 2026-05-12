const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dob: { type: Date, required: true },
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'Admin' },
    businessDetails: {
        gstNumber: String,
        aadharNumber: String,
        aadharVerified: { type: Boolean, default: false },
        aadharName: String, // Official name as per the ID card
        aadharPhoto: String, // You can store the base64 string or URL of the ID photo
        foodLicense: String,
        gpsLocation: String
    },
    profileImage: { type: String, default: '/uploads/default-admin.png' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Admin', adminSchema);
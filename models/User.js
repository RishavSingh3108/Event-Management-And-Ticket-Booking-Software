// const mongoose = require('mongoose');

// const userSchema = new mongoose.Schema({
//     name: { type: String },
//     phone: { type: String },
//     email: { type: String, required: true, unique: true },
//     password: { type: String, required: true },
//     role: { type: String, enum: ['User', 'Admin'], default: 'User' }
// });

// // THIS LINE IS CRITICAL:
// module.exports = mongoose.model('User', userSchema);

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String },
    phone: { type: String },
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['User', 'Admin'], default: 'User' },
    
    // Extended fields for the Admin Profile
    profileImage: { type: String, default: '/uploads/default-admin.png' },
    businessDetails: {
        gstNumber: { type: String, default: '' },
        aadharNumber: { type: String, default: '' },
        foodLicense: { type: String, default: '' },
        gpsLocation: { type: String, default: '' }
    }
});

module.exports = mongoose.model('User', userSchema);
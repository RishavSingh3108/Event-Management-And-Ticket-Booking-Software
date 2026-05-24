const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
    name: { type: String, required: true },
    dob: { type: Date, required: true }, 
    email: { type: String, required: true, unique: true },
    phone: { type: String, required: true },
    password: { type: String, required: true },
    role: { type: String, default: 'User' },
    
    preferredPayment: { type: String, default: 'bank' }, 
    paymentData: {
        upiId: { type: String, default: '' },
        bankAccount: { type: String, default: '' },
        ifscCode: { type: String, default: '' }
    },
    
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('User', userSchema);
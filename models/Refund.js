const mongoose = require('mongoose');

const RefundSchema = new mongoose.Schema({
    // Link directly to the original booking entry
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    userId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: true
    },
    // Track which admin processed this transaction
    adminId: {
        type: mongoose.Schema.Types.ObjectId,
        required: true
    },
    // Cached User Details for fast analytical mapping and auditing
    userName: { 
        type: String, 
        required: true 
    },
    userEmail: { 
        type: String, 
        required: true 
    },
    userPhone: { 
        type: String, 
        required: true 
    },
    // Financial Tracking
    amountRefunded: { 
        type: Number, 
        required: true 
    },
    payoutMode: { 
        type: String, 
        enum: ['UPI', 'BANK'], 
        required: true 
    },
    // Saved dynamically based on chosen payoutMode
    upiDetails: {
        upiId: { type: String, default: "" }
    },
    bankDetails: {
        accountHolder: { type: String, default: "" },
        accountNumber: { type: String, default: "" },
        ifscCode: { type: String, default: "" }
    },
    // File storage system reference path for the transaction confirmation file
    screenshotProofPath: { 
        type: String, 
        required: true 
    },
    // Automated timestamp log
    processedAt: { 
        type: Date, 
        default: Date.now 
    }
});

module.exports = mongoose.model('Refund', RefundSchema);
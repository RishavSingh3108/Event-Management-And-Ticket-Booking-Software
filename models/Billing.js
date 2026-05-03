const mongoose = require('mongoose');

const billingSchema = new mongoose.Schema({
    bookingId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Booking',
        required: true
    },
    // Linking to the specific User/Customer
    customerId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User', 
        required: true
    },
    // Linking to the specific Venue
    venueId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Venue',
        required: true
    },
    adminId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'admin',
    required: true
    },
    invoiceNumber: {
        type: String,
        // required: true,
        unique: true
    },
    invoiceDate: {
        type: String,
        // required: true
    },
    customerDetail: {
        name: { type: String, required: true },
        email: { type: String, required: true },
        phone: { type: String, required: true }
    },
    billingTable: [{
        description: { type: String, required: true },
        serviceCost: { type: Number, required: true },
        gstPercentage: { type: Number, required: true },
        rowTotal: { type: Number, required: true }
    }],
    summary: {
        subtotal: { type: Number, required: true },
        advancePaid: { type: Number, default: 0 },
        balanceDue: { type: Number, required: true }
    }
}, { timestamps: true });

module.exports = mongoose.model('Billing', billingSchema);
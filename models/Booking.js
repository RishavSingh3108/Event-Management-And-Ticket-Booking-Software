const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, 
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    bookingDate: String,
    guests: Number,
    bookedBy: String,
    contact: String,
    email: String,
    purpose: String,
    requirements: String,
    paymentType: { 
        type: String, 
        enum: ['partial', 'advance', 'full'], 
        required: true 
    },
    paymentAmount: { 
        type: Number, 
        required: true 
    },
    paymentScreenshot: {
        data: Buffer,          
        contentType: String    
    },
    status: { type: String, default: 'Pending' },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);
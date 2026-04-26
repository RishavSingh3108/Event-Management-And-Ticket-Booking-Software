const mongoose = require('mongoose');

const bookingSchema = new mongoose.Schema({
    venueId: { type: mongoose.Schema.Types.ObjectId, ref: 'Venue' },
    bookingDate: String,
    guests: Number,
    bookedBy: String,
    contact: String,
    email: String,
    purpose: String,
    requirements: String,
    status: { type: String, default: 'Pending' },
    submittedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Booking', bookingSchema);

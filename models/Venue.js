const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
    name: { type: String, required: true },
    address: String,
    phone: String,
    email: String,
    imgUrl: String,
    desc: String,
    type: String,
    size: Number,
    cost: Number,
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Venue', VenueSchema);
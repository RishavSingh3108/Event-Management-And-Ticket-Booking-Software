const mongoose = require('mongoose');

const VenueSchema = new mongoose.Schema({
    adminId: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User', 
        required: true 
    },
    name: { type: String, required: true },
    address: String,
    phone: String,
    email: String,
    imgUrl: String,
    desc: String,
    type: String,
    size: Number,
    cost: Number,
    status: { 
        type: String, 
        enum: ['ACTIVE', 'INACTIVE'], 
        default: 'ACTIVE' 
    },
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Venue', VenueSchema);
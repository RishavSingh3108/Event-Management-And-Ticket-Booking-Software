const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
require('dotenv').config();

const app = express();

// 1. Middlewares
app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// 2. Models
const Venue = require('./models/Venue');

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 4. Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'auth.html'));
});

// Auth routes
const authRoutes = require('./routes/auth');
app.use('/api', authRoutes);


// =======================================
// VENUE API ROUTES
// =======================================

// POST: Create Venue
app.post('/api/venues', async (req, res) => {
    try {
        console.log("Receiving data:", req.body);

        const newVenue = new Venue(req.body); 
        await newVenue.save(); 

        res.status(201).json({ success: true, message: "Venue saved!" });

    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// GET: Fetch all Venues
app.get('/api/venues', async (req, res) => {
    try {

        const venues = await Venue.find({}); 
        res.status(200).json(venues); 

    } catch (err) {

        res.status(500).json({ message: "Server error while fetching venues" });

    }
});


// =======================================
// BOOKING API ROUTES
// =======================================

// Booking can be done by user for any venue

const Booking = require('./models/Booking');


// POST: Create a new booking with conflict check
app.post('/api/bookings', async (req, res) => {
    try {
        const { venueId, bookingDate } = req.body;

        console.log(`Checking availability for Venue: ${venueId} on Date: ${bookingDate}`);

        // 1. THE CRITICAL CHECK
        // We look for any booking that has the SAME venueId AND the SAME date
        const existingBooking = await Booking.findOne({ 
            venueId: venueId, 
            bookingDate: bookingDate 
        });

        if (existingBooking) {
            console.log("Match found! Blocking booking.");
            // If a match is found, we send a 400 error and STOP here
            return res.status(400).json({ 
                success: false, 
                message: "This date is already reserved for this venue. Please choose another date." 
            });
        }

        // 2. SAVE ONLY IF NO MATCH
        const newBooking = new Booking(req.body);
        await newBooking.save();
        
        console.log("No conflict. Booking saved successfully.");
        res.status(201).json({ success: true, message: "Booking successful!" });

    } catch (err) {
        console.error("Server Error:", err);
        res.status(500).json({ success: false, message: "Internal Server Error" });
    }
});


// DELETE: Remove a venue by ID

app.delete('/api/venues/:id', async (req, res) => {
    try {
        const result = await Venue.findByIdAndDelete(req.params.id);
        if (!result) {
            return res.status(404).json({ success: false, message: "Venue not found" });
        }
        res.status(200).json({ success: true, message: "Deleted" });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});


// PUT: Update an existing venue
app.put('/api/venues/:id', async (req, res) => {
    try {
        const id = req.params.id;
        console.log("🛠️ Received Update Request for ID:", id);
        console.log("📦 Data received:", req.body);

        // Check if the ID is valid
        if (!id || id === "null" || id === "undefined") {
            return res.status(400).json({ success: false, message: "Invalid Venue ID" });
        }

        const updatedVenue = await Venue.findByIdAndUpdate(id, req.body, { new: true });

        if (!updatedVenue) {
            console.log("❓ Venue not found in DB");
            return res.status(404).json({ success: false, message: "Venue not found" });
        }

        console.log("✅ Venue updated successfully!");
        res.json({ success: true, message: "Update successful" });
    } catch (err) {
        console.error("❌ Server Error during PUT:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});

// Route to get all bookings for a SPECIFIC venue (needed for the Admin Calendar)
app.get('/api/bookings/venue/:venueId', async (req, res) => {
    try {
        const { venueId } = req.params;
        
        // Find all bookings where venueId matches the one clicked by the Admin
        const bookings = await Booking.find({ venueId: venueId });
        
        // Send the list of bookings back to the Admin Dashboard
        res.status(200).json(bookings);
    } catch (err) {
        console.error("Error fetching bookings for venue:", err);
        res.status(500).json({ success: false, message: "Server Error" });
    }
});

// Get a single booking's details by ID
app.get('/api/bookings/single/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).send("Booking not found");
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});

//  THIS SHOULD BE AT THE BOTTOM
app.use(express.static(path.join(__dirname, 'public')));


// 5. Start Server
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

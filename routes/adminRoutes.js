const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Billing = require('../models/Billing');
// add venue
router.post('/add-venue', async (req, res) => {
    try {
        const newVenue = new Venue(req.body); 
        await newVenue.save(); 
        res.status(201).json({ success: true, message: "Venue saved!" });
    } 
    catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Particular bookings Detail in Admin Calender
router.get('/bookings/single/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).send("Booking not found");
        res.json(booking);
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
});
// edit a venue
router.put('/venues/:id', async (req, res) => {
    try {
        const id = req.params.id;
        // Check if the ID is valid
        if (!id || id === "null" || id === "undefined") {
            return res.status(400).json({ success: false, message: "Invalid Venue ID" });
        }

        const updatedVenue = await Venue.findByIdAndUpdate(id, req.body, { returnDocument: 'after' });

        if (!updatedVenue) {
            console.log("❓ Venue not found in DB");
            return res.status(404).json({ success: false, message: "Venue not found" });
        }
        res.json({ success: true, message: "Update successful" });
    } catch (err) {
        console.error("❌ Server Error during PUT:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// delete a venue
router.delete('/venues/:id', async (req, res) => {
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
// Fetch Admin Profile Data
router.get('/get-profile', async (req, res) => {
    try {
        // const adminId = req.query.adminId; // Correctly pull 'adminId' from the URL query
        const { adminId } = req.query;

        const admin = await Admin.findById(adminId);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        res.json({ success: true, data: admin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Fetch Admin dashboard Data's
router.get('/dashboard-stats', async (req, res) => {
    try {
        const { adminId } = req.query;
        const adminProfile = await Admin.findById(adminId); 

        // Existing count and aggation logic
        const totalVenues = await Venue.countDocuments({ adminId: adminId });
        const stats = await Booking.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(adminId) } },
            { $group: { _id: null, count: { $sum: 1 }, revenue: { $sum: "$paymentAmount" } } }
        ]);
        const data = stats[0] || { count: 0, revenue: 0 };

        // SENDING THE NESTED DATA
        res.json({
            success: true,
            totalVenues,
            totalBookings: data.count,
            totalProfit: data.revenue,
            // Match your screenshot exactly:
            gst: adminProfile?.businessDetails?.gstNumber, 
            aadhar: adminProfile?.businessDetails?.aadharNumber,
            fssai: adminProfile?.businessDetails?.foodLicense,
            location: adminProfile?.businessDetails?.gpsLocation
        });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
// Update Admin Profile photo
const adminStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); 
    },
    filename: (req, file, cb) => {
        cb(null, 'admin-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadAdmin = multer({ storage: adminStorage }); 

router.post('/upload-photo', uploadAdmin.single('adminPhoto'), async (req, res) => {
    try {
        const { adminId } = req.body; // Captured from FormData       
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const imagePath = `/uploads/${req.file.filename}`;

        // Find the user by ID and update their profileImage path
        const updatedUser = await Admin.findByIdAndUpdate(
            adminId,
            { profileImage: imagePath },
            { returnDocument: 'after' }
        );

        if (!updatedUser) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        res.json({ 
            success: true, 
            message: "Photo updated successfully", 
            imagePath: imagePath 
        });
    } catch (err) {
        console.error("Upload Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// Update Business Credentials
router.put('/update-profile', async (req, res) => {
    try {
        const { adminId, gst, aadhar, fssai, gps } = req.body;
        
        // Use findByIdAndUpdate for the most direct match with the MongoDB _id
        const updatedUser = await Admin.findByIdAndUpdate(
            adminId, 
            {
                $set: {
                    'businessDetails.gstNumber': gst,
                    'businessDetails.aadharNumber': aadhar,
                    'businessDetails.foodLicense': fssai,
                    'businessDetails.gpsLocation': gps
                }
            },
            { returnDocument: 'after' } // Returns the updated document
        );

        if (!updatedUser) {
            // This triggers your "Update failed: Admin not found" alert
            return res.status(404).json({ success: false, message: "Admin not found" });
        }

        res.json({ success: true, message: "Profile updated successfully" });
    } catch (err) {
        console.error("Backend Error:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// Booking Created on Particular Admin's Venue's
router.get('/particularAdmin/bookings', async (req, res) => {
    try {
        const { adminId } = req.query;
        const query = adminId ? { adminId: adminId } : {};
        const bookings = await Booking.find(query)
            .populate('venueId') 
            .sort({ submittedAt: -1 });
        
        res.status(200).json({ success: true, bookings });
    } catch (err) {
        console.error("Admin Fetch Error:", err);
        res.status(500).json({ success: false, message: "Error fetching filtered bookings" });
    }
});
// Generate Bill
router.get('/generate-bill/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        const booking = await Booking.findById(bookingId);
        if (!booking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }
        const [venue, admin] = await Promise.all([
            Venue.findById(booking.venueId),
            Admin.findById(booking.adminId) 
        ]);
        const lastInvoice = await Billing.findOne().sort({ createdAt: -1 });
        let nextNumber = 1;
        if (lastInvoice && lastInvoice.invoiceNumber) {
            const lastNumMatch = lastInvoice.invoiceNumber.match(/\d+/);
            if (lastNumMatch) nextNumber = parseInt(lastNumMatch[0]) + 1;
        }
        const formattedInvoiceNum = `#ASC-${nextNumber.toString().padStart(4, '0')}`;

        res.json({ 
            success: true, 
            bill: {
                invoiceNumber: formattedInvoiceNum,
                date: new Date().toLocaleString('en-GB'), 
                customer: booking.bookedBy,
                email: booking.email,
                contact: booking.contact,
                venue: venue ? venue.name : "N/A",
                venueAddress: venue ? venue.address : "N/A",
                venueGst: admin?.businessDetails?.gstNumber || "N/A",
                venuefssai: admin?.businessDetails?.foodLicense || "N/A",
                venueContact: venue ? venue.phone : "N/A",
                paid: booking.paymentAmount || 0,
                total: venue?.cost || 0,
                bookingDate: booking.bookingDate
            }
        });

    } catch (err) {
        console.error("[Critical Billing Error]:", err);
        res.status(500).json({ success: false, error: err.message });
    }
});
// Save Invoice
router.post('/save-invoice', async (req, res) => {
    try {
        const existingInvoice = await Billing.findOne({ invoiceNumber: req.body.invoiceNumber });
        if (existingInvoice) {
            return res.status(400).json({ 
                success: false, 
                message: "This invoice number already exists in the database." 
            });
        }
        const newInvoice = new Billing(req.body);
        await newInvoice.save();

        res.status(201).json({ 
            success: true, 
            message: "Invoice and billing table saved successfully!" 
        });

    } catch (err) {
        console.error("Database Save Error:", err.message);
        res.status(500).json({ 
            success: false,
            message: "Server Error: " + err.message 
        });
    }
});
// Fetch Billing History
router.get('/billing/history', async (req, res) => {
    try {
        const { adminId } = req.query;
        const query = adminId ? { adminId: adminId } : {};
        const bills = await Billing.find(query).sort({ createdAt: -1 });
        res.status(200).json({
            success: true,
            bills: bills
        });
    } catch (err) {
        console.error("Master List Fetch Error:", err.message);
        res.status(500).json({
            success: false,
            message: "Failed to fetch billing history: " + err.message
        });
    }
});




module.exports = router;
const express = require('express');
const router = express.Router();
const Admin = require('../models/Admin');
const Booking = require('../models/Booking');
const Venue = require('../models/Venue');
const multer = require('multer');
const path = require('path');
const mongoose = require('mongoose');
const Billing = require('../models/Billing');
const AadharService = require('../services/aadharService');
const Refund = require('../models/Refund');

// Configuration for Refund Receipts storage engine
const refundStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadDir = 'public/uploads/refunds/';
        const fs = require('fs'); // Ensure fs is available to check directory states
        // Dynamically create folder path if it does not exist locally
        if (!fs.existsSync(uploadDir)){
            fs.mkdirSync(uploadDir, { recursive: true });
        }
        cb(null, uploadDir);
    },
    filename: (req, file, cb) => {
        cb(null, 'refund-receipt-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadRefund = multer({ storage: refundStorage });
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
router.get('/bookings/particular/:id', async (req, res) => {
    try {
        const booking = await Booking
            .findById(req.params.id)
            .populate('userId');
        if (!booking) {
            return res.status(404).json({
                success: false,
                message: "Booking not found"
            });
        }
        res.json({
            success: true,
            booking: {
                _id: booking._id,
                bookedBy: booking.bookedBy,
                email: booking.email,
                contact: booking.contact,
                paymentAmount: booking.paymentAmount,
                bookingDate: booking.bookingDate,
                status: booking.status,
                upiId: booking.userId?.paymentData?.upiId || '',
                accountNumber: booking.userId?.paymentData?.bankAccount || '',
                ifscCode: booking.userId?.paymentData?.ifscCode || '',
                preferredPayment: booking.userId?.paymentData?.preferredPayment || ''
            }
        });
    } catch (err) {
        console.error(err);
        res.status(500).json({
            success: false,
            message: err.message
        });
    }
});
// update status of venue
router.patch("/venue/:id/status", async (req, res) => {
    try {
        const venue = await Venue.findById(req.params.id);

        if (!venue) {
            return res.status(404).json({
                message: "Venue not found"
            });
        }

        // Toggle status
        venue.status =
            venue.status === "ACTIVE"
                ? "INACTIVE"
                : "ACTIVE";

        await venue.save();

        res.json({
            message: "Venue status updated",
            status: venue.status
        });

    } catch (error) {
        res.status(500).json({
            message: error.message
        });
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
// Step 1: User clicks "Validate" -> Triggers SMS for AADHAR verification
router.post('/aadhar/verify-init', async (req, res) => {
    try {
        const { aadharNumber } = req.body;
        console.log(aadharNumber);
        if (!aadharNumber || aadharNumber.length !== 12) {
            return res.status(400).json({ success: false, message: "Valid 12-digit ID is required." });
        }
        console.log("1");
        const result = await AadharService.generateOTP(aadharNumber);
        console.log("2");
        // SurePass returns data inside result.data
        res.json({ 
            success: true, 
            client_id: result.data.client_id, 
            message: "OTP sent to your linked mobile number." 
        });
    } catch (err) {
        console.log("Here it is!");
        console.error("Init Error:", err.message);
        res.status(400).json({ success: false, message: err.message });
    }
});

// Step 2: User enters OTP in Popup -> Final Verification
router.post('/aadhar/verify-confirm', async (req, res) => {
    try {
        const { otp, client_id, adminId } = req.body;

        if (!otp || !client_id) {
            return res.status(400).json({ success: false, message: "OTP and Session ID are required." });
        }

        const result = await AadharService.verifyOTP(otp, client_id);

        if (result.success) {
            // result.data contains full_name, aadhaar_number (masked), dob, etc.
            await Admin.findByIdAndUpdate(adminId, {
                'businessDetails.aadharVerified': true,
                'businessDetails.aadharName': result.data.full_name,
                // Best practice: store the masked version returned by the API
                'businessDetails.aadharNumber': result.data.aadhaar_number 
            });

            res.json({ 
                success: true, 
                message: "Identity Verified!", 
                data: {
                    fullName: result.data.full_name,
                    isVerified: true
                }
            });
        }
    } catch (err) {
        console.error("Confirm Error:", err.message);
        res.status(400).json({ success: false, message: err.message });
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

router.get('/billing/history', async (req, res) => {
    try {
        const { bookingId } = req.query;

        // Filter by bookingId
        const query = bookingId ? { bookingId } : {};

        const bills = await Billing.find(query)
            .sort({ createdAt: -1 });

        res.status(200).json({
            success: true,
            bills
        });

    } catch (err) {
        console.error("Master List Fetch Error:", err.message);

        res.status(500).json({
            success: false,
            message: "Failed to fetch billing history: " + err.message
        });
    }
});

// ==========================================
// ADMIN ROUTE: PROCESS AND SAVE REFUNDS TO DB (MONGODB ATLAS)
// ==========================================
router.post('/bookings/refund/:bookingId', uploadRefund.single('refundScreenshot'), async (req, res) => {
    try {
        const { bookingId } = req.params;
        const {
            adminId,
            payoutMode,
            amountRefunded,
            userName,
            userEmail,
            userPhone,
            upiId,
            accountHolder,
            accountNumber,
            ifscCode
        } = req.body;

        // Verify if file has reached the storage engine safely
        if (!req.file) {
            return res.status(400).json({ 
                success: false, 
                message: "Transaction confirmation screenshot is required." 
            });
        }

        // Standardize the screenshot accessibility URL path
        const screenshotUrlPath = `/uploads/refunds/${req.file.filename}`;

        // Construct document payload structure for your MongoDB Atlas cluster
        const refundData = {
            bookingId: bookingId,
            adminId: adminId,
            userName: userName,
            userEmail: userEmail,
            userPhone: userPhone,
            amountRefunded: parseFloat(amountRefunded),
            payoutMode: payoutMode,
            screenshotProofPath: screenshotUrlPath
        };

        // Conditionally set routing parameters matching your active payout toggles
        if (payoutMode === 'UPI') {
            refundData.upiDetails = { upiId };
        } else if (payoutMode === 'BANK') {
            refundData.bankDetails = {
                accountHolder,
                accountNumber,
                ifscCode
            };
        }

        // Save parameters into your independent Refund schema
        const newRefund = new Refund(refundData);
        await newRefund.save();

        // Cross-update main booking record status to state execution resolve
        await Booking.findByIdAndUpdate(bookingId, { status: 'Refunded' });

        res.status(201).json({
            success: true,
            message: "Refund logged successfully in MongoDB Atlas database."
        });

    } catch (err) {
        console.error("MDB Atlas Refund Storage Failure:", err);
        res.status(500).json({ 
            success: false, 
            message: "Database Save Error: " + err.message 
        });
    }
});



module.exports = router;


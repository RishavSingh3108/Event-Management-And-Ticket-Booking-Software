const express = require('express');
const mongoose = require('mongoose');
const path = require('path');
const cors = require('cors'); 
const bcrypt = require('bcryptjs');
require('dotenv').config();

const app = express();

const multer = require('multer');
const nodemailer = require('nodemailer');
const twilio = require('twilio');
const storage = multer.memoryStorage();
const upload = multer({ 
    storage: storage,
    limits: { fileSize: 5 * 1024 * 1024 } 
});
const billingRoutes = require('./routes/billing');

// Ensure this matches the 'api/billing' part of your fetch URL
app.use('/api/billing', billingRoutes);

// 1. Middlewares
app.use(cors()); 
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public'))); 

// 2. Models
const Venue = require('./models/Venue');
const User = require('./models/User');
const Admin = require('./models/Admin');

// 3. Database Connection
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log("✅ MongoDB Connected Successfully"))
    .catch(err => console.log("❌ MongoDB Connection Error:", err));

// 4. Routes
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'home', 'home.html'));
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
        const { adminId } = req.query;
        const filter = adminId ? { adminId: adminId } : {};
        const venues = await Venue.find(filter); 
        
        res.status(200).json(venues); 
    } catch (err) {
        console.error("Fetch Error:", err);
        res.status(500).json({ message: "Server error while fetching venues" });
    }
});


// =======================================
// BOOKING API ROUTES
// =======================================

// Booking can be done by user for any venue
const Booking = require('./models/Booking');
// POST: Create a new booking with conflict check

app.post('/api/bookings', upload.single('screenshot'), async (req, res) => {
    try {
        console.log("Incoming Body Text Data:", req.body);
        console.log("Incoming File Data:", req.file);

        const { venueId, adminId, bookingDate, userId, paymentType, paymentAmount } = req.body;

       
        console.log("Full req.body:", req.body);
        if (!req.body.adminId) {
            console.error("CRITICAL: adminId is missing from req.body");
        }

        // 1. Basic Validations
        if (!userId) {
            return res.status(400).json({ success: false, message: "User ID is missing!" });
        }
        if (!req.file) {
            return res.status(400).json({ success: false, message: "Payment screenshot is required!" });
        }

        // 2. Check for duplicate bookings
        const existingBooking = await Booking.findOne({ venueId, bookingDate });
        if (existingBooking) {
            return res.status(400).json({ success: false, message: "Date already reserved." });
        }

        // 3. Create new booking with the file buffer
        const newBooking = new Booking({
            // 1. Core Identification
            userId: req.body.userId,            // The customer's ID
            adminId: req.body.adminId,          // Your ID (Rishav Raj), essential for dashboard stats
            venueId: req.body.venueId,          // The specific venue being booked

            // 2. Booking Specifics
            bookingDate: req.body.bookingDate,
            guests: Number(req.body.guests),    // Ensure numeric format
            bookedBy: req.body.bookedBy,
            contact: req.body.contact,
            email: req.body.email,
            purpose: req.body.purpose,
            requirements: req.body.requirements,

            // 3. Payment Details
            paymentType: req.body.paymentType,
            paymentAmount: Number(req.body.paymentAmount), // Crucial for "Total Profit" calculation

            // 4. File Upload (Multer Buffer)
            paymentScreenshot: {
                data: req.file.buffer,          // Storing the image as binary data in MongoDB
                contentType: req.file.mimetype  // e.g., 'image/jpeg' or 'image/png'
            },

            // 5. Status & Metadata
            status: 'Pending',                  // Default status as per your schema
            submittedAt: new Date()             // Tracks when the request was made
        });

        await newBooking.save();
        
        res.status(201).json({ success: true, message: "Booking and Payment submitted successfully!" });
    } catch (err) {
        console.error("SAVE ERROR:", err);
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

// =======================================
// NEW ADMIN BOOKING ROUTES (ADD THESE)
// =======================================

app.get('/api/admin/bookings', async (req, res) => {
    try {
        // 1. Get the adminId from the query parameters
        const { adminId } = req.query;

        // 2. Build the query object: filter by adminId if it's provided
        const query = adminId ? { adminId: adminId } : {};

        // 3. Find and populate as before, but with the specific filter
        const bookings = await Booking.find(query)
            .populate('venueId') 
            .sort({ submittedAt: -1 });
        
        res.status(200).json({ success: true, bookings });
    } catch (err) {
        console.error("Admin Fetch Error:", err);
        res.status(500).json({ success: false, message: "Error fetching filtered bookings" });
    }
});

// 2. SERVE SCREENSHOT IMAGE (Streams the buffer to the <img> tag)
app.get('/api/bookings/screenshot/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking || !booking.paymentScreenshot || !booking.paymentScreenshot.data) {
            return res.status(404).send('Image not found');
        }
        
        // Set the header to image/png or image/jpeg
        res.set('Content-Type', booking.paymentScreenshot.contentType);
        // Send the raw binary data
        res.send(booking.paymentScreenshot.data);
    } catch (err) {
        res.status(500).send('Error retrieving image');
    }
});

// 3. UPDATE BOOKING STATUS (Approve/Reject)
app.put('/api/bookings/status/:id', async (req, res) => {
    try {
        const { status } = req.body; // 'Approved' or 'Rejected'
        const updatedBooking = await Booking.findByIdAndUpdate(
            req.params.id, 
            { status: status }, 
            { new: true }
        );

        if (!updatedBooking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.json({ success: true, message: `Booking ${status} successfully!` });
    } catch (err) {
        res.status(500).json({ success: false, message: "Update failed" });
    }
});

// --- Place this ABOVE your 'app.get(*)' route ---
app.put('/api/bookings/update-date/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const { newDate } = req.body;

        // 1. Get the current booking to know which venue we are talking about
        const currentBooking = await Booking.findById(id);
        if (!currentBooking) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        // 2. CHECK AVAILABILITY: 
        // Look for any OTHER approved booking for the SAME venue on the SAME new date
        const conflict = await Booking.findOne({
            _id: { $ne: id }, // Don't count the current booking itself
            venueId: currentBooking.venueId,
            bookingDate: newDate,
            status: "Approved" // Only block if the other booking is already approved
        });

        if (conflict) {
            return res.status(400).json({ 
                success: false, 
                message: "This date is already occupied by another event. Please choose a different date." 
            });
        }

        // 3. If no conflict, update the date
        currentBooking.bookingDate = newDate;
        await currentBooking.save();

        res.json({ success: true, message: "Date updated successfully!" });

    } catch (err) {
        console.error("Conflict Check Error:", err);
        res.status(500).json({ success: false, message: "Internal server error" });
    }
});

// --- DELETE BOOKING API ---
app.delete('/api/bookings/:id', async (req, res) => {
    try {
        const bookingId = req.params.id;
        
        const result = await Booking.findByIdAndDelete(bookingId);

        if (!result) {
            return res.status(404).json({ success: false, message: "Booking not found" });
        }

        res.status(200).json({ success: true, message: "Booking deleted successfully" });
    } catch (error) {
        console.error("Delete Error:", error);
        res.status(500).json({ success: false, message: "Server error during deletion" });
    }
});

// Route: Update Business Credentials
// server.js
app.put('/api/admin/update-profile', async (req, res) => {
    try {
        const { userId, gst, aadhar, fssai, gps } = req.body;
        
        // Use findByIdAndUpdate for the most direct match with the MongoDB _id
        const updatedUser = await User.findByIdAndUpdate(
            userId, 
            {
                $set: {
                    'businessDetails.gstNumber': gst,
                    'businessDetails.aadharNumber': aadhar,
                    'businessDetails.foodLicense': fssai,
                    'businessDetails.gpsLocation': gps
                }
            },
            { new: true } // Returns the updated document
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

const adminStorage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'public/uploads/'); // Ensure this folder exists in your project
    },
    filename: (req, file, cb) => {
        // Creates a unique name: admin-1714500000-image.jpg
        cb(null, 'admin-' + Date.now() + path.extname(file.originalname));
    }
});
const uploadAdmin = multer({ storage: adminStorage }); // Fixed property name

// Corrected Photo Upload Route
app.post('/api/admin/upload-photo', uploadAdmin.single('adminPhoto'), async (req, res) => {
    try {
        const { userId } = req.body; // Captured from FormData
        
        if (!req.file) {
            return res.status(400).json({ success: false, message: "No file uploaded" });
        }

        const imagePath = `/uploads/${req.file.filename}`;

        // Find the user by ID and update their profileImage path
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { profileImage: imagePath },
            { new: true }
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

// GET: Fetch Admin Profile Data
app.get('/api/admin/get-profile', async (req, res) => {
    try {
        const userId = req.query.id; // Correctly pull 'id' from the URL query
        const admin = await User.findById(userId);

        if (!admin) {
            return res.status(404).json({ success: false, message: "Admin not found in Atlas" });
        }

        res.json({ success: true, data: admin });
    } catch (err) {
        res.status(500).json({ success: false, error: err.message });
    }
});
app.get('/api/admin/dashboard-stats', async (req, res) => {
    try {
        const { userId } = req.query;
        const adminProfile = await User.findById(userId); 

        // Existing count and aggation logic
        const totalVenues = await Venue.countDocuments({ adminId: userId });
        const stats = await Booking.aggregate([
            { $match: { adminId: new mongoose.Types.ObjectId(userId) } },
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
const Billing = require('./models/Billing'); // Double-check this folder/file path

app.post('/api/admin/save-invoice', async (req, res) => {
    try {
        // Log to terminal to verify the incoming IDs (adminId, customerId, etc.)
        console.log("Incoming Invoice Data:", req.body);

        // 1. Check for duplicate Invoice Number
        const existingInvoice = await Billing.findOne({ invoiceNumber: req.body.invoiceNumber });
        if (existingInvoice) {
            return res.status(400).json({ 
                success: false, 
                message: "This invoice number already exists in the database." 
            });
        }

        // 2. Direct assignment using your preferred req.body method
        const newInvoice = new Billing(req.body);

        // 3. Save to MongoDB
        await newInvoice.save();

        res.status(201).json({ 
            success: true, 
            message: "Invoice and billing table saved successfully!" 
        });

    } catch (err) {
        // CRITICAL: This will tell you exactly which field caused the 500 error
        console.error("Database Save Error:", err.message);
        
        res.status(500).json({ 
            success: false,
            message: "Server Error: " + err.message 
        });
    }
});
app.get('/api/admin/generate-bill/:id', async (req, res) => {
    try {
        const booking = await Booking.findById(req.params.id);
        if (!booking) return res.status(404).json({ success: false });
        // const venue = await Venue.findById(booking.venueId);
        const [venue, admin] = await Promise.all([
            Venue.findById(booking.venueId),
            User.findById(booking.adminId) 
        ]);
        const lastInvoice = await Billing.findOne().sort({ createdAt: -1 });
        let nextNumber = 1;
        if (lastInvoice && lastInvoice.invoiceNumber) {
            const lastNumMatch = lastInvoice.invoiceNumber.match(/\d+/);
            if (lastNumMatch) nextNumber = parseInt(lastNumMatch[0]) + 1;
        }
        const formattedInvoiceNum = `#ASC-${nextNumber.toString().padStart(4, '0')}`;
        const now = new Date();
        const datePart = now.toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
        const timePart = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });

        res.json({ 
            success: true, 
            bill: {
                invoiceNumber: formattedInvoiceNum,
                date: `${datePart}, ${timePart}`, 
                customer: booking.bookedBy, // 
                email: booking.email,
                contact: booking.contact,
                // Venue Details fetched from the Venue collection
                venue: venue ? venue.name : "Event Venue",
                venueAddress: venue ? venue.address : "N/A",
                venueContact: venue ? venue.phone : "N/A",
                total: venue.cost || 0,
                //Admin Details
                venueGst: admin?.businessDetails ? admin.businessDetails.gstNumber : "N/A",
                venuefssai: admin?.businessDetails ? admin.businessDetails.foodLicense : "N/A",
                // Financial Details
                paid: booking.paymentAmount || 0,
                cid: booking.userId,
                vid: booking.venueId,
                bookingDate: booking.bookingDate
            }
        });
    } catch (err) {
        console.error("Error fetching details:", err);
        res.status(500).json({ success: false });
    }
});
// GET: Fetch all Billing History for the Master List
app.get('/api/billing/history', async (req, res) => {
    try {
        // 1. Get adminId from query (passed from localStorage in your JS)
        const { adminId } = req.query;

        // 2. Build the query: Filter by adminId if it exists
        const query = adminId ? { adminId: adminId } : {};

        // 3. Find bills, sort by newest first (descending createdAt)
        const bills = await Billing.find(query).sort({ createdAt: -1 });

        // 4. Return the data to billing.js
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
const otpSchema = new mongoose.Schema({
    target: { type: String, required: true }, // The email or phone
    otp: { type: String, required: true },    // The 6-digit code
    createdAt: { 
        type: Date, 
        default: Date.now, 
        index: { expires: 300 } // This deletes the code automatically after 5 minutes
    }
});

// This creates the 'OTPModel' variable that was missing
const OTPModel = mongoose.model('OTP', otpSchema);
// 1. Configure the Email Transporter
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS
    }
});

const accountSid = process.env.TWILIO_SID;; 
const authToken = process.env.TWILIO_TOKEN; 

const client = twilio(accountSid, authToken);

// 2. Generate a 6-Digit OTP
const generateOTP = () => Math.floor(100000 + Math.random() * 900000).toString();

// 3. API Route to Send OTP
app.post('/api/auth/send-otp', async (req, res) => {
    const { target, type } = req.body;
    const otp = generateOTP();

    try {
        if (type === 'email') {
            await transporter.sendMail({
                from: '"EventHub Team" <rishav310805@gmail.com>',
                to: target,
                subject: "Your EventHub Verification Code",
                html: `<b>Your OTP is ${otp}</b>`
            });
        }
        else if (type === 'phone') {
            // WHATSAPP LOGIC
            await client.messages.create({
                from: '+18562809398', // Twilio Sandbox Number
                to: `+91${target}`,   // User's number
                body: `Your EventHub verification code is: ${otp}`
            });
        }
        
        await OTPModel.create({ target, otp });
        res.json({ success: true, message: "OTP sent!" });

    } catch (error) {
        // This log will appear in your TERMINAL
        console.error("CRITICAL SERVER ERROR:", error.message);
        
        // This sends the error message to your BROWSER console
        res.status(500).json({ success: false, error: error.message });
    }
});
// 4. API Route to Verify OTP
app.post('/api/auth/verify-otp', async (req, res) => {
    const { target, otp } = req.body;

    try {
        const record = await OTPModel.findOne({ target, otp });

        if (record) {
            await OTPModel.deleteOne({ _id: record._id });
            res.json({ success: true, message: "Email verified successfully!" });
        } else {
            res.status(400).json({ success: false, message: "Invalid or expired OTP." });
        }
    } catch (error) {
        console.error("Verification Error:", error.message);
        res.status(500).json({ success: false, error: error.message });
    }
});
app.post('/api/auth/forgot-password-otp', async (req, res) => {
    try {
        const { email } = req.body;

        // 1. Check if the user exists in your User database
        // (Assuming your user model is called 'User')
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "Email not registered." });
        }

        // 2. Generate a 6-digit OTP
        const otp = Math.floor(100000 + Math.random() * 900000).toString();

        // 3. Clean up old OTPs for this email and save the new one
        // We use 'target' to match your Schema
        await OTPModel.deleteMany({ target: email });

        const newOtpEntry = new OTPModel({
            target: email, 
            otp: otp
        });
        await newOtpEntry.save();

        // 4. Send Email using your Transporter
        const mailOptions = {
            from: process.env.EMAIL_USER,
            to: email,
            subject: 'EventHub - Password Reset OTP',
            text: `Your OTP for password reset is: ${otp}. It will expire in 5 minutes.`
        };

        await transporter.sendMail(mailOptions);

        res.json({ success: true, message: "OTP sent successfully!" });

    } catch (err) {
        console.error("Forgot OTP Send Error:", err);
        res.status(500).json({ success: false, message: "Failed to send OTP. Please try again." });
    }
});
app.post('/api/auth/verify-reset-otp', async (req, res) => {
    try {
        const { email, otp } = req.body;

        // Use 'OTPModel' to match your send-otp logic and definition
        const otpRecord = await OTPModel.findOne({ 
            target: email, 
            otp: otp 
        });

        if (!otpRecord) {
            // If no record is found, it's either the wrong code or it expired (TTL deleted it)
            return res.status(400).json({ 
                success: false, 
                message: "Invalid or expired OTP. Please request a new one." 
            });
        }
        await OTPModel.deleteOne({ _id: otpRecord._id });

        // Success! 
        res.json({ success: true, message: "OTP verified successfully." });

    } catch (error) {
        console.error("Verification Error:", error);
        // Returning JSON prevents the "Unexpected token <" error on the frontend
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});
app.post('/api/auth/reset-password', async (req, res) => {
    try {
        const { email, newPassword } = req.body;

        // 1. Find user
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(404).json({ success: false, message: "User not found." });
        }

        // 2. Hash the new password before saving
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        // 3. Update and Save
        user.password = hashedPassword;
        await user.save();

        res.json({ success: true, message: "Password updated successfully." });
    } catch (error) {
        console.error("Bcrypt Update Error:", error);
        res.status(500).json({ success: false, message: "Server error." });
    }
});

app.post('/api/register', async (req, res) => {
   
    try {
        const { name, dob, email, phone, password, role } = req.body;
        const existingUser = await User.findOne({ email });
        const existingAdmin = await Admin.findOne({ email });

        if (existingUser || existingAdmin) {
            return res.status(400).json({ success: false, message: "Email already registered!" });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        if (role === 'Admin') {
            const newAdmin = new Admin({ 
                name, 
                dob, 
                email, 
                phone, 
                password: hashedPassword, 
                role 
            });
            await newAdmin.save();
        } else {
            const newUser = new User({ 
                name, 
                dob, 
                email, 
                phone, 
                password: hashedPassword, 
                role 
            });
            await newUser.save();
        }

        res.status(201).json({ success: true, message: "Registration successful!" });

    } catch (err) {
        console.error("Reg Error:", err.message);
        res.status(500).json({ success: false, message: "Error saving to database." });
    }
});
app.post('/api/login', async (req, res) => {
    try {
        const { email, password, role } = req.body;
        if (!email || !password || !role) {
            return res.status(400).json({ success: false, message: "All fields are required." });
        }
        const Model = (role === 'Admin') ? Admin : User;
        const account = await Model.findOne({ email });

        if (!account) {
            return res.status(401).json({ success: false, message: "Invalid email or role." });
        }
        const isMatch = await bcrypt.compare(password, account.password); 

        if (!isMatch) {
            return res.status(401).json({ success: false, message: "Incorrect password." });
        }
        res.status(200).json({
            success: true,
            message: `Welcome back, ${account.name}!`,
            user: {
                id: account._id,
                name: account.name,
                email: account.email,
                role: account.role
            }
        });

    } catch (err) {
        console.error("Login Error:", err.message);
        res.status(500).json({ success: false, message: "Internal server error." });
    }
});

//  THIS SHOULD BE AT THE BOTTOM
app.use(express.static(path.join(__dirname, 'public')));


// 5. Start Server
const PORT = 3000;

app.listen(PORT, () => {
    console.log(`🚀 Server running at http://localhost:${PORT}`);
});

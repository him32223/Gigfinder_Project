require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose'); // NEW: Import Mongoose
const fs = require('fs');
const crypto = require('crypto'); // Add this near your other requires

const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- LOGGER ---
app.use((req, res, next) => {
    console.log(`[${new Date().toISOString()}] ${req.method} ${req.url}`);
    next(); 
});

// ==========================================
// 1. MONGODB CONNECTION & SCHEMAS
// ==========================================
// Change this:
// mongoose.connect(process.env.MONGO_URI, { useNewUrlParser: true, useUnifiedTopology: true })

// To this (The simple, modern way):
mongoose.connect(process.env.MONGO_URI)
    .then(() => console.log('✅ Connected to MongoDB Atlas!'))
    .catch(err => console.error('❌ MongoDB Connection Error:', err));

// Define User Schema
const User = mongoose.model('User', new mongoose.Schema({
    email: { type: String, required: true, unique: true },
    password: { type: String, required: true },
    role: { type: String, default: 'user' },
    suspensionEnd: { type: Date, default: null },
    resetToken: { type: String, default: null },       // NEW
    resetTokenExpiry: { type: Date, default: null }    // NEW
}));

// Define Event Schema
const Event = mongoose.model('Event', new mongoose.Schema({
    name: String,
    date: String,
    time: String,        // NEW: Start Time
    location: String,    // NEW: City/State (e.g., Penang)
    venue: String,
    venueDesc: String,
    price: Number,
    capacity: Number,
    sold: { type: Number, default: 0 },
    image: String,
    venueImage: String
}));

// Define Booking Schema
const Booking = mongoose.model('Booking', new mongoose.Schema({
    eventId: String,
    eventName: String,
    user: String,
    quantity: Number,
    totalPrice: Number,
    date: { type: Date, default: Date.now }
}));

// ==========================================
// 2. EMAIL & UPLOAD CONFIGURATION (Kept the same)
// ==========================================
const transporter = nodemailer.createTransport({
    service: 'gmail',
    auth: { user: process.env.EMAIL_USER, pass: process.env.EMAIL_PASS }
});

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads'); 
        if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath, { recursive: true });
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => cb(null, file.fieldname + '-' + Date.now() + '.jpg')
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') cb(null, true);
    else cb(new Error('Only .jpg files allowed!'), false);
};
const upload = multer({ storage, fileFilter });

// ==========================================
// 3. API ROUTES (Rewritten for MongoDB)
// ==========================================

// Helper to format MongoDB _id to id for React
const formatDoc = (doc) => ({ ...doc.toObject(), id: doc._id.toString() });

// -- SEED ROUTE (Run this ONCE in browser to populate empty DB) --
app.get('/api/seed', async (req, res) => {
    await User.deleteMany({});
    await Event.deleteMany({});
    await Booking.deleteMany({});

    await User.create({ email: 'admin@gigfinder.com', password: 'admin', role: 'admin' });
    
    await Event.create([
        { name: "The Midnight", date: "2026-02-14", venue: "KL Live", venueDesc: "Synthwave legends return.", price: 150, capacity: 100, sold: 85, image: "https://images.unsplash.com/photo-1574391884720-3850ea71e83f?q=80&w=1000", venueImage: "https://images.unsplash.com/photo-1516450360452-9312f5e86fc7?q=80&w=1000" },
        { name: "Coldplay", date: "2026-03-01", venue: "Bukit Jalil", venueDesc: "Massive stadium production.", price: 300, capacity: 5000, sold: 1200, image: "https://images.unsplash.com/photo-1493225255756-d9584f8606e9?q=80&w=1000", venueImage: "https://upload.wikimedia.org/wikipedia/commons/e/e6/Bukit_Jalil_National_Stadium_2017.jpg" }
    ]);
    res.json({ message: "Database seeded successfully! You can now log in." });
});

app.post('/api/upload', (req, res) => {
    upload.single('image')(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        res.json({ imageUrl: `http://localhost:5000/uploads/${req.file.filename}` });
    });
});

app.get('/api/events', async (req, res) => {
    const events = await Event.find();
    res.json(events.map(formatDoc));
});

app.get('/api/events/search', async (req, res) => {
    const query = req.query.q;
    // MongoDB Regex Search (Finds text that contains the query, case-insensitive)
    const events = await Event.find({
        $or:[ { name: new RegExp(query, 'i') }, { venue: new RegExp(query, 'i') } ]
    });
    res.json(events.map(formatDoc));
});

app.post('/api/register', async (req, res) => {
    try {
        const { email, password } = req.body;
        const existingUser = await User.findOne({ email });
        if (existingUser) return res.status(400).json({ message: "User exists" });

        const newUser = await User.create({ email, password });
        res.status(201).json({ message: "Registration Successful!", user: formatDoc(newUser) });
    } catch (err) { res.status(500).json({ error: err.message }); }
});

// --- FORGOT PASSWORD ROUTE ---
app.post('/api/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await User.findOne({ email });
        
        if (!user) return res.status(404).json({ message: "If this email exists, a link will be sent." }); // Security best practice

        // Generate a random 20-character token
        const token = crypto.randomBytes(20).toString('hex');
        
        // Save token and set expiration to 1 hour from now
        user.resetToken = token;
        user.resetTokenExpiry = Date.now() + 3600000; 
        await user.save();

        // Create the reset link (points to your React frontend)
        const resetLink = `http://localhost:3000/#reset-password/${token}`;

        const mailOptions = {
            from: `"GigFinder Support" <${process.env.EMAIL_USER}>`,
            to: email,
            subject: `🔒 GigFinder Password Reset`,
            html: `
                <div style="background:#121212; color:#fff; padding:20px; border-radius:8px;">
                    <h2 style="color:#bb86fc;">Password Reset Request</h2>
                    <p>You requested to reset your GigFinder password.</p>
                    <p>Click the link below to securely set a new password. This link expires in 1 hour.</p>
                    <a href="${resetLink}" style="background:#03dac6; color:#000; padding:10px 20px; text-decoration:none; border-radius:4px; display:inline-block; margin-top:10px;">Reset Password</a>
                    <p style="color:#888; margin-top:20px; font-size:12px;">If you did not request this, please ignore this email.</p>
                </div>
            `
        };

        transporter.sendMail(mailOptions);
        res.json({ message: "Password reset link sent to your email!" });

    } catch (error) {
        res.status(500).json({ message: "Error processing request" });
    }
});

// --- RESET PASSWORD ROUTE ---
app.post('/api/reset-password', async (req, res) => {
    try {
        const { token, newPassword } = req.body;
        
        // Find user with this token AND ensure it hasn't expired
        const user = await User.findOne({ 
            resetToken: token, 
            resetTokenExpiry: { $gt: Date.now() } 
        });

        if (!user) return res.status(400).json({ message: "Invalid or expired token." });

        // Update password and clear the tokens
        user.password = newPassword;
        user.resetToken = null;
        user.resetTokenExpiry = null;
        await user.save();

        res.json({ message: "Password successfully reset! You can now log in." });

    } catch (error) {
        res.status(500).json({ message: "Error resetting password" });
    }
});


app.post('/api/login', async (req, res) => {
    const { email, password } = req.body;
    const user = await User.findOne({ email, password });

    if (user) {
        if (user.suspensionEnd && new Date() < user.suspensionEnd) {
            return res.status(403).json({ message: `Suspended until ${user.suspensionEnd.toLocaleDateString()}` });
        }
        user.suspensionEnd = null;
        await user.save();
        res.json({ message: "Login successful", user: formatDoc(user) });
    } else res.status(401).json({ message: "Invalid credentials" });
});

app.post('/api/book', async (req, res) => {
    const { eventId, user, quantity, eventName, totalPrice } = req.body;
    
    // Find Event in MongoDB by ID
    const event = await Event.findById(eventId);
    if (!event) return res.status(404).json({ message: "Event not found" });
    if (event.sold + quantity > event.capacity) return res.status(400).json({ message: `Not enough tickets!` });
    
    // Update Inventory
    event.sold += quantity;
    await event.save();

    // Create Booking
    const newBooking = await Booking.create({ eventId, eventName, user, quantity, totalPrice });

    // --- UPDATED: SEND REAL EMAIL WITH FULL DETAILS ---
    const mailOptions = {
        from: `"GigFinder Tickets" <${process.env.EMAIL_USER}>`,
        to: user, 
        subject: `🎟️ Your Tickets for ${eventName} are Confirmed!`,
        html: `
            <div style="font-family: Arial, sans-serif; background-color: #121212; color: #ffffff; padding: 25px; border-radius: 10px; max-width: 600px; margin: auto;">
                <h1 style="color: #bb86fc; text-align: center;">GigFinder</h1>
                <h2 style="color: #03dac6; text-align: center;">Booking Confirmed! 🎉</h2>
                <p>Hi there,</p>
                <p>You have successfully secured your spot for <strong>${eventName}</strong>.</p>
                
                <div style="background-color: #1e1e1e; padding: 15px; border-radius: 8px; border-left: 4px solid #bb86fc; margin: 20px 0;">
                    <p style="margin: 5px 0;"><strong>Booking ID:</strong> #${newBooking._id}</p>
                    <p style="margin: 5px 0;"><strong>Date:</strong> ${event.date}</p>
                    <p style="margin: 5px 0;"><strong>Time:</strong> ${event.time}</p>
                    <p style="margin: 5px 0;"><strong>Location:</strong> ${event.venue}, ${event.location}</p>
                    <hr style="border: 0; border-top: 1px solid #333; margin: 10px 0;">
                    <p style="margin: 5px 0;"><strong>Quantity:</strong> ${quantity} Ticket(s)</p>
                    <p style="margin: 5px 0; font-size: 1.2rem; color: #03dac6;"><strong>Total Paid:</strong> RM ${totalPrice}</p>
                </div>
                
                <p style="color: #b0b0b0; font-size: 13px; text-align: center;">
                    Please present this email at the venue entrance. 
                    <br>Enjoy the show!
                </p>
            </div>
        `
    };
    transporter.sendMail(mailOptions).catch(console.error);

    res.status(201).json({ message: "Booking Confirmed!", booking: formatDoc(newBooking) });
});

app.get('/api/bookings/:email', async (req, res) => {
    const bookings = await Booking.find({ user: req.params.email });
    res.json(bookings.map(formatDoc));
});

app.delete('/api/bookings/:id', async (req, res) => {
    const booking = await Booking.findById(req.params.id);
    if (!booking) return res.status(404).json({ message: "Not found" });
    
    const event = await Event.findById(booking.eventId);
    if (event) {
        event.sold -= booking.quantity;
        if(event.sold < 0) event.sold = 0;
        await event.save();
    }
    
    await Booking.findByIdAndDelete(req.params.id);
    res.json({ message: "Cancelled" });
});

app.get('/api/admin/users', async (req, res) => {
    const users = await User.find({ role: { $ne: 'admin' } });
    res.json(users.map(formatDoc));
});

app.post('/api/admin/suspend', async (req, res) => {
    const user = await User.findById(req.body.userId);
    if (user) {
        const d = new Date(); d.setDate(d.getDate() + parseInt(req.body.days));
        user.suspensionEnd = d;
        await user.save();
        res.json({ message: "User suspended" });
    }
});

app.post('/api/admin/events', async (req, res) => {
    await Event.create({ ...req.body, sold: 0 });
    res.json({ message: "Event Created" });
});

app.get('/api/admin/stats', async (req, res) => {
    const bookings = await Booking.find();
    res.json(bookings.map(formatDoc));
});

// ==========================================
// 4. GEMINI AI CHATBOT ROUTE
// ==========================================
const { GoogleGenerativeAI } = require("@google/generative-ai");

// Initialize Gemini (Make sure GEMINI_API_KEY is in your .env file)
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

app.post('/api/chat', async (req, res) => {
    try {
        const { prompt } = req.body;
        
        // 1. Fetch live events directly from MongoDB Atlas!
        const events = await Event.find(); 
        
        // 2. Convert database events into a readable string for the AI
        const eventContext = events.map(e => `${e.name} at ${e.venue} on ${e.date} for RM${e.price}`).join(" | ");
        
        // 3. Set up the AI Prompt
        const model = genAI.getGenerativeModel({ model: "gemini-3-flash-preview" });
        const fullPrompt = `You are a helpful concert assistant for GigFinder. 
        Here are our live, upcoming events: ${eventContext}. 
        User asked: "${prompt}". 
        Please keep answers short, friendly, and only recommend concerts from the list provided.`;

        // 4. Ask Gemini and return the response
        const result = await model.generateContent(fullPrompt);
        res.json({ response: result.response.text() });
        
    } catch (e) {
        console.error("Gemini Error:", e);
        res.status(500).json({ response: "Sorry, my AI brain is sleeping right now. Try again later!" });
    }
});



app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));


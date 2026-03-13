require('dotenv').config();
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const nodemailer = require('nodemailer');
const mongoose = require('mongoose'); // NEW: Import Mongoose
const fs = require('fs');

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
    suspensionEnd: { type: Date, default: null }
}));

// Define Event Schema
const Event = mongoose.model('Event', new mongoose.Schema({
    name: String,
    date: String,
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

    // Send Email (Async)
    const mailOptions = {
        from: `"GigFinder Tickets" <${process.env.EMAIL_USER}>`,
        to: user, 
        subject: `🎟️ Your Tickets for ${eventName} are Confirmed!`,
        html: `<h2>Booking Confirmed! 🎉</h2><p>Booking ID: #${newBooking._id}</p><p>Total: RM${totalPrice}</p>`
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


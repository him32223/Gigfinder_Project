const express = require('express');
const cors = require('cors');
const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// --- MOCK DATABASE (Task 1: Robustness - works without DB connection) ---
// In a real app, this would be MongoDB.
let events = [
    { id: 1, name: "The Midnight", date: "2026-02-14", venue: "KL Live", price: 150, image: "https://placehold.co/400" },
    { id: 2, name: "Coldplay", date: "2026-03-01", venue: "Bukit Jalil", price: 300, image: "https://placehold.co/400" },
    { id: 3, name: "Local Indie Night", date: "2026-02-20", venue: "Merdekarya", price: 35, image: "https://placehold.co/400" }
];
let bookings = [];

// --- API ROUTES (Task 2: Core Functionalities) ---

// Feature 1: Get All Events
app.get('/api/events', (req, res) => {
    res.json(events);
});

// Feature 2: Search Events
app.get('/api/events/search', (req, res) => {
    const query = req.query.q.toLowerCase();
    const results = events.filter(event => 
        event.name.toLowerCase().includes(query) || 
        event.venue.toLowerCase().includes(query)
    );
    res.json(results);
});

// Feature 3: Mock Booking
app.post('/api/book', (req, res) => {
    const { eventId, user, quantity } = req.body;
    
    // Simple Validation (Task 2 requirement)
    if (!eventId || !quantity) {
        return res.status(400).json({ message: "Invalid booking data" });
    }

    const newBooking = { 
        id: bookings.length + 1, 
        eventId, 
        user, 
        quantity, 
        date: new Date() 
    };
    bookings.push(newBooking);

    console.log("New Booking:", newBooking); // Evidence for logs
    res.status(201).json({ message: "Booking Confirmed!", booking: newBooking });
});

// --- MOCK USERS (In-memory storage) ---
let users = [];

// Feature 4: User Registration
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({message: "Missing fields"});
    
    // Check if user exists
    if(users.find(u => u.email === email)) {
        return res.status(400).json({message: "User already exists"});
    }

    const newUser = { id: users.length + 1, email, password };
    users.push(newUser);
    res.status(201).json({ message: "User registered!", user: newUser });
});

// Feature 5: User Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const user = users.find(u => u.email === email && u.password === password);
    
    if (user) {
        res.json({ message: "Login successful", user });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// Start Server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
});
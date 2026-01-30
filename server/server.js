const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const DATA_FILE = './data.json';

// --- HELPER FUNCTIONS ---
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    } catch (error) {
        return { users: [], events: [], bookings: [] };
    }
};

const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// --- ROUTES ---

// 1. Get Events (Dynamic now)
app.get('/api/events', (req, res) => {
    const db = readData();
    res.json(db.events);
});

// 2. Search Events
app.get('/api/events/search', (req, res) => {
    const db = readData();
    const query = req.query.q.toLowerCase();
    const results = db.events.filter(e => 
        e.name.toLowerCase().includes(query) || 
        e.venue.toLowerCase().includes(query)
    );
    res.json(results);
});

// 3. Register
app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const db = readData();
    if (db.users.find(u => u.email === email)) return res.status(400).json({ message: "User exists" });
    
    const newUser = { id: Date.now(), email, password, role: 'user', suspensionEnd: null };
    db.users.push(newUser);
    writeData(db);
    res.status(201).json({ message: "Registration Successful!", user: newUser });
});

// 4. Login
app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readData();
    const user = db.users.find(u => u.email === email && u.password === password);

    if (user) {
        if (user.suspensionEnd && new Date() < new Date(user.suspensionEnd)) {
            return res.status(403).json({ message: `Suspended until ${user.suspensionEnd}` });
        }
        user.suspensionEnd = null; // Clear expired suspension
        writeData(db);
        res.json({ message: "Login successful", user });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// 5. Book Ticket (With Inventory Check)
app.post('/api/book', (req, res) => {
    const { eventId, user, quantity, eventName, totalPrice } = req.body;
    const db = readData();

    // Find Event
    const eventIndex = db.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return res.status(404).json({ message: "Event not found" });
    
    // Check Inventory
    const event = db.events[eventIndex];
    if (event.sold + quantity > event.capacity) {
        return res.status(400).json({ message: `Not enough tickets! Only ${event.capacity - event.sold} left.` });
    }

    // Update Inventory
    db.events[eventIndex].sold += quantity;

    // Create Booking
    const newBooking = { id: Date.now(), eventId, eventName, user, quantity, totalPrice, date: new Date().toISOString() };
    db.bookings.push(newBooking);
    
    writeData(db);
    res.status(201).json({ message: "Booking Confirmed!", booking: newBooking });
});

// 6. Get My Tickets
app.get('/api/bookings/:email', (req, res) => {
    const db = readData();
    const myBookings = db.bookings.filter(b => b.user === req.params.email);
    res.json(myBookings);
});

// 7. Cancel Ticket (Refund & Restock)
app.delete('/api/bookings/:id', (req, res) => {
    const db = readData();
    const bookingIndex = db.bookings.findIndex(b => b.id === parseInt(req.params.id));
    
    if (bookingIndex === -1) return res.status(404).json({ message: "Booking not found" });
    
    const booking = db.bookings[bookingIndex];

    // Restock Event
    const eventIndex = db.events.findIndex(e => e.id === booking.eventId);
    if (eventIndex !== -1) {
        db.events[eventIndex].sold -= booking.quantity;
    }

    // Remove Booking
    db.bookings.splice(bookingIndex, 1);
    writeData(db);
    res.json({ message: "Ticket Cancelled & Refunded" });
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', (req, res) => {
    const db = readData();
    res.json(db.users.filter(u => u.role !== 'admin'));
});

// Suspend
app.post('/api/admin/suspend', (req, res) => {
    const { userId, days } = req.body;
    const db = readData();
    const user = db.users.find(u => u.id === userId);
    if (user) {
        const endDate = new Date();
        endDate.setDate(endDate.getDate() + parseInt(days));
        user.suspensionEnd = endDate.toISOString();
        writeData(db);
        res.json({ message: `User suspended for ${days} days.` });
    } else {
        res.status(404).json({message: "User not found"});
    }
});

// Add Concert
app.post('/api/admin/events', (req, res) => {
    const db = readData();
    const newEvent = { id: Date.now(), ...req.body, sold: 0 };
    db.events.push(newEvent);
    writeData(db);
    res.json({ message: "Event Created", event: newEvent });
});

// Get All Sales Stats
app.get('/api/admin/stats', (req, res) => {
    const db = readData();
    res.json(db.bookings);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
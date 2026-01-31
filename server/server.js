const express = require('express');
const cors = require('cors');
const fs = require('fs');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- LOGGER MIDDLEWARE ---
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} request to ${req.url}`);
    next(); 
});

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

// 1. Get Events
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
    const { email } = req.body; 
    const db = readData();
    
    console.log(`Login Attempt: ${email}`);

    const user = db.users.find(u => u.email === req.body.email && u.password === req.body.password);

    if (user) {
        if (user.suspensionEnd && new Date() < new Date(user.suspensionEnd)) {
            console.warn(`Login Blocked: User ${email} is suspended.`);
            return res.status(403).json({ message: `Suspended until ${user.suspensionEnd}` });
        }
        console.log(`Login Success: ${email} (${user.role})`);
        user.suspensionEnd = null;
        writeData(db);
        res.json({ message: "Login successful", user });
    } else {
        console.warn(`Login Failed: Invalid credentials for ${email}`);
        res.status(401).json({ message: "Invalid credentials" });
    }
});

// 5. Book Ticket
app.post('/api/book', (req, res) => {
    const { eventId, user, quantity, eventName, totalPrice } = req.body;
    const db = readData();

    console.log(`Processing Booking: User ${user} wants ${quantity} tickets for ${eventName}`);

    // Find Event
    const eventIndex = db.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) {
        console.error(`Error: Event ID ${eventId} not found`);
        return res.status(404).json({ message: "Event not found" });
    }
    
    // Check Inventory
    const event = db.events[eventIndex];
    if (event.sold + quantity > event.capacity) {
        console.warn(`Booking Failed: Stock Low.`);
        return res.status(400).json({ message: `Not enough tickets! Only ${event.capacity - event.sold} left.` });
    }

    // ROBUSTNESS CHECK: Validate Inputs (Removed Duplicate)
    if (!Number.isInteger(quantity) || quantity <= 0) {
        console.warn(`Invalid Booking Attempt: Quantity ${quantity}`);
        return res.status(400).json({ message: "Quantity must be a positive number." });
    }

    if (quantity > 10) {
        return res.status(400).json({ message: "You cannot book more than 10 tickets at once." });
    }

    // Update Inventory
    db.events[eventIndex].sold += quantity;

    // Create Booking
    const newBooking = { id: Date.now(), eventId, eventName, user, quantity, totalPrice, date: new Date().toISOString() };
    db.bookings.push(newBooking);
    
    writeData(db);
    console.log(`Booking Confirmed: ID ${newBooking.id}`);
    res.status(201).json({ message: "Booking Confirmed!", booking: newBooking });
});

// 6. Get My Tickets
app.get('/api/bookings/:email', (req, res) => {
    const db = readData();
    const myBookings = db.bookings.filter(b => b.user === req.params.email);
    res.json(myBookings);
});

// 7. Cancel Ticket (FIXED & DEBUGGED)
app.delete('/api/bookings/:id', (req, res) => {
    const db = readData();
    const bookingId = parseInt(req.params.id); 

    console.log(`--- CANCEL REQUEST ---`);
    console.log(`Received Request to delete ID: ${bookingId} (Type: ${typeof bookingId})`);
    
    const bookingIndex = db.bookings.findIndex(b => b.id === bookingId);
    
    console.log(`Found Index: ${bookingIndex}`);

    if (bookingIndex === -1) {
        console.error("Error: Booking ID not found in database.");
        // Debug: Print existing IDs to see why it failed
        console.log("Existing IDs in DB:", db.bookings.map(b => b.id));
        return res.status(404).json({ message: "Booking not found" });
    }
    
    const booking = db.bookings[bookingIndex];

    // Restock Event
    const eventIndex = db.events.findIndex(e => e.id === booking.eventId);
    if (eventIndex !== -1) {
        db.events[eventIndex].sold -= booking.quantity;
        if(db.events[eventIndex].sold < 0) db.events[eventIndex].sold = 0;
        console.log(`Restocked ${booking.quantity} tickets for Event ID ${booking.eventId}`);
    }

    // Remove Booking
    db.bookings.splice(bookingIndex, 1);
    writeData(db);
    
    console.log(`Booking ${bookingId} successfully deleted.`);
    res.json({ message: "Ticket Cancelled & Refunded" });
});

// --- ADMIN ROUTES ---

app.get('/api/admin/users', (req, res) => {
    const db = readData();
    res.json(db.users.filter(u => u.role !== 'admin'));
});

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

app.post('/api/admin/events', (req, res) => {
    const db = readData();
    const newEvent = { id: Date.now(), ...req.body, sold: 0 };
    db.events.push(newEvent);
    writeData(db);
    res.json({ message: "Event Created", event: newEvent });
});

app.get('/api/admin/stats', (req, res) => {
    const db = readData();
    res.json(db.bookings);
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
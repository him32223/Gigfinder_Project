const express = require('express');
const cors = require('cors');
const fs = require('fs'); // Module to read/write files
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

const DATA_FILE = './data.json';

// --- HELPER FUNCTIONS ---
// Read data from file
const readData = () => {
    try {
        const data = fs.readFileSync(DATA_FILE);
        return JSON.parse(data);
    } catch (error) {
        return { users: [], bookings: [] }; // Fallback if file fails
    }
};

// Write data to file
const writeData = (data) => {
    fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
};

// --- EVENTS DATA (Static for now) ---
const events = [
    { id: 1, name: "The Midnight", date: "2026-02-14", venue: "KL Live", price: 150, image: "https://placehold.co/400" },
    { id: 2, name: "Coldplay", date: "2026-03-01", venue: "Bukit Jalil", price: 300, image: "https://placehold.co/400" },
    { id: 3, name: "Local Indie Night", date: "2026-02-20", venue: "Merdekarya", price: 35, image: "https://placehold.co/400" }
];

// --- ROUTES ---

app.get('/api/events', (req, res) => {
    res.json(events);
});

app.get('/api/events/search', (req, res) => {
    const query = req.query.q.toLowerCase();
    const results = events.filter(e => 
        e.name.toLowerCase().includes(query) || 
        e.venue.toLowerCase().includes(query)
    );
    res.json(results);
});

app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const db = readData();

    if (db.users.find(u => u.email === email)) {
        return res.status(400).json({ message: "User already exists" });
    }

    const newUser = { id: Date.now(), email, password };
    db.users.push(newUser);
    writeData(db); // SAVE TO FILE

    res.status(201).json({ message: "Registration Successful!", user: newUser });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readData();
    const user = db.users.find(u => u.email === email && u.password === password);

    if (user) {
        res.json({ message: "Login successful", user });
    } else {
        res.status(401).json({ message: "Invalid credentials" });
    }
});

app.post('/api/book', (req, res) => {
    const { eventId, user, quantity, eventName } = req.body;
    const db = readData();

    const newBooking = { 
        id: Date.now(), 
        eventId, 
        eventName, 
        user, 
        quantity, 
        date: new Date().toISOString() 
    };
    
    db.bookings.push(newBooking);
    writeData(db); // SAVE TO FILE

    res.status(201).json({ message: "Booking Confirmed!", booking: newBooking });
});

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
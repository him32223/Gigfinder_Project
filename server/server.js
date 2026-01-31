const express = require('express');
const cors = require('cors');
const fs = require('fs');
const multer = require('multer'); 
const path = require('path');
const app = express();
const PORT = 5000;

app.use(cors());
app.use(express.json());

// --- STATIC FOLDER CONFIGURATION ---
// This allows the browser to see images at http://localhost:5000/uploads/filename.jpg
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// --- LOGGER ---
app.use((req, res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} request to ${req.url}`);
    next(); 
});

const DATA_FILE = './data.json';

// --- FILE UPLOAD CONFIGURATION (Saved to SERVER folder, not CLIENT) ---
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const uploadPath = path.join(__dirname, 'uploads'); // Saved in server/uploads
        if (!fs.existsSync(uploadPath)){
            fs.mkdirSync(uploadPath, { recursive: true });
        }
        cb(null, uploadPath);
    },
    filename: (req, file, cb) => {
        const uniqueSuffix = Date.now() + Math.round(Math.random() * 1E9);
        cb(null, file.fieldname + '-' + uniqueSuffix + '.jpg'); 
    }
});

const fileFilter = (req, file, cb) => {
    if (file.mimetype === 'image/jpeg' || file.mimetype === 'image/jpg') {
        cb(null, true);
    } else {
        cb(new Error('Only .jpg or .jpeg files are allowed!'), false);
    }
};

const upload = multer({ storage: storage, fileFilter: fileFilter });

// --- HELPER FUNCTIONS ---
const readData = () => {
    try {
        return JSON.parse(fs.readFileSync(DATA_FILE));
    } catch (error) {
        return { users: [], events: [], bookings: [] };
    }
};
const writeData = (data) => fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));

// --- ROUTES ---

app.post('/api/upload', (req, res) => {
    const uploadSingle = upload.single('image');
    uploadSingle(req, res, (err) => {
        if (err) return res.status(400).json({ message: err.message });
        if (!req.file) return res.status(400).json({ message: "No file uploaded" });
        
        // Return full URL from the server
        const imagePath = `http://localhost:5000/uploads/${req.file.filename}`;
        res.json({ imageUrl: imagePath });
    });
});

app.get('/api/events', (req, res) => res.json(readData().events));

app.get('/api/events/search', (req, res) => {
    const db = readData();
    const query = req.query.q.toLowerCase();
    const results = db.events.filter(e => 
        e.name.toLowerCase().includes(query) || e.venue.toLowerCase().includes(query)
    );
    res.json(results);
});

app.post('/api/register', (req, res) => {
    const { email, password } = req.body;
    const db = readData();
    if (db.users.find(u => u.email === email)) return res.status(400).json({ message: "User exists" });
    const newUser = { id: Date.now(), email, password, role: 'user', suspensionEnd: null };
    db.users.push(newUser);
    writeData(db);
    res.status(201).json({ message: "Registration Successful!", user: newUser });
});

app.post('/api/login', (req, res) => {
    const { email, password } = req.body;
    const db = readData();
    const user = db.users.find(u => u.email === email && u.password === password);
    if (user) {
        if (user.suspensionEnd && new Date() < new Date(user.suspensionEnd)) {
            return res.status(403).json({ message: `Suspended until ${user.suspensionEnd}` });
        }
        user.suspensionEnd = null;
        writeData(db);
        res.json({ message: "Login successful", user });
    } else res.status(401).json({ message: "Invalid credentials" });
});

app.post('/api/book', (req, res) => {
    const { eventId, user, quantity, eventName, totalPrice } = req.body;
    const db = readData();
    const eventIndex = db.events.findIndex(e => e.id === eventId);
    if (eventIndex === -1) return res.status(404).json({ message: "Event not found" });
    const event = db.events[eventIndex];
    if (event.sold + quantity > event.capacity) return res.status(400).json({ message: `Not enough tickets!` });
    
    db.events[eventIndex].sold += quantity;
    const newBooking = { id: Date.now(), eventId, eventName, user, quantity, totalPrice, date: new Date().toISOString() };
    db.bookings.push(newBooking);
    writeData(db);
    res.status(201).json({ message: "Booking Confirmed!", booking: newBooking });
});

app.get('/api/bookings/:email', (req, res) => res.json(readData().bookings.filter(b => b.user === req.params.email)));

app.delete('/api/bookings/:id', (req, res) => {
    const db = readData();
    const id = parseInt(req.params.id); 
    const idx = db.bookings.findIndex(b => b.id === id);
    if (idx === -1) return res.status(404).json({ message: "Not found" });
    const booking = db.bookings[idx];
    const eventIdx = db.events.findIndex(e => e.id === booking.eventId);
    if (eventIdx !== -1) {
        db.events[eventIdx].sold -= booking.quantity;
    }
    db.bookings.splice(idx, 1);
    writeData(db);
    res.json({ message: "Cancelled" });
});

app.get('/api/admin/users', (req, res) => res.json(readData().users.filter(u => u.role !== 'admin')));

app.post('/api/admin/suspend', (req, res) => {
    const db = readData();
    const user = db.users.find(u => u.id === req.body.userId);
    if (user) {
        const d = new Date(); d.setDate(d.getDate() + parseInt(req.body.days));
        user.suspensionEnd = d.toISOString();
        writeData(db);
        res.json({ message: "User suspended" });
    }
});

app.post('/api/admin/events', (req, res) => {
    const db = readData();
    const newEvent = { id: Date.now(), ...req.body, sold: 0 };
    db.events.push(newEvent);
    writeData(db);
    res.json({ message: "Event Created" });
});

app.get('/api/admin/stats', (req, res) => res.json(readData().bookings));

app.listen(PORT, () => console.log(`Server running on http://localhost:${PORT}`));
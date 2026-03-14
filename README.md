# 🎸 GigFinder: Live Music Discovery & Booking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![React Version](https://img.shields.io/badge/React-18.x-blue)

**GigFinder** is a robust, full-stack MERN web application designed to centralize the fragmented experience of discovering live music events and booking tickets. It prioritizes transparency, data integrity, and an intuitive user experience.

---

## 🌟 Key Features

### 👤 User Capabilities
* **Interactive Seat Selection:** Dynamic venue seating map with automated VIP vs. Standard pricing.
* **AI Concert Assistant:** Integrated **Google Gemini AI** (GigBot) with context-aware data to answer user queries about live events.
* **Automated E-Receipts:** Real-world HTML ticket confirmations sent directly to user inboxes via **Nodemailer**.
* **Password Recovery:** Secure, token-based "Forgot Password" email flow.
* **My Tickets Dashboard:** View purchased tickets with a functional "Cancel Ticket" system that automatically restores global database inventory.

### 🛡️ Admin Capabilities
* **MusicBrainz Integration:** External API integration for standardized artist autocomplete suggestions.
* **Secure Image Upload:** Custom **Multer** middleware enforcing strict `.jpg` MIME-type filtering for event posters.
* **Sales Analytics:** Real-time tracking of total platform revenue and global booking records.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend (View)** | React.js (Hooks, SPA, CSS Grid) |
| **Backend (Controller)**| Node.js, Express.js |
| **Data Layer (Model)** | MongoDB Atlas (Cloud NoSQL) + Mongoose ODM |
| **Security & Auth** | Crypto tokens, `localStorage` persistence, Role-Based Access (RBAC) |
| **External Services** | Google Gemini AI, MusicBrainz API, Gmail SMTP |

---

## 🚀 Getting Started 

To make running locally as smooth as possible, a one-click batch script has been provided.

### Step 1: Environment Variables Setup
Before running the app, you must link the database and API keys. 
1. Navigate to the `server/` directory.
2. Create a file named exactly **`.env`**.
3. Paste the following credentials (provided by the student separately) into the file:
   ```env
   EMAIL_USER=your_email@gmail.com
   EMAIL_PASS=your_16_letter_app_password
   MONGO_URI=mongodb+srv://<username>:<password>@cluster...
   GEMINI_API_KEY=AIzaSy...

Step 2: One-Click Launch (Windows)
Double-click the START_GIGFINDER.bat file located in the root directory.
The script will automatically check for your .env file, install all necessary node_modules for both the client and server, and launch the application.
(Mac/Linux Users): Open a terminal in the root folder, run npm run install-all, followed by npm start.


Step 3: Database Seeding (First Run Only)
If connecting to an empty MongoDB cluster, populate the initial mock data by visiting:
👉 http://localhost:5000/api/seed


Testing Credentials
To explore the application's different permission levels, please use the following seeded accounts:
Role	Email	Password
Administrator	admin@gigfinder.com	admin
Standard User	user@test.com	123


📁 Project Structure
GigFinder_Project/
├── START_GIGFINDER.bat  # 👈 Evaluator Start Script
├── package.json         # Root scripts (Concurrently)
├── server/              # Backend Application Layer
│   ├── .env             # (You create this) API Keys & DB Config
│   ├── uploads/         # Local storage for verified .jpg files
│   └── server.js        # Express API, Mongoose Models, AI Logic
└── client/              # Frontend Presentation Layer
    ├── public/
    └── src/
        ├── App.js       # Main React Logic, Routing, UI Components
        └── App.css      # Custom UI Styling (Dark Theme)
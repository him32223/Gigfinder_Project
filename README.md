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
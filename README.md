# 🎸 GigFinder: Live Music Discovery & Booking System

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
![Node Version](https://img.shields.io/badge/node-%3E%3D16.0.0-green)
![React Version](https://img.shields.io/badge/React-18.x-blue)

**GigFinder** is a robust, full-stack web application designed to centralize the fragmented experience of discovering live music events and booking tickets. Built using the MERN architecture, the system prioritizes transparency, ease of use, and data integrity.

---

## 🌟 Key Features

### 👤 User Capabilities
* **Persistent Authentication:** Secure Login/Register with sessions saved via `localStorage`.
* **Event Discovery:** Real-time search and sorting (by Price/Date).
* **Smart Categorization:** Automatic splitting of "Upcoming" and "Past" events based on system date.
* **3-Step Checkout Wizard:** A sophisticated modal-based flow including venue details, quantity selection, and payment method.
* **My Tickets Dashboard:** View purchased tickets with a functional **"Cancel & Refund"** system that restores global inventory.

### 🛡️ Admin Capabilities
* **MusicBrainz Integration:** External API integration for artist autocomplete suggestions.
* **Secure Image Upload:** Custom **Multer** implementation for `.jpg` artist and venue photos.
* **User Management:** Ability to suspend/reactivate users for specific durations.
* **Sales Analytics:** Real-time tracking of total revenue and global booking records.

---

## 🛠️ Technology Stack

| Layer | Technology |
| :--- | :--- |
| **Frontend** | React.js (Hooks, Functional Components) |
| **Backend** | Node.js, Express.js |
| **Data Layer** | JSON File-System Persistence (`data.json`) |
| **Security** | Multer MIME-type filtering, Role-Based Access Control (RBAC) |
| **Integration** | MusicBrainz External API |

---

## 🚀 Getting Started

### Prerequisites
* **Node.js** (v16 or higher)
* **npm** (Node Package Manager)

### Installation & Launch
1. **Install Dependencies** (from the root folder):
   ```bash
   npm run install-all


### 🚀 Launching the App
   

2.Run the following command in the root folder:

```bash
npm start
```


### 🔑 Testing Credentials

To explore the application's different permission levels, please use the following accounts:

| Role | Email | Password |
| :--- | :--- | :--- |
| **Administrator** | `admin@gigfinder.com` | `admin` |
| **Standard User** | `user@test.com` | `123` |


### 📁 Project Structure

```text
GigFinder_Project/
├── package.json         # Root scripts (Concurrently)
├── data.json            # Persistent storage (JSON Database)
├── server/              # Application Layer (Node/Express)
│   └── server.js        # Controller logic & API Routes
└── client/              # Presentation Layer (React)
    ├── public/images/   # Directory for uploaded .jpg files
    └── src/
        ├── App.js       # Main logic & Routing
        └── App.css      # UI Styling (Dark Theme)

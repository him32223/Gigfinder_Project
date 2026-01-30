import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // State Management
  const [user, setUser] = useState(null); // If null, user is not logged in
  const [view, setView] = useState('login'); // 'login', 'register', 'home'
  
  // Login/Register Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // App Data State
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- AUTHENTICATION HANDLERS ---
  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        alert("Registration Successful! Please Login.");
        setView('login');
    } else {
        alert(data.message);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        setUser(data.user);
        setView('home');
        fetchEvents(); // Fetch events only after login
    } else {
        alert(data.message);
    }
  };

  const handleLogout = () => {
    setUser(null);
    setView('login');
    setEmail('');
    setPassword('');
  };

  // --- EVENT HANDLERS ---
  const fetchEvents = async () => {
    const res = await fetch('http://localhost:5000/api/events');
    const data = await res.json();
    setEvents(data);
  };

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    const res = await fetch(`http://localhost:5000/api/events/search?q=${term}`);
    const data = await res.json();
    setEvents(data);
  };

  const handleBook = async (eventId, eventName) => {
    const quantity = prompt(`Booking tickets for ${eventName}.\nHow many?`);
    if (!quantity) return;

    const res = await fetch('http://localhost:5000/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ eventId, quantity, user: user.email })
    });
    const data = await res.json();
    alert(data.message);
  };

  // --- RENDER HELPERS ---
  
  // 1. Authentication View
  if (view === 'login' || view === 'register') {
    return (
      <div className="app-container">
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="logo">GigFinder</h1>
                <h2>{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                
                <form onSubmit={view === 'login' ? handleLogin : handleRegister}>
                    <input 
                        className="auth-input" 
                        type="email" 
                        placeholder="Email" 
                        value={email} onChange={e => setEmail(e.target.value)} 
                        required 
                    />
                    <input 
                        className="auth-input" 
                        type="password" 
                        placeholder="Password" 
                        value={password} onChange={e => setPassword(e.target.value)} 
                        required 
                    />
                    <button className="book-btn" type="submit">
                        {view === 'login' ? 'Sign In' : 'Register'}
                    </button>
                </form>

                <p style={{marginTop: '20px', color: '#b0b0b0'}}>
                    {view === 'login' ? "New here? " : "Already have an account? "}
                    <span 
                        style={{color: '#bb86fc', cursor: 'pointer', textDecoration: 'underline'}}
                        onClick={() => setView(view === 'login' ? 'register' : 'login')}
                    >
                        {view === 'login' ? "Create Account" : "Sign In"}
                    </span>
                </p>
            </div>
        </div>
      </div>
    );
  }

  // 2. Main App View (Dashboard)
  return (
    <div className="app-container">
      {/* Navbar */}
      <nav className="navbar">
        <div className="logo">GigFinder</div>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <span>Hello, <span style={{color: '#bb86fc'}}>{user.email}</span></span>
            <button className="nav-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      {/* Search */}
      <input 
        className="search-bar" 
        type="text" 
        placeholder="🔍 Search for artists, venues..." 
        value={searchTerm}
        onChange={handleSearch}
      />

      {/* Events Grid */}
      <div className="events-grid">
        {events.map(event => (
          <div key={event.id} className="event-card">
            <img src={event.image} alt={event.name} className="card-img" />
            <div className="card-content">
                <h2 className="card-title">{event.name}</h2>
                <p className="card-info">📅 {event.date}</p>
                <p className="card-info">📍 {event.venue}</p>
                <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px'}}>
                    <span style={{color: '#03dac6', fontSize: '1.2rem', fontWeight: 'bold'}}>RM{event.price}</span>
                </div>
                <button className="book-btn" onClick={() => handleBook(event.id, event.name)}>
                    Book Ticket
                </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
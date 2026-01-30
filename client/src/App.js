import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login');
  
  // Form States
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  
  // Data States
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // --- MODAL STATE ---
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: '' });
  const [bookingModal, setBookingModal] = useState({ show: false, event: null, quantity: 1 });

  // --- API CALLS ---
  const fetchEvents = async () => {
    const res = await fetch('http://localhost:5000/api/events');
    const data = await res.json();
    setEvents(data);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    
    if (res.ok) {
        // Show Success Modal instead of Alert
        setModal({ show: true, title: 'Success! 🎉', message: 'Account created. Please log in.', type: 'success' });
        setView('login');
    } else {
        setModal({ show: true, title: 'Error ❌', message: data.message, type: 'error' });
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
        fetchEvents();
    } else {
        setModal({ show: true, title: 'Login Failed ⚠️', message: data.message, type: 'error' });
    }
  };

  const handleSearch = async (e) => {
    const term = e.target.value;
    setSearchTerm(term);
    const res = await fetch(`http://localhost:5000/api/events/search?q=${term}`);
    const data = await res.json();
    setEvents(data);
  };

  // --- BOOKING LOGIC ---
  
  // 1. Open Booking Modal
  const openBookingModal = (event) => {
      setBookingModal({ show: true, event: event, quantity: 1 });
  };

  // 2. Confirm Booking
  const confirmBooking = async () => {
    const res = await fetch('http://localhost:5000/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          eventId: bookingModal.event.id, 
          eventName: bookingModal.event.name,
          quantity: bookingModal.quantity, 
          user: user.email 
      })
    });
    
    // Close booking modal
    setBookingModal({ show: false, event: null, quantity: 1 });

    // Show Success Modal
    setModal({ show: true, title: 'Booking Confirmed! 🎟️', message: 'Your tickets have been sent to your email.', type: 'success' });
  };

  const closeModal = () => setModal({ ...modal, show: false });

  // --- UI COMPONENTS ---

  const NotificationModal = () => {
      if (!modal.show) return null;
      return (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h2 className="modal-title">{modal.title}</h2>
                  <p className="modal-text">{modal.message}</p>
                  <button className="book-btn" onClick={closeModal}>Okay</button>
              </div>
          </div>
      );
  };

  const BookingPopup = () => {
      if (!bookingModal.show) return null;
      return (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h2 className="modal-title">Book Tickets</h2>
                  <p className="modal-text">Event: <strong>{bookingModal.event.name}</strong></p>
                  
                  <div style={{marginBottom: '20px'}}>
                    <label style={{color: '#b0b0b0', display: 'block', marginBottom: '5px'}}>Quantity:</label>
                    <input 
                        type="number" 
                        min="1" 
                        max="10"
                        className="auth-input"
                        value={bookingModal.quantity}
                        onChange={(e) => setBookingModal({...bookingModal, quantity: e.target.value})}
                    />
                  </div>

                  <div className="modal-actions">
                    <button className="btn-secondary" onClick={() => setBookingModal({show: false})}>Cancel</button>
                    <button className="book-btn" style={{marginTop: 0}} onClick={confirmBooking}>Confirm</button>
                  </div>
              </div>
          </div>
      );
  };

  // --- MAIN RENDER ---

  if (view === 'login' || view === 'register') {
    return (
      <div className="app-container">
        <NotificationModal />
        <div className="auth-container">
            <div className="auth-card">
                <h1 className="logo">GigFinder</h1>
                <h2>{view === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
                
                <form onSubmit={view === 'login' ? handleLogin : handleRegister}>
                    <input className="auth-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                    <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                    <button className="book-btn" type="submit">{view === 'login' ? 'Sign In' : 'Register'}</button>
                </form>

                <p style={{marginTop: '20px', color: '#b0b0b0'}}>
                    {view === 'login' ? "New here? " : "Already have an account? "}
                    <span style={{color: '#bb86fc', cursor: 'pointer', textDecoration: 'underline'}} onClick={() => setView(view === 'login' ? 'register' : 'login')}>
                        {view === 'login' ? "Create Account" : "Sign In"}
                    </span>
                </p>
            </div>
        </div>
      </div>
    );
  }

  return (
    <div className="app-container">
      <NotificationModal />
      <BookingPopup />
      
      <nav className="navbar">
        <div className="logo">GigFinder</div>
        <div style={{display: 'flex', alignItems: 'center', gap: '20px'}}>
            <span>Hello, <span style={{color: '#bb86fc'}}>{user.email}</span></span>
            <button className="nav-btn" onClick={() => { setUser(null); setView('login'); }}>Logout</button>
        </div>
      </nav>

      <input className="search-bar" type="text" placeholder="🔍 Search for artists, venues..." value={searchTerm} onChange={handleSearch} />

      <div className="events-grid">
        {events.map(event => (
          <div key={event.id} className="event-card">
            <img src={event.image} alt={event.name} className="card-img" />
            <div className="card-content">
                <h2 className="card-title">{event.name}</h2>
                <p className="card-info">📅 {event.date}</p>
                <p className="card-info">📍 {event.venue}</p>
                <span style={{color: '#03dac6', fontSize: '1.2rem', fontWeight: 'bold', display: 'block', marginTop: '10px'}}>RM{event.price}</span>
                <button className="book-btn" onClick={() => openBookingModal(event)}>Book Ticket</button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
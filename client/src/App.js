import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [user, setUser] = useState(null);
  const [view, setView] = useState('login'); // login, register, home, mytickets, admin
  
  // Forms & Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Modals
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: '' });
  const [bookingModal, setBookingModal] = useState({ show: false, event: null, quantity: 1 });

  // --- 1. NAVIGATION FIX (Browser Back Button) ---
  
  // Update the URL hash whenever the View changes
  useEffect(() => {
    window.location.hash = view;
  }, [view]);

  // Listen for Browser Back Button clicks
  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) setView(hash);
    };
    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, []);

  // --- API CALLS ---
  const fetchEvents = async () => {
    try {
        const res = await fetch('http://localhost:5000/api/events');
        const data = await res.json();
        setEvents(data);
    } catch (e) { console.error("API Error", e); }
  };

  const fetchMyTickets = async () => {
      if(!user) return;
      const res = await fetch(`http://localhost:5000/api/bookings/${user.email}`);
      const data = await res.json();
      setMyTickets(data);
  };

  // Feature: Auto-load data when switching to Home
  useEffect(() => {
      if (view === 'home') fetchEvents();
  }, [view]);

  const handleRegister = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/register', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        setModal({ show: true, title: 'Success', message: 'Account created!', type: 'success' });
        setView('login');
    } else {
        setModal({ show: true, title: 'Error', message: data.message, type: 'error' });
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    const res = await fetch('http://localhost:5000/api/login', {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password })
    });
    const data = await res.json();
    if (res.ok) {
        setUser(data.user);
        // Admin goes to admin view, User goes to home
        if (data.user.role === 'admin') setView('admin');
        else setView('home');
    } else {
        setModal({ show: true, title: 'Login Failed', message: data.message, type: 'error' });
    }
  };

  const confirmBooking = async () => {
    const totalPrice = bookingModal.event.price * bookingModal.quantity;
    const res = await fetch('http://localhost:5000/api/book', {
      method: 'POST', headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
          eventId: bookingModal.event.id, 
          eventName: bookingModal.event.name,
          quantity: bookingModal.quantity, 
          totalPrice, user: user.email 
      })
    });
    const data = await res.json();
    if(res.ok) {
        setBookingModal({ show: false, event: null, quantity: 1 });
        setModal({ show: true, title: 'Success', message: 'Tickets Booked!', type: 'success' });
        fetchEvents(); // Refresh inventory
    } else {
        alert(data.message);
    }
  };

  const cancelTicket = async (id) => {
      if(!window.confirm("Cancel this ticket?")) return;
      await fetch(`http://localhost:5000/api/bookings/${id}`, { method: 'DELETE' });
      fetchMyTickets();
      fetchEvents(); 
  }

  // --- SUB-COMPONENTS ---

  const MyTicketsView = () => {
      useEffect(() => { fetchMyTickets(); }, []);
      return (
          <div className="app-container">
              <nav className="navbar">
                <div className="logo">My Tickets</div>
                {/* 2. NAVIGATION FIX: Explicit Home Button */}
                <button className="nav-btn" onClick={() => setView('home')}>← Back to Events</button>
              </nav>

              <div className="events-grid" style={{marginTop: '20px'}}>
                  {myTickets.length === 0 ? <p>No tickets yet.</p> : myTickets.map(t => (
                      <div key={t.id} className="event-card" style={{padding: '20px'}}>
                          <h3>{t.eventName}</h3>
                          <p>Qty: {t.quantity}</p>
                          <p>Paid: RM{t.totalPrice}</p>
                          <button className="btn-danger" onClick={() => cancelTicket(t.id)}>Cancel & Refund</button>
                      </div>
                  ))}
              </div>
          </div>
      )
  }

  const AdminDashboard = () => {
      const [tab, setTab] = useState('users');
      const [users, setUsers] = useState([]);
      const [stats, setStats] = useState([]);
      const [newEvent, setNewEvent] = useState({ name: '', venue: '', date: '', price: '', capacity: '', image: 'https://placehold.co/400' });

      useEffect(() => {
          if (tab === 'users') fetch('http://localhost:5000/api/admin/users').then(res => res.json()).then(setUsers);
          if (tab === 'stats') fetch('http://localhost:5000/api/admin/stats').then(res => res.json()).then(setStats);
      }, [tab]);

      const handleAddEvent = async (e) => {
          e.preventDefault();
          await fetch('http://localhost:5000/api/admin/events', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newEvent)
          });
          alert("Event Added");
          setNewEvent({ name: '', venue: '', date: '', price: '', capacity: '', image: 'https://placehold.co/400' });
      };

      const handleSuspend = async (id) => {
          const days = prompt("Enter suspension days:");
          if(days) {
            await fetch('http://localhost:5000/api/admin/suspend', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id, days })
            });
            alert("User Suspended");
            // Refresh users
            fetch('http://localhost:5000/api/admin/users').then(res => res.json()).then(setUsers);
          }
      }

      const totalRevenue = stats.reduce((sum, b) => sum + b.totalPrice, 0);

      return (
          <div className="app-container">
              <nav className="navbar">
                    <div className="logo">GigFinder <span style={{fontSize:'0.8rem', color: 'red'}}>ADMIN</span></div>
                    <div style={{display:'flex', gap:'10px'}}>
                        {/* 3. NAVIGATION FIX: Admin can go Home */}
                        <button className="nav-btn" onClick={() => setView('home')}>View Site</button>
                        <button className="nav-btn" onClick={() => { setUser(null); setView('login'); }}>Logout</button>
                    </div>
              </nav>
              
              <div className="tabs">
                  <button className={`tab-btn ${tab === 'users' ? 'active' : ''}`} onClick={() => setTab('users')}>Users</button>
                  <button className={`tab-btn ${tab === 'stats' ? 'active' : ''}`} onClick={() => setTab('stats')}>Sales Analytics</button>
                  <button className={`tab-btn ${tab === 'add' ? 'active' : ''}`} onClick={() => setTab('add')}>Add Event</button>
              </div>

              {tab === 'users' && (
                  <table className="admin-table">
                      <thead><tr><th>Email</th><th>Status</th><th>Action</th></tr></thead>
                      <tbody>
                          {users.map(u => (
                              <tr key={u.id}>
                                  <td>{u.email}</td>
                                  <td style={{color: u.suspensionEnd ? 'red' : 'green'}}>{u.suspensionEnd ? 'Suspended' : 'Active'}</td>
                                  <td><button className="btn-danger" onClick={() => handleSuspend(u.id)}>Suspend</button></td>
                              </tr>
                          ))}
                      </tbody>
                  </table>
              )}

              {tab === 'stats' && (
                  <div>
                      <div className="stats-grid">
                          <div className="stat-card"><div className="stat-number">{stats.length}</div>Bookings</div>
                          <div className="stat-card"><div className="stat-number">RM{totalRevenue}</div>Revenue</div>
                      </div>
                      <table className="admin-table">
                           <thead><tr><th>Event</th><th>User</th><th>Qty</th><th>Total</th></tr></thead>
                           <tbody>{stats.map(s => <tr key={s.id}><td>{s.eventName}</td><td>{s.user}</td><td>{s.quantity}</td><td>RM{s.totalPrice}</td></tr>)}</tbody>
                      </table>
                  </div>
              )}

              {tab === 'add' && (
                  <form onSubmit={handleAddEvent} className="auth-card" style={{margin: '0 auto'}}>
                      <h3>Create New Concert</h3>
                      <input className="auth-input" placeholder="Artist Name" value={newEvent.name} onChange={e => setNewEvent({...newEvent, name: e.target.value})} required />
                      <input className="auth-input" placeholder="Venue" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} required />
                      <input className="auth-input" type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                      <input className="auth-input" type="number" placeholder="Price (RM)" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: parseInt(e.target.value)})} required />
                      <input className="auth-input" type="number" placeholder="Capacity" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: parseInt(e.target.value)})} required />
                      <button className="book-btn">Publish Event</button>
                  </form>
              )}
          </div>
      )
  }

  // --- MAIN RENDER ---

  if (view === 'login' || view === 'register') return (
      <div className="app-container">
          <div className="auth-container">
              <div className="auth-card">
                  <h1>GigFinder</h1>
                  <form onSubmit={view === 'login' ? handleLogin : handleRegister}>
                      <input className="auth-input" type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} required />
                      <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e => setPassword(e.target.value)} required />
                      <button className="book-btn">{view === 'login' ? 'Login' : 'Register'}</button>
                  </form>
                  <p onClick={() => setView(view === 'login' ? 'register' : 'login')} style={{cursor:'pointer', marginTop:'10px', color: '#bb86fc'}}>
                      {view === 'login' ? 'Create Account' : 'Back to Login'}
                  </p>
              </div>
          </div>
          {modal.show && <div className="modal-overlay"><div className="modal-content"><h2>{modal.title}</h2><p>{modal.message}</p><button className="book-btn" onClick={() => setModal({show:false})}>OK</button></div></div>}
      </div>
  );

  if (view === 'admin') return <AdminDashboard />;
  if (view === 'mytickets') return <MyTicketsView />;

  return (
    <div className="app-container">
      {modal.show && <div className="modal-overlay"><div className="modal-content"><h2>{modal.title}</h2><p>{modal.message}</p><button className="book-btn" onClick={() => setModal({show:false})}>OK</button></div></div>}
      {bookingModal.show && (
          <div className="modal-overlay">
              <div className="modal-content">
                  <h2>Book {bookingModal.event.name}</h2>
                  <input type="number" className="auth-input" min="1" value={bookingModal.quantity} onChange={e => setBookingModal({...bookingModal, quantity: parseInt(e.target.value)})} />
                  <p>Total: RM{bookingModal.event.price * bookingModal.quantity}</p>
                  <div className="modal-actions"><button className="btn-secondary" onClick={() => setBookingModal({show:false})}>Cancel</button><button className="book-btn" onClick={confirmBooking}>Pay</button></div>
              </div>
          </div>
      )}

      <nav className="navbar">
        <div className="logo">GigFinder</div>
        <div style={{display:'flex', gap:'15px'}}>
            {user?.role === 'admin' && <button className="nav-btn" onClick={() => setView('admin')}>Admin Dashboard</button>}
            <button className="nav-btn" onClick={() => setView('mytickets')}>My Tickets</button>
            <button className="nav-btn" onClick={() => {setUser(null); setView('login')}}>Logout</button>
        </div>
      </nav>

      <input className="search-bar" placeholder="Search..." onChange={e => {
          fetch(`http://localhost:5000/api/events/search?q=${e.target.value}`).then(res=>res.json()).then(setEvents);
      }} />

      <div className="events-grid">
        {events.map(e => {
            const isSoldOut = e.sold >= e.capacity;
            return (
                <div key={e.id} className="event-card">
                    <img src={e.image} className="card-img" />
                    <div className="card-content">
                        <h2>{e.name}</h2>
                        <p>{e.date} @ {e.venue}</p>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                            <span>RM{e.price}</span>
                            <span className={`badge ${isSoldOut ? 'badge-soldout' : 'badge-available'}`}>
                                {isSoldOut ? 'SOLD OUT' : `${e.capacity - e.sold} left`}
                            </span>
                        </div>
                        <button className="book-btn" disabled={isSoldOut} style={{opacity: isSoldOut ? 0.5 : 1}} onClick={() => setBookingModal({show:true, event:e, quantity:1})}>
                            {isSoldOut ? 'Unavailable' : 'Book Now'}
                        </button>
                    </div>
                </div>
            )
        })}
      </div>
    </div>
  );
}

export default App;
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
  useEffect(() => {
    window.location.hash = view;
  }, [view]);

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

  useEffect(() => {
      if (view === 'home') fetchEvents();
      if (view === 'mytickets') fetchMyTickets();
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
        if (data.user.role === 'admin') setView('admin');
        else setView('home');
    } else {
        setModal({ show: true, title: 'Login Failed', message: data.message, type: 'error' });
    }
  };

  // This function is called BY the BookingPopup Wizard
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
        setModal({ show: true, title: 'Success', message: 'Tickets Booked! Sent to email.', type: 'success' });
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

  // *** NEW CHECKOUT WIZARD POPUP ***
  const BookingPopup = () => {
      const [step, setStep] = useState(1);
      const [paymentMethod, setPaymentMethod] = useState('');
      const [isProcessing, setIsProcessing] = useState(false);
      
      useEffect(() => {
          if (bookingModal.show) {
              setStep(1); setPaymentMethod(''); setIsProcessing(false);
          }
      }, [bookingModal.show]);

      if (!bookingModal.show) return null;

      const total = bookingModal.event.price * bookingModal.quantity;

      const handlePayment = () => {
          if (!paymentMethod) return alert("Please select a payment method");
          setStep(3);
          setIsProcessing(true);
          setTimeout(async () => {
              await confirmBooking();
              setIsProcessing(false);
          }, 2000);
      };

      return (
          <div className="modal-overlay">
              <div className="modal-content" style={{maxWidth: '700px', width: '95%'}}>
                  <div className="steps">
                      <div className={`step ${step >= 1 ? 'active' : ''}`}></div>
                      <div className={`step ${step >= 2 ? 'active' : ''}`}></div>
                      <div className={`step ${step >= 3 ? 'active' : ''}`}></div>
                  </div>

                  <h2 className="modal-title">Checkout: {bookingModal.event.name}</h2>

                  {step === 1 && (
                      <div className="checkout-container">
                          <div className="checkout-left">
                              {/* Displays Venue Image if available */}
                              {bookingModal.event.venueImage && <img src={bookingModal.event.venueImage} alt="Venue" className="venue-preview" />}
                              <h3 style={{color: '#fff', marginTop: 0}}>📍 {bookingModal.event.venue}</h3>
                              <p style={{color: '#b0b0b0', fontSize: '0.9rem'}}>{bookingModal.event.venueDesc || "Great venue!"}</p>
                          </div>
                          <div className="checkout-right">
                              <label style={{color: '#b0b0b0'}}>Select Quantity:</label>
                              <input type="number" className="auth-input" min="1" max="10" value={bookingModal.quantity} onChange={(e) => setBookingModal({...bookingModal, quantity: parseInt(e.target.value) || 1})} />
                              <div className="price-calculation">
                                  <div className="price-row"><span>Price:</span><span>RM{bookingModal.event.price}</span></div>
                                  <div className="price-row total-row"><span>Total:</span><span>RM{total}</span></div>
                              </div>
                              <button className="book-btn" onClick={() => setStep(2)}>Next: Payment →</button>
                          </div>
                      </div>
                  )}

                  {step === 2 && (
                      <div>
                          <h3>Select Payment Method</h3>
                          <div className="payment-options">
                              <div className={`payment-option ${paymentMethod === 'ewallet' ? 'selected' : ''}`} onClick={() => setPaymentMethod('ewallet')}>
                                  <span className="payment-logo">📱</span>
                                  <div><strong>Touch 'n Go / GrabPay</strong><div style={{fontSize: '0.8rem', color: '#888'}}>Scan QR Code instantly</div></div>
                              </div>
                              <div className={`payment-option ${paymentMethod === 'card' ? 'selected' : ''}`} onClick={() => setPaymentMethod('card')}>
                                  <span className="payment-logo">💳</span>
                                  <div><strong>Credit / Debit Card</strong><div style={{fontSize: '0.8rem', color: '#888'}}>Visa, Mastercard, Amex</div></div>
                              </div>
                          </div>
                          <div className="price-calculation" style={{textAlign: 'center'}}>Paying <strong style={{color: '#03dac6', fontSize: '1.2rem'}}>RM{total}</strong> using {paymentMethod === 'ewallet' ? 'E-Wallet' : 'Card'}</div>
                          <div className="modal-actions">
                              <button className="btn-secondary" onClick={() => setStep(1)}>← Back</button>
                              <button className="book-btn" onClick={handlePayment}>Confirm Payment</button>
                          </div>
                      </div>
                  )}

                  {step === 3 && (
                      <div style={{textAlign: 'center', padding: '40px'}}>
                          <div className="spinner"></div>
                          <h3>Processing Payment...</h3>
                          <p style={{color: '#b0b0b0'}}>Contacting Bank...</p>
                      </div>
                  )}
                  
                  {step === 1 && <button className="btn-secondary" style={{marginTop: '20px', width: '100%'}} onClick={() => setBookingModal({show:false})}>Cancel Booking</button>}
              </div>
          </div>
      );
  };

  const MyTicketsView = () => {
      
      return (
          <div className="app-container">
              <nav className="navbar">
                <div className="logo">My Tickets</div>
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
            fetch('http://localhost:5000/api/admin/users').then(res => res.json()).then(setUsers);
          }
      }

      const totalRevenue = stats.reduce((sum, b) => sum + b.totalPrice, 0);

      return (
          <div className="app-container">
              <nav className="navbar">
                    <div className="logo">GigFinder <span style={{fontSize:'0.8rem', color: 'red'}}>ADMIN</span></div>
                    <div style={{display:'flex', gap:'10px'}}>
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
      
      {/* Booking Popup logic is handled inside this component now */}
      <BookingPopup />

      <nav className="navbar">
        <div className="logo">GigFinder</div>
        <div style={{display:'flex', gap:'15px'}}>
            {user?.role === 'admin' && <button className="nav-btn" onClick={() => setView('admin')}>Admin Dashboard</button>}
            <button className="nav-btn" onClick={() => setView('mytickets')}>My Tickets</button>
            <button className="nav-btn" onClick={() => {setUser(null); setView('login')}}>Logout</button>
        </div>
      </nav>

      <div className="search-container" style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <input 
            className="search-bar" 
            style={{flex: 1, margin: 0}}
            placeholder="🔍 Search for artists..." 
            onChange={e => {
                fetch(`http://localhost:5000/api/events/search?q=${e.target.value}`).then(res=>res.json()).then(setEvents);
            }} 
        />
        <select 
            className="auth-input" 
            style={{width: '200px', margin: 0}}
            onChange={(e) => {
                const sortType = e.target.value;
                const sorted = [...events].sort((a, b) => {
                    if(sortType === 'price-low') return a.price - b.price;
                    if(sortType === 'price-high') return b.price - a.price;
                    if(sortType === 'date') return new Date(a.date) - new Date(b.date);
                    return 0;
                });
                setEvents(sorted);
            }}
        >
            <option value="date">📅 Date (Earliest)</option>
            <option value="price-low">💰 Price (Low to High)</option>
            <option value="price-high">💎 Price (High to Low)</option>
        </select>
      </div>

      <div className="events-grid">
        {events.map(e => {
            const isSoldOut = e.sold >= e.capacity;
            return (
                <div key={e.id} className="event-card">
                    <img src={e.image} className="card-img" alt={e.name} />
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
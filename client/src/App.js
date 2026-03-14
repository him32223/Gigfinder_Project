import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  // --- ROBUSTNESS: Load initial state from LocalStorage to prevent logout on refresh ---
  const [user, setUser] = useState(() => {
    const savedUser = localStorage.getItem('gigfinder_user');
    return savedUser ? JSON.parse(savedUser) : null;
  });

  const [view, setView] = useState(() => {
    const savedView = localStorage.getItem('gigfinder_view');
    // If we have a user, default to home/admin, otherwise login
    if (savedView && savedView !== 'login' && savedView !== 'register') return savedView;
    return 'login';
  });
  
  // Forms & Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [events, setEvents] = useState([]);
  const [myTickets, setMyTickets] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState('date'); 

  // Modals
  const [modal, setModal] = useState({ show: false, title: '', message: '', type: '' });
  const [bookingModal, setBookingModal] = useState({ show: false, event: null, quantity: 1 });

  // Navigation Fix & Token reading
  useEffect(() => {
    const handleHashChange = () => {
        const hash = window.location.hash.replace('#', '');
        if (hash) setView(hash);
    };
    
    // Check hash on initial load (crucial for clicking the email link)
    if (window.location.hash) {
        handleHashChange();
    }

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  },[]);

  // Navigation Fix (Back Button)
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

  // --- AUTH HANDLERS ---
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

  const handleForgotPassword = async (e) => {
      e.preventDefault();
      const res = await fetch('http://localhost:5000/api/forgot-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email })
      });
      const data = await res.json();
      setModal({ show: true, title: res.ok ? 'Email Sent' : 'Error', message: data.message, type: res.ok ? 'success' : 'error' });
      if(res.ok) setView('login');
  };

  const handleResetPassword = async (e, token) => {
      e.preventDefault();
      const res = await fetch('http://localhost:5000/api/reset-password', {
          method: 'POST', headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token, newPassword: password }) // Reusing password state for the new password
      });
      const data = await res.json();
      setModal({ show: true, title: res.ok ? 'Success' : 'Error', message: data.message, type: res.ok ? 'success' : 'error' });
      if(res.ok) {
          setView('login');
          window.location.hash = 'login';
      }
  };

  const handleLogout = () => {
      setUser(null);
      setView('login');
      localStorage.removeItem('gigfinder_user');
      localStorage.removeItem('gigfinder_view');
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
        setModal({ show: true, title: 'Success', message: 'Tickets Booked! Sent to email.', type: 'success' });
        fetchEvents(); 
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

  // --- COMPONENTS ---

  const BookingPopup = () => {
      const [step, setStep] = useState(1);
      const [paymentMethod, setPaymentMethod] = useState('');
      const [isProcessing, setIsProcessing] = useState(false);
      
      useEffect(() => {
          if (bookingModal.show) { setStep(1); setPaymentMethod(''); setIsProcessing(false); }
      }, [bookingModal.show]);

      if (!bookingModal.show) return null;
      const total = bookingModal.event.price * bookingModal.quantity;

      const handlePayment = () => {
          if (!paymentMethod) return alert("Select payment method");
          setStep(3); setIsProcessing(true);
          setTimeout(async () => { await confirmBooking(); setIsProcessing(false); }, 2000);
      };

      return (
          <div className="modal-overlay">
              <div className="modal-content" style={{maxWidth: '700px', width: '95%'}}>
                  <div className="steps">
                      <div className={`step ${step>=1?'active':''}`}></div><div className={`step ${step>=2?'active':''}`}></div><div className={`step ${step>=3?'active':''}`}></div>
                  </div>
                  <h2 className="modal-title">Checkout: {bookingModal.event.name}</h2>
                  
                  {step === 1 && (
                      <div className="checkout-container">
                          <div className="checkout-left">
                              <img src={bookingModal.event.venueImage} alt="Venue" className="venue-preview" onError={(e)=>{e.target.onerror=null; e.target.src='https://placehold.co/400'}} />
                              <h3 style={{color:'#fff', margin:0}}>📍 {bookingModal.event.venue}</h3>
                              <p style={{color:'#b0b0b0', fontSize:'0.9rem'}}>{bookingModal.event.venueDesc}</p>
                          </div>
                          <div className="checkout-right">
                              <label style={{color:'#b0b0b0'}}>Quantity:</label>
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
                          <h3>Payment Method</h3>
                          <div className="payment-options">
                              <div className={`payment-option ${paymentMethod==='ewallet'?'selected':''}`} onClick={() => setPaymentMethod('ewallet')}>
                                  <span className="payment-logo">📱</span><div><strong>E-Wallet</strong><div style={{fontSize:'0.8rem', color:'#888'}}>TnG / Grab</div></div>
                              </div>
                              <div className={`payment-option ${paymentMethod==='card'?'selected':''}`} onClick={() => setPaymentMethod('card')}>
                                  <span className="payment-logo">💳</span><div><strong>Card</strong><div style={{fontSize:'0.8rem', color:'#888'}}>Visa / Master</div></div>
                              </div>
                          </div>
                          <div className="price-calculation" style={{textAlign:'center'}}>Total: <strong style={{color:'#03dac6'}}>RM{total}</strong></div>
                          <div className="modal-actions">
                              <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
                              <button className="book-btn" onClick={handlePayment}>Pay Now</button>
                          </div>
                      </div>
                  )}

                  {step === 3 && <div style={{textAlign:'center', padding:'40px'}}><div className="spinner"></div><h3>Processing...</h3></div>}
                  {step === 1 && <button className="btn-secondary" style={{marginTop:'20px', width:'100%'}} onClick={() => setBookingModal({show:false})}>Cancel</button>}
              </div>
          </div>
      );
  };

  const MyTicketsView = () => (
      <div className="app-container">
          <nav className="navbar"><div className="logo">My Tickets</div><button className="nav-btn" onClick={() => setView('home')}>← Back</button></nav>
          <div className="events-grid" style={{marginTop:'20px'}}>
              {myTickets.length === 0 ? <p>No tickets yet.</p> : myTickets.map(t => (
                  <div key={t.id} className="event-card" style={{padding:'20px'}}>
                      <h3>{t.eventName}</h3><p>Qty: {t.quantity}</p><p>Paid: RM{t.totalPrice}</p>
                      <button className="btn-danger" onClick={() => cancelTicket(t.id)}>Cancel & Refund</button>
                  </div>
              ))}
          </div>
      </div>
  );

  const AdminDashboard = () => {
      const [tab, setTab] = useState('users');
      const [users, setUsers] = useState([]);
      const [stats, setStats] = useState([]);
      
      // NEW: Added location and time to state
      const [newEvent, setNewEvent] = useState({ 
          name: '', venue: '', location: '', date: '', time: '', price: '', capacity: '', venueDesc: '',
          image: '', venueImage: '' 
      });
      
      const [artistSuggestions, setArtistSuggestions] = useState([]);
      const [isUploading, setIsUploading] = useState(false);

      // NEW: Location Autocomplete Logic
      const MALAYSIAN_LOCATIONS =["Kuala Lumpur", "Penang", "Johor Bahru", "Melaka", "Selangor", "Ipoh", "Kuching", "Kota Kinabalu", "Shah Alam", "Petaling Jaya", "Genting Highlands"];
      const [locationSuggestions, setLocationSuggestions] = useState([]);

      const handleLocationSearch = (query) => {
          setNewEvent({...newEvent, location: query});
          if (query.length > 0) {
              const matches = MALAYSIAN_LOCATIONS.filter(loc => loc.toLowerCase().includes(query.toLowerCase()));
              setLocationSuggestions(matches);
          } else {
              setLocationSuggestions([]);
          }
      };

      const selectLocation = (loc) => {
          setNewEvent({...newEvent, location: loc});
          setLocationSuggestions([]);
      };

      useEffect(() => {
          if (tab === 'users') fetch('http://localhost:5000/api/admin/users').then(res => res.json()).then(setUsers);
          if (tab === 'stats') fetch('http://localhost:5000/api/admin/stats').then(res => res.json()).then(setStats);
      }, [tab]);

      const searchMusicBrainz = async (query) => {
          setNewEvent({...newEvent, name: query});
          if(query.length < 3) { setArtistSuggestions([]); return; }
          try {
              const res = await fetch(`https://musicbrainz.org/ws/2/artist?query=${query}&fmt=json`);
              const data = await res.json();
              setArtistSuggestions(data.artists || []);
          } catch(e) {}
      };

      const selectArtist = (name) => {
          setNewEvent({...newEvent, name: name});
          setArtistSuggestions([]);
      }

      const handleFileUpload = async (e, field) => {
          const file = e.target.files[0];
          if(!file) return;
          const formData = new FormData();
          formData.append('image', file);
          setIsUploading(true);
          try {
              const res = await fetch('http://localhost:5000/api/upload', { method: 'POST', body: formData });
              const data = await res.json();
              if(res.ok) {
                  setNewEvent(prev => ({ ...prev, [field]: data.imageUrl }));
                  // NO ALERT here, to avoid interfering with the re-render
                  console.log("Image uploaded:", data.imageUrl);
              } else {
                  alert("Error: " + data.message);
              }
          } catch(e) { alert("Upload failed"); }
          setIsUploading(false);
      };

      const handleAddEvent = async (e) => {
          e.preventDefault();
          await fetch('http://localhost:5000/api/admin/events', {
              method: 'POST', headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify(newEvent)
          });
          alert("Event Added");
          setNewEvent({ name: '', venue: '', date: '', price: '', capacity: '', venueDesc: '', image: '', venueImage: '' });
      };

      const handleSuspend = async (id) => {
          const days = prompt("Suspension days:");
          if(days) {
            await fetch('http://localhost:5000/api/admin/suspend', {
                method: 'POST', headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId: id, days })
            });
            alert("User Suspended");
            fetch('http://localhost:5000/api/admin/users').then(res => res.json()).then(setUsers);
          }
      }

      return (
          <div className="app-container">
              <nav className="navbar"><div className="logo">GigFinder <span style={{fontSize:'0.8rem', color:'red'}}>ADMIN</span></div><div style={{display:'flex', gap:'10px'}}><button className="nav-btn" onClick={() => setView('home')}>View Site</button><button className="nav-btn" onClick={handleLogout}>Logout</button></div></nav>
              <div className="tabs">
                  <button className={`tab-btn ${tab==='users'?'active':''}`} onClick={() => setTab('users')}>Users</button>
                  <button className={`tab-btn ${tab==='stats'?'active':''}`} onClick={() => setTab('stats')}>Sales</button>
                  <button className={`tab-btn ${tab==='add'?'active':''}`} onClick={() => setTab('add')}>Add Event</button>
              </div>

              {tab === 'users' && <table className="admin-table"><thead><tr><th>Email</th><th>Status</th><th>Action</th></tr></thead><tbody>{users.map(u => <tr key={u.id}><td>{u.email}</td><td style={{color:u.suspensionEnd?'red':'green'}}>{u.suspensionEnd?'Suspended':'Active'}</td><td><button className="btn-danger" onClick={() => handleSuspend(u.id)}>Suspend</button></td></tr>)}</tbody></table>}
              
              {tab === 'stats' && <div><div className="stats-grid"><div className="stat-card"><div className="stat-number">{stats.length}</div>Bookings</div><div className="stat-card"><div className="stat-number">RM{stats.reduce((sum, b) => sum + b.totalPrice, 0)}</div>Revenue</div></div><table className="admin-table"><thead><tr><th>Event</th><th>User</th><th>Qty</th><th>Total</th></tr></thead><tbody>{stats.map(s => <tr key={s.id}><td>{s.eventName}</td><td>{s.user}</td><td>{s.quantity}</td><td>RM{s.totalPrice}</td></tr>)}</tbody></table></div>}

              {tab === 'add' && (
                  <form onSubmit={handleAddEvent} className="auth-card" style={{margin:'0 auto'}}>
                      <h3>Add New Event</h3>
                      
                      {/* 1. MUSICBRAINZ ARTIST AUTOCOMPLETE */}
                      <div style={{position: 'relative'}}>
                        <input className="auth-input" placeholder="Artist Name (Type to Search)" value={newEvent.name} onChange={(e) => searchMusicBrainz(e.target.value)} required />
                        {artistSuggestions.length > 0 && (
                            <div style={{position:'absolute', width:'100%', maxHeight:'150px', overflowY:'auto', background:'#1e1e1e', border:'1px solid #444', zIndex:100, borderRadius:'4px', boxShadow:'0 4px 10px rgba(0,0,0,0.5)'}}>
                                {artistSuggestions.slice(0, 5).map(artist => (
                                    <div key={artist.id} style={{padding:'10px', cursor:'pointer', borderBottom:'1px solid #333', color:'#fff'}} onClick={() => selectArtist(artist.name)}>
                                        {artist.name} <span style={{color:'#777', fontSize:'0.8rem'}}>({artist.country || 'N/A'})</span>
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>

                      {/* 2. VENUE NAME */}
                      <input className="auth-input" placeholder="Venue Name (e.g., Spice Arena)" value={newEvent.venue} onChange={e => setNewEvent({...newEvent, venue: e.target.value})} required />
                      
                      {/* 3. NEW: LOCATION AUTOCOMPLETE (Penang, KL, etc.) */}
                      <div style={{position: 'relative'}}>
                        <input className="auth-input" placeholder="City/Location (Type 'Pen'...)" value={newEvent.location} onChange={(e) => handleLocationSearch(e.target.value)} required />
                        {locationSuggestions.length > 0 && (
                            <div style={{position:'absolute', width:'100%', maxHeight:'150px', overflowY:'auto', background:'#1e1e1e', border:'1px solid #444', zIndex:100, borderRadius:'4px'}}>
                                {locationSuggestions.map((loc, idx) => (
                                    <div key={idx} style={{padding:'10px', cursor:'pointer', borderBottom:'1px solid #333', color:'#fff'}} onClick={() => selectLocation(loc)}>
                                        📍 {loc}
                                    </div>
                                ))}
                            </div>
                        )}
                      </div>

                      {/* 4. VENUE DESCRIPTION */}
                      <textarea className="auth-input" placeholder="Venue Description" value={newEvent.venueDesc} onChange={e => setNewEvent({...newEvent, venueDesc: e.target.value})} />
                      
                      {/* 5. NEW: DATE AND TIME SIDE-BY-SIDE */}
                      <div style={{display:'flex', gap:'10px'}}>
                          <input className="auth-input" type="date" value={newEvent.date} onChange={e => setNewEvent({...newEvent, date: e.target.value})} required />
                          <input className="auth-input" type="time" value={newEvent.time} onChange={e => setNewEvent({...newEvent, time: e.target.value})} required />
                      </div>
                      
                      {/* 6. SECURE IMAGE UPLOADS */}
                      <div style={{textAlign: 'left', marginTop: '10px'}}>
                        <label style={{color:'#b0b0b0', fontSize:'0.9rem'}}>Artist Image (.jpg only):</label>
                        <input type="file" accept=".jpg,.jpeg" style={{color:'#fff', marginTop:'5px'}} onChange={(e) => handleFileUpload(e, 'image')} />
                        {newEvent.image && <p style={{color:'green', fontSize:'0.7rem'}}>File attached: {newEvent.image}</p>}
                      </div>

                      <div style={{textAlign: 'left', marginTop: '10px', marginBottom: '10px'}}>
                        <label style={{color:'#b0b0b0', fontSize:'0.9rem'}}>Venue Image (.jpg only):</label>
                        <input type="file" accept=".jpg,.jpeg" style={{color:'#fff', marginTop:'5px'}} onChange={(e) => handleFileUpload(e, 'venueImage')} />
                        {newEvent.venueImage && <p style={{color:'green', fontSize:'0.7rem'}}>File attached: {newEvent.venueImage}</p>}
                      </div>
                      
                      {/* 7. PRICE AND CAPACITY */}
                      <div style={{display:'flex', gap:'10px'}}>
                          <input className="auth-input" type="number" placeholder="Price" value={newEvent.price} onChange={e => setNewEvent({...newEvent, price: parseInt(e.target.value)})} required />
                          <input className="auth-input" type="number" placeholder="Capacity" value={newEvent.capacity} onChange={e => setNewEvent({...newEvent, capacity: parseInt(e.target.value)})} required />
                      </div>
                      
                      <button className="book-btn" disabled={isUploading}>{isUploading ? 'Uploading...' : 'Publish Event'}</button>
                  </form>
              )}  
          </div>
      )
  }

  // --- VIEW RENDERING ---

  // --- VIEW RENDERING ---

  if (view === 'login' || view === 'register') return (
      <div className="app-container">
        <div className="auth-container">
            <div className="auth-card">
                <h1>GigFinder</h1>
                <form onSubmit={view==='login' ? handleLogin : handleRegister}>
                    <input className="auth-input" type="email" placeholder="Email" value={email} onChange={e=>setEmail(e.target.value)} required />
                    <input className="auth-input" type="password" placeholder="Password" value={password} onChange={e=>setPassword(e.target.value)} required />
                    <button className="book-btn">{view==='login' ? 'Login' : 'Register'}</button>
                </form>
                
                <div style={{marginTop: '15px', fontSize: '0.9rem'}}>
                    <p onClick={() => setView(view==='login' ? 'register' : 'login')} style={{cursor:'pointer', color:'#bb86fc'}}>
                        {view==='login' ? 'Create an Account' : 'Back to Login'}
                    </p>
                    {view === 'login' && (
                        <p onClick={() => setView('forgot-password')} style={{cursor:'pointer', color:'#03dac6', marginTop:'5px'}}>
                            Forgot Password?
                        </p>
                    )}
                </div>
            </div>
        </div>
        {modal.show && <div className="modal-overlay"><div className="modal-content"><h2>{modal.title}</h2><p>{modal.message}</p><button className="book-btn" onClick={() => setModal({show:false})}>OK</button></div></div>}
      </div>
  );

  if (view === 'forgot-password') return (
      <div className="app-container">
        <div className="auth-container">
            <div className="auth-card">
                <h2>Reset Password</h2>
                <p style={{color: '#aaa', fontSize: '0.9rem', marginBottom: '15px'}}>Enter your email and we'll send you a reset link.</p>
                <form onSubmit={handleForgotPassword}>
                    <input className="auth-input" type="email" placeholder="Your Email Address" value={email} onChange={e=>setEmail(e.target.value)} required />
                    <button className="book-btn">Send Reset Link</button>
                </form>
                <p onClick={() => setView('login')} style={{cursor:'pointer', marginTop:'15px', color:'#bb86fc'}}>Back to Login</p>
            </div>
        </div>
        {modal.show && <div className="modal-overlay"><div className="modal-content"><h2>{modal.title}</h2><p>{modal.message}</p><button className="book-btn" onClick={() => setModal({show:false})}>OK</button></div></div>}
      </div>
  );

  if (view.startsWith('reset-password/')) {
      const token = view.split('/')[1]; // Extract token from URL
      return (
          <div className="app-container">
            <div className="auth-container">
                <div className="auth-card">
                    <h2>Set New Password</h2>
                    <form onSubmit={(e) => handleResetPassword(e, token)}>
                        <input className="auth-input" type="password" placeholder="Enter New Password" value={password} onChange={e=>setPassword(e.target.value)} required minLength="3" />
                        <button className="book-btn">Save New Password</button>
                    </form>
                </div>
            </div>
            {modal.show && <div className="modal-overlay"><div className="modal-content"><h2>{modal.title}</h2><p>{modal.message}</p><button className="book-btn" onClick={() => setModal({show:false})}>OK</button></div></div>}
          </div>
      );
  }

  if (view === 'admin') return <AdminDashboard />;
  if (view === 'mytickets') return <MyTicketsView />;

  const today = new Date();
  const upcomingEvents = events.filter(e => new Date(e.date) >= today);
  const pastEvents = events.filter(e => new Date(e.date) < today);

  const sortedUpcoming = [...upcomingEvents].sort((a,b) => {
      if(sortBy === 'price_low') return a.price - b.price;
      if(sortBy === 'price_high') return b.price - a.price;
      if(sortBy === 'date') return new Date(a.date) - new Date(b.date);
      return 0;
  });
  const ChatBot = () => {
      const [isOpen, setIsOpen] = useState(false);
      const [msg, setMsg] = useState('');
      const [chat, setChat] = useState([]);

      const sendChat = async () => {
          setChat([...chat, {from: 'user', text: msg}]);
          const res = await fetch('http://localhost:5000/api/chat', {
              method: 'POST', headers: {'Content-Type': 'application/json'},
              body: JSON.stringify({ prompt: msg })
          });
          const data = await res.json();
          setChat(prev => [...prev, {from: 'bot', text: data.response}]);
          setMsg('');
      };

      return (
          <div style={{position:'fixed', bottom:'20px', right:'20px', zIndex:999}}>
              {isOpen && (
                  <div style={{width:'300px', height:'400px', background:'#1e1e1e', border:'1px solid #bb86fc', borderRadius:'8px', display:'flex', flexDirection:'column'}}>
                      <div style={{padding:'10px', background:'#bb86fc', color:'#000'}}>GigBot</div>
                      <div style={{flex:1, padding:'10px', overflowY:'scroll'}}>
                          {chat.map((c, i) => <p key={i} style={{textAlign: c.from==='user'?'right':'left', color: c.from==='user'?'#fff':'#03dac6'}}>{c.text}</p>)}
                      </div>
                      <div style={{padding:'10px'}}>
                          <input className="auth-input" value={msg} onChange={e=>setMsg(e.target.value)} onKeyPress={e=>e.key==='Enter' && sendChat()} />
                      </div>
                  </div>
              )}
              <button className="book-btn" style={{width:'60px', height:'60px', borderRadius:'50%'}} onClick={()=>setIsOpen(!isOpen)}>💬</button>
          </div>
      );
  }

  return (
    <div className="app-container">
      {modal.show && <div className="modal-overlay"><div className="modal-content"><h2>{modal.title}</h2><p>{modal.message}</p><button className="book-btn" onClick={() => setModal({show:false})}>OK</button></div></div>}
      <BookingPopup />

      <nav className="navbar">
        <div className="logo">GigFinder</div>
        <div style={{display:'flex', gap:'15px'}}>
            {user?.role === 'admin' && <button className="nav-btn" onClick={() => setView('admin')}>Admin Dashboard</button>}
            <button className="nav-btn" onClick={() => setView('mytickets')}>My Tickets</button>
            <button className="nav-btn" onClick={handleLogout}>Logout</button>
        </div>
      </nav>

      <div className="search-container" style={{display: 'flex', gap: '10px', marginBottom: '20px'}}>
        <input className="search-bar" style={{flex:1, margin:0}} placeholder="🔍 Search..." onChange={e => {
            fetch(`http://localhost:5000/api/events/search?q=${e.target.value}`).then(res=>res.json()).then(setEvents);
        }} />
        <select className="auth-input" style={{width:'200px', margin:0}} onChange={(e) => setSortBy(e.target.value)}>
            <option value="date">📅 Date</option><option value="price_low">💰 Price Low</option><option value="price_high">💎 Price High</option>
        </select>
      </div>

      {/* UPCOMING EVENTS */}
      <h2 style={{borderBottom: '1px solid #333', paddingBottom: '10px'}}>🔥 Upcoming Concerts</h2>
      <div className="events-grid">
        {sortedUpcoming.length === 0 ? <p style={{color: '#777'}}>No upcoming events found.</p> : sortedUpcoming.map(e => {
            const isSoldOut = e.sold >= e.capacity;
            return (
                <div key={e.id} className="event-card">
                    <img src={e.image} className="card-img" alt={e.name} onError={(e)=>{e.target.onerror=null; e.target.src='https://placehold.co/400'}} />
                    <div className="card-content">
                        <h2>{e.name}</h2>
                        {/* UPDATED: Displays Date, Time, Venue, and Location */}
                        <p style={{color: '#b0b0b0', fontSize: '0.9rem', marginBottom: '10px'}}>
                            📅 {e.date} {e.time && `at ${e.time}`}<br/>
                            📍 {e.venue}{e.location && `, ${e.location}`}
                        </p>
                        <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                            <span>RM{e.price}</span>
                            <span className={`badge ${isSoldOut ? 'badge-soldout' : 'badge-available'}`}>{isSoldOut ? 'SOLD OUT' : `${e.capacity - e.sold} left`}</span>
                        </div>
                        <button className="book-btn" disabled={isSoldOut} style={{opacity: isSoldOut ? 0.5 : 1}} onClick={() => setBookingModal({show:true, event:e, quantity:1})}>{isSoldOut ? 'Unavailable' : 'Book Now'}</button>
                    </div>
                </div>
            )
        })}
      </div>

      {/* PAST EVENTS */}
      {pastEvents.length > 0 && (
          <>
            <h2 style={{borderBottom: '1px solid #333', paddingBottom: '10px', marginTop: '40px', color: '#777'}}>📜 Past Events</h2>
            <div className="events-grid" style={{opacity: 0.6}}>
                {pastEvents.map(e => (
                    <div key={e.id} className="event-card" style={{filter: 'grayscale(100%)'}}>
                        <img src={e.image} className="card-img" alt={e.name} onError={(e)=>{e.target.onerror=null; e.target.src='https://placehold.co/400'}} />
                        <div className="card-content">
                            <h2>{e.name}</h2>
                            {/* UPDATED: Displays Date, Time, Venue, and Location for Past Events too */}
                            <p style={{color: '#b0b0b0', fontSize: '0.9rem', marginBottom: '10px'}}>
                                📅 {e.date} {e.time && `at ${e.time}`}<br/>
                                📍 {e.venue}{e.location && `, ${e.location}`}
                            </p>
                            <button className="btn-secondary" disabled style={{width:'100%', cursor:'not-allowed'}}>Event Passed</button>
                        </div>
                    </div>
                ))}
            </div>
          </>
      )}

      
      <ChatBot />
    </div>
    
  );
}

export default App;
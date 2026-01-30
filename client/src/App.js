import React, { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [events, setEvents] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');

  // Feature 1: Load Events on Startup
  useEffect(() => {
    fetchEvents();
  }, []);

  const fetchEvents = async () => {
    try {
      const response = await fetch('http://localhost:5000/api/events');
      const data = await response.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
    }
  };

  // Feature 2: Handle Search
  const handleSearch = async (e) => {
    e.preventDefault();
    const response = await fetch(`http://localhost:5000/api/events/search?q=${searchTerm}`);
    const data = await response.json();
    setEvents(data);
  };

  // Feature 3: Handle Mock Booking
  const handleBook = async (eventId, eventName) => {
    const quantity = prompt(`How many tickets for ${eventName}?`);
    if (!quantity) return;

    const response = await fetch('http://localhost:5000/api/book', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        eventId, 
        quantity: parseInt(quantity), 
        user: "Student_User" 
      })
    });
    
    const result = await response.json();
    alert(result.message); // Show confirmation
  };

  return (
    <div className="App" style={{ padding: "20px", fontFamily: "Arial" }}>
      <h1>GigFinder Prototype</h1>
      
      {/* Search Bar */}
      <form onSubmit={handleSearch} style={{ marginBottom: "20px" }}>
        <input 
          type="text" 
          placeholder="Search artist or venue..." 
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          style={{ padding: "10px", width: "300px" }}
        />
        <button type="submit" style={{ padding: "10px" }}>Search</button>
      </form>

      {/* Event List */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "20px" }}>
        {events.map(event => (
          <div key={event.id} style={{ border: "1px solid #ccc", padding: "15px", borderRadius: "8px" }}>
            <img src={event.image} alt={event.name} style={{ width: "100%", height: "150px", objectFit: "cover" }} />
            <h2>{event.name}</h2>
            <p><strong>Venue:</strong> {event.venue}</p>
            <p><strong>Date:</strong> {event.date}</p>
            <p><strong>Price:</strong> RM{event.price}</p>
            <button 
              onClick={() => handleBook(event.id, event.name)}
              style={{ backgroundColor: "#28a745", color: "white", padding: "10px", width: "100%", border: "none", cursor: "pointer" }}
            >
              Book Now
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default App;
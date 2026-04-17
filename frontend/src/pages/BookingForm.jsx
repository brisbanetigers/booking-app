import { useState, useEffect } from 'react';
import { submitBooking, getOperatingHours } from '../services/api';
import { CalendarDays, Users, Mail, User, Clock, Info } from 'lucide-react';

export default function BookingForm() {
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    booking_date: '',
    booking_time: '',
    party_size: 2,
  });

  const [hoursConfig, setHoursConfig] = useState({ standard: [], special: [] });
  const [activeHours, setActiveHours] = useState(null); // { is_closed, open_time, close_time }
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // On Mount fetch hours
  useEffect(() => {
    getOperatingHours()
      .then(data => setHoursConfig(data))
      .catch(err => console.error(err));
  }, []);

  // Update active limits whenever date changes
  useEffect(() => {
    if (!formData.booking_date || hoursConfig.standard.length === 0) {
      setActiveHours(null);
      return;
    }

    const { standard, special } = hoursConfig;
    
    // Check if it's a special date
    const specialMatch = special.find(s => s.special_date.startsWith(formData.booking_date));
    
    if (specialMatch) {
      setActiveHours({
        is_closed: specialMatch.is_closed,
        open_time: specialMatch.is_closed ? null : specialMatch.open_time.substring(0,5),
        close_time: specialMatch.is_closed ? null : specialMatch.close_time.substring(0,5),
      });
    } else {
      // Find standard day
      const d = new Date(formData.booking_date + "T00:00:00");
      const dayIndex = d.getDay();
      const standardMatch = standard.find(s => s.day_of_week === dayIndex);
      
      if (standardMatch) {
        setActiveHours({
          is_closed: standardMatch.is_closed,
          open_time: standardMatch.is_closed ? null : standardMatch.open_time.substring(0,5),
          close_time: standardMatch.is_closed ? null : standardMatch.close_time.substring(0,5),
        });
      }
    }
  }, [formData.booking_date, hoursConfig]);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (activeHours && activeHours.is_closed) {
        throw new Error("Cannot book on a closed day.");
      }

      // Check bounds on client side to be safe
      if (activeHours && formData.booking_time) {
         if (formData.booking_time < activeHours.open_time || formData.booking_time > activeHours.close_time) {
           throw new Error(`Please choose a valid time between ${activeHours.open_time} and ${activeHours.close_time}`);
         }
      }

      const dateTimeString = `${formData.booking_date}T${formData.booking_time}:00`;
      
      await submitBooking({
        customer_name: formData.customer_name,
        email: formData.email,
        booking_slot: dateTimeString,
        party_size: parseInt(formData.party_size, 10),
      });

      setMessage({ text: 'Booking confirmed! A confirmation email has been sent.', type: 'success' });
      setFormData({
        customer_name: '',
        email: '',
        booking_date: '',
        booking_time: '',
        party_size: 2,
      });
    } catch (err) {
      const errorText = Array.isArray(err.message) 
        ? err.message.map(e => e.message).join(', ') 
        : err.message;
        
      setMessage({ text: errorText || 'Failed to submit booking.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="glass-card">
      <h2 className="card-title">Reserve a Table</h2>
      <p className="card-subtitle">An elegant botanical dining experience.</p>

      {message.text && (
        <div className={`message ${message.type}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label className="form-label" htmlFor="customer_name">
            <User size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
            Full Name
          </label>
          <input type="text" id="customer_name" name="customer_name" className="form-input" placeholder="John Doe" value={formData.customer_name} onChange={handleChange} required minLength="2" />
        </div>

        <div className="form-group">
          <label className="form-label" htmlFor="email">
            <Mail size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
            Email Address
          </label>
          <input type="email" id="email" name="email" className="form-input" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="booking_date">
              <CalendarDays size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
              Date
            </label>
            <input type="date" id="booking_date" name="booking_date" className="form-input" value={formData.booking_date} onChange={handleChange} min={new Date().toISOString().split('T')[0]} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking_time">
              <Clock size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
              Time
            </label>
            <input 
              type="time" 
              id="booking_time" 
              name="booking_time" 
              className="form-input" 
              value={formData.booking_time} 
              onChange={handleChange} 
              required
              disabled={activeHours?.is_closed}
              min={activeHours?.open_time || undefined}
              max={activeHours?.close_time || undefined}
            />
          </div>
        </div>

        {/* Operating Hours Helper Note */}
        {activeHours && (
           <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: activeHours.is_closed ? 'var(--danger-color)' : 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: activeHours.is_closed ? 'rgba(176, 125, 126, 0.1)' : 'rgba(95, 108, 91, 0.1)', padding: '0.6rem', borderRadius: '8px' }}>
             <Info size={14} />
             {activeHours.is_closed ? 'We are closed on the selected date.' : `Open ${activeHours.open_time} - ${activeHours.close_time} on selected date.`}
           </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="party_size">
            <Users size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
            Party Size
          </label>
          <input type="number" id="party_size" name="party_size" className="form-input" min="1" max="20" value={formData.party_size} onChange={handleChange} required />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || (activeHours && activeHours.is_closed)}>
          {loading ? 'Confirming...' : 'Confirm Reservation'}
        </button>
      </form>
    </div>
  );
}

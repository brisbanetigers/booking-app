import { useState, useEffect } from 'react';
import { submitBooking, getOperatingHours } from '../services/api';
import { CalendarDays, Users, Mail, User, Clock, Info, Phone } from 'lucide-react';

import DatePicker from 'react-datepicker';
import 'react-datepicker/dist/react-datepicker.css';
import '../datepicker.css';
import { startOfDay } from 'date-fns';

export default function BookingForm() {
  const [formData, setFormData] = useState({
    customer_name: '',
    email: '',
    mobile_number: '',
    booking_date: null,
    booking_time: '',
    party_size: 2,
  });

  const [hoursConfig, setHoursConfig] = useState({ standard: [], special: [] });
  const [activeHours, setActiveHours] = useState(null); // { open_time, close_time }
  const [timeSlots, setTimeSlots] = useState([]);
  
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: '', type: '' });

  // On Mount fetch hours
  useEffect(() => {
    getOperatingHours()
      .then(data => setHoursConfig(data))
      .catch(err => console.error(err));
  }, []);

  // Determine active hours and generate time slots when date changes
  useEffect(() => {
    if (!formData.booking_date || hoursConfig.standard.length === 0) {
      setActiveHours(null);
      setTimeSlots([]);
      return;
    }

    // Convert selected date to local YYYY-MM-DD
    const d = formData.booking_date;
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;

    const { standard, special } = hoursConfig;
    let foundHours = null;

    // Check special hours first
    const specialMatch = special.find(s => s.special_date.startsWith(dateStr));
    if (specialMatch) {
      if (!specialMatch.is_closed) foundHours = specialMatch;
    } else {
      // Check standard hours
      const standardMatch = standard.find(s => s.day_of_week === d.getDay());
      if (standardMatch && !standardMatch.is_closed) foundHours = standardMatch;
    }

    if (foundHours) {
      const oTime = foundHours.open_time.substring(0,5);
      const cTime = foundHours.close_time.substring(0,5);
      setActiveHours({ open_time: oTime, close_time: cTime });
      generateTimeSlots(oTime, cTime);
    } else {
      setActiveHours(null);
      setTimeSlots([]);
    }
  }, [formData.booking_date, hoursConfig]);

  const generateTimeSlots = (openTimeStr, closeTimeStr) => {
    const slots = [];
    const [openH, openM] = openTimeStr.split(':').map(Number);
    const [closeH, closeM] = closeTimeStr.split(':').map(Number);
    
    let currentH = openH;
    let currentM = openM;
    
    while (true) {
      const currentMins = currentH * 60 + currentM;
      const closeMins = closeH * 60 + closeM;
      
      // Stop creating slots 1 hour before close buffer
      if (currentMins > closeMins - 60) break;

      const formattedH = currentH.toString().padStart(2, '0');
      const formattedM = currentM.toString().padStart(2, '0');
      slots.push(`${formattedH}:${formattedM}`);
      
      currentM += 30;
      if (currentM >= 60) {
        currentH += 1;
        currentM -= 60;
      }
    }
    setTimeSlots(slots);
    
    // Auto-select first slot if none selected or if previously selected is invalid
    setFormData(prev => ({
       ...prev, 
       booking_time: slots.length > 0 ? slots[0] : '' 
    }));
  };

  // filterDate dynamically disables dates in the DatePicker UI
  const isDateSelectable = (date) => {
    if (!hoursConfig || hoursConfig.standard.length === 0) return true; // allow while loading

    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const dateStr = `${year}-${month}-${day}`;
    
    // special rule?
    const specialMatch = hoursConfig.special.find(s => s.special_date.startsWith(dateStr));
    if (specialMatch) return !specialMatch.is_closed;

    // standard rule
    const standardMatch = hoursConfig.standard.find(s => s.day_of_week === date.getDay());
    if (standardMatch) return !standardMatch.is_closed;

    return true; // fail open
  };

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleDateChange = (date) => {
    setFormData({ ...formData, booking_date: date });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage({ text: '', type: '' });

    try {
      if (!formData.booking_date || !formData.booking_time) {
        throw new Error("Please select both a valid date and time.");
      }

      // Reconstruct intended local string without Z
      const year = formData.booking_date.getFullYear();
      const month = String(formData.booking_date.getMonth() + 1).padStart(2, '0');
      const day = String(formData.booking_date.getDate()).padStart(2, '0');
      const dateStr = `${year}-${month}-${day}`;

      const dateTimeString = `${dateStr}T${formData.booking_time}:00`;
      
      await submitBooking({
        customer_name: formData.customer_name,
        email: formData.email,
        mobile_number: formData.mobile_number,
        booking_slot: dateTimeString,
        party_size: parseInt(formData.party_size, 10),
      });

      setMessage({ text: 'Booking confirmed! A confirmation email has been sent.', type: 'success' });
      setFormData({
        customer_name: '',
        email: '',
        mobile_number: '',
        booking_date: null,
        booking_time: '',
        party_size: 2,
      });
      setActiveHours(null);
      setTimeSlots([]);
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

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">
              <Mail size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
              Email Address
            </label>
            <input type="email" id="email" name="email" className="form-input" placeholder="john@example.com" value={formData.email} onChange={handleChange} required />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="mobile_number">
              <Phone size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
              Mobile Number
            </label>
            <input type="tel" id="mobile_number" name="mobile_number" className="form-input" placeholder="0400 000 000" value={formData.mobile_number} onChange={handleChange} required minLength="5"/>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
          <div className="form-group date-picker-wrapper">
            <label className="form-label" htmlFor="booking_date">
              <CalendarDays size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
              Date
            </label>
            <DatePicker
              selected={formData.booking_date}
              onChange={handleDateChange}
              minDate={startOfDay(new Date())}
              filterDate={isDateSelectable}
              className="form-input custom-datepicker"
              placeholderText="Select a Date"
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="booking_time">
              <Clock size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
              Time
            </label>
            <select
              id="booking_time"
              name="booking_time"
              className="form-input"
              value={formData.booking_time}
              onChange={handleChange}
              required
              disabled={!formData.booking_date || timeSlots.length === 0}
            >
              {timeSlots.length === 0 && <option value="">No Slots</option>}
              {timeSlots.map(slot => (
                <option key={slot} value={slot}>{slot}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Operating Hours Helper Note */}
        {activeHours && (
           <div style={{ marginBottom: '1.25rem', fontSize: '0.85rem', color: 'var(--accent-color)', display: 'flex', alignItems: 'center', gap: '0.4rem', background: 'rgba(95, 108, 91, 0.1)', padding: '0.6rem', borderRadius: '8px' }}>
             <Info size={14} />
             Open {activeHours.open_time} - {activeHours.close_time}
           </div>
        )}

        <div className="form-group">
          <label className="form-label" htmlFor="party_size">
            <Users size={16} style={{display:'inline', marginRight:'6px', verticalAlign:'text-bottom'}}/>
            Party Size
          </label>
          <input type="number" id="party_size" name="party_size" className="form-input" min="1" max="20" value={formData.party_size} onChange={handleChange} required />
        </div>

        <button type="submit" className="btn btn-primary" disabled={loading || !formData.booking_date || !formData.booking_time}>
          {loading ? 'Confirming...' : 'Confirm Reservation'}
        </button>
      </form>
    </div>
  );
}

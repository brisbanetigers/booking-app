import { useState, useEffect } from 'react';
import { fetchBookings, updateBookingStatus, getOperatingHours, updateStandardHours, updateSpecialHours, deleteSpecialHours } from '../services/api';
import { Lock, LogOut, Check, X, UserCheck, CalendarDays, Clock, Trash2, Users, Phone, Mail } from 'lucide-react';

export default function StaffDashboard() {
  const [credentials, setCredentials] = useState({ username: '', password: '' });
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [activeTab, setActiveTab] = useState('bookings'); // bookings | hours
  
  const [bookings, setBookings] = useState([]);
  const [hoursConfig, setHoursConfig] = useState({ standard: [], special: [] });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  // Form states for new special exception
  const [newSpecial, setNewSpecial] = useState({ special_date: '', open_time: '09:00', close_time: '17:00', is_closed: true, reason: '' });

  const loadData = async (creds) => {
    try {
      setLoading(true);
      const bData = await fetchBookings(creds);
      const hData = await getOperatingHours();
      setBookings(bData);
      setHoursConfig(hData);
      setIsAuthenticated(true);
      setError('');
    } catch (err) {
      setError('Authentication failed or unable to fetch data.');
      setIsAuthenticated(false);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = (e) => {
    e.preventDefault();
    loadData(credentials);
  };

  const handleStatusUpdate = async (id, status) => {
    try {
      await updateBookingStatus(id, status, credentials);
      setBookings(bookings.map(b => b.uuid === id ? { ...b, status } : b));
    } catch (err) {
      alert('Failed to update status.');
    }
  };

  // -- Hours Management Methods -- 
  const handleStandardHourChange = (dayIndex, field, value) => {
    setHoursConfig(prev => {
      const newStandard = [...prev.standard];
      newStandard[dayIndex] = { ...newStandard[dayIndex], [field]: value };
      return { ...prev, standard: newStandard };
    });
  };

  const saveStandardHours = async () => {
    try {
      setSuccessMsg(''); setError('');
      await updateStandardHours(hoursConfig.standard, credentials);
      setSuccessMsg('Standard hours saved successfully.');
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to save standard hours.');
    }
  };

  const saveSpecialException = async (e) => {
    e.preventDefault();
    try {
      setSuccessMsg(''); setError('');
      await updateSpecialHours(newSpecial, credentials);
      setSuccessMsg('Special exception added.');
      setNewSpecial({ special_date: '', open_time: '09:00', close_time: '17:00', is_closed: true, reason: '' });
      // reload hours
      const hData = await getOperatingHours();
      setHoursConfig(hData);
      setTimeout(() => setSuccessMsg(''), 3000);
    } catch (err) {
      setError('Failed to add special hours.');
    }
  };

  const handleRemoveSpecial = async (dateStr) => {
    if (!window.confirm('Remove this holiday exception?')) return;
    try {
      setSuccessMsg(''); setError('');
      // Postgres returns timestamp format sometimes from backend, need to format to YYYY-MM-DD
      const formattedDate = new Date(dateStr).toISOString().split('T')[0];
      await deleteSpecialHours(formattedDate, credentials);
      const hData = await getOperatingHours();
      setHoursConfig(hData);
    } catch (err) {
      setError('Failed to remove exception.');
    }
  };

  const handleLogout = () => {
    setIsAuthenticated(false);
    setCredentials({ username: '', password: '' });
    setBookings([]);
  };

  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

  if (!isAuthenticated) {
    return (
      <div className="glass-card">
        <h2 className="card-title">Staff Portal</h2>
        <p className="card-subtitle">Authenticate to manage bookings and store hours.</p>
        
        {error && <div className="message error">{error}</div>}

        <form onSubmit={handleLogin}>
          <div className="form-group">
            <label className="form-label">Username</label>
            <input type="text" className="form-input" value={credentials.username} onChange={(e) => setCredentials({ ...credentials, username: e.target.value })} required />
          </div>
          <div className="form-group">
            <label className="form-label">Password</label>
            <input type="password" className="form-input" value={credentials.password} onChange={(e) => setCredentials({ ...credentials, password: e.target.value })} required />
          </div>
          <button type="submit" className="btn btn-primary" disabled={loading}>
            <Lock size={18} /> {loading ? 'Authenticating...' : 'Secure Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="glass-card dashboard-container" style={{ maxWidth: '1000px', width: '100%' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div>
          <h2 className="card-title" style={{textAlign: 'left'}}>Staff Dashboard</h2>
        </div>
        <div style={{display: 'flex', gap: '0.5rem'}}>
          <button 
            onClick={() => setActiveTab('bookings')} 
            className={`btn btn-sm ${activeTab === 'bookings' ? 'btn-primary' : 'btn-outline'}`}
          >
            <Users size={16} /> Bookings
          </button>
          <button 
            onClick={() => setActiveTab('hours')} 
            className={`btn btn-sm ${activeTab === 'hours' ? 'btn-primary' : 'btn-outline'}`}
          >
            <CalendarDays size={16} /> Operating Hours
          </button>
          <button onClick={handleLogout} className="btn btn-outline btn-sm" style={{marginLeft: '1rem'}}>
            <LogOut size={16} /> Logout
          </button>
        </div>
      </div>

      {error && <div className="message error">{error}</div>}
      {successMsg && <div className="message success">{successMsg}</div>}

      {/* BOOKINGS TAB */}
      {activeTab === 'bookings' && (
        <div className="table-container">
          <table className="booking-table">
            <thead>
              <tr><th>Time</th><th>Customer</th><th>Party</th><th>Status</th><th>Actions</th></tr>
            </thead>
            <tbody>
              {bookings.length === 0 ? (
                <tr><td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>No upcoming bookings.</td></tr>
              ) : (
                bookings.map(booking => (
                  <tr key={booking.uuid}>
                    <td>{new Date(booking.booking_slot).toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute:'2-digit' })}</td>
                    <td>
                      <div style={{ fontWeight: 500 }}>{booking.customer_name}</div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                        <Mail size={12} style={{verticalAlign: 'middle', marginRight: '4px'}}/> {booking.email}
                      </div>
                      <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        <Phone size={12} style={{verticalAlign: 'middle', marginRight: '4px'}}/> 
                        {booking.mobile_number ? (
                          <a href={`tel:${booking.mobile_number}`} style={{ color: 'inherit', textDecoration: 'none' }}>
                            {booking.mobile_number}
                          </a>
                        ) : 'No Number'}
                      </div>
                    </td>
                    <td>{booking.party_size}</td>
                    <td><span className={`status-badge status-${booking.status.toLowerCase()}`}>{booking.status}</span></td>
                    <td className="actions-cell">
                      {booking.status !== 'Cancelled' && booking.status !== 'Arrived' && (
                        <>
                          <button onClick={() => handleStatusUpdate(booking.uuid, 'Confirmed')} className="btn btn-outline btn-sm" title="Confirm"><Check size={14} /></button>
                          <button onClick={() => handleStatusUpdate(booking.uuid, 'Arrived')} className="btn btn-outline btn-sm" title="Check-in"><UserCheck size={14} /></button>
                          <button onClick={() => handleStatusUpdate(booking.uuid, 'Cancelled')} className="btn btn-outline btn-sm" style={{ borderColor: 'var(--danger-color)', color: 'var(--danger-color)' }} title="Cancel"><X size={14} /></button>
                        </>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* OPERATING HOURS TAB */}
      {activeTab === 'hours' && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginTop: '1rem' }}>
          
          {/* STANDARD HOURS */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 500, color: 'var(--accent-color)' }}>Standard Weekly Hours</h3>
            {hoursConfig.standard.map((day, idx) => (
              <div key={day.day_of_week} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.8rem', padding: '0.5rem', background: '#fff', borderRadius: '8px', border: '1px solid rgba(181, 154, 101, 0.2)' }}>
                <div style={{ width: '100px', fontWeight: 500 }}>{dayNames[day.day_of_week]}</div>
                
                <label style={{ display: 'flex', alignItems: 'center', gap: '0.2rem', fontSize: '0.85rem' }}>
                  <input type="checkbox" checked={!day.is_closed} onChange={(e) => handleStandardHourChange(idx, 'is_closed', !e.target.checked)} />
                  Open
                </label>

                {!day.is_closed ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1, justifyContent: 'flex-end' }}>
                    <input type="time" value={day.open_time.substring(0,5)} onChange={(e) => handleStandardHourChange(idx, 'open_time', e.target.value)} className="form-input" style={{ width: '100px', padding: '0.2rem' }} />
                    <span style={{color:'var(--text-secondary)'}}>-</span>
                    <input type="time" value={day.close_time.substring(0,5)} onChange={(e) => handleStandardHourChange(idx, 'close_time', e.target.value)} className="form-input" style={{ width: '100px', padding: '0.2rem' }} />
                  </div>
                ) : (
                  <div style={{ flex: 1, textAlign: 'right', color: 'var(--danger-color)', fontStyle: 'italic', fontSize:'0.9rem' }}>Closed</div>
                )}
              </div>
            ))}
            <button onClick={saveStandardHours} className="btn btn-primary" style={{marginTop: '1rem'}}>Save Standard Hours</button>
          </div>

          {/* SPECIAL HOLIDAYS */}
          <div>
            <h3 style={{ fontSize: '1.2rem', marginBottom: '1.5rem', fontWeight: 500, color: 'var(--accent-color)' }}>Holidays & Exceptions</h3>
            
            <div style={{ background: '#fff', padding: '1rem', borderRadius: '8px', border: '1px solid rgba(181, 154, 101, 0.2)', marginBottom: '2rem' }}>
              <h4 style={{ marginBottom: '1rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Add Date Exception</h4>
              <form onSubmit={saveSpecialException}>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '0.8rem' }}>
                  <input type="date" className="form-input" style={{padding:'0.4rem'}} value={newSpecial.special_date} onChange={e => setNewSpecial({...newSpecial, special_date: e.target.value})} required min={new Date().toISOString().split('T')[0]} />
                  <input type="text" className="form-input" style={{padding:'0.4rem'}} placeholder="Reason (e.g. Christmas)" value={newSpecial.reason} onChange={e => setNewSpecial({...newSpecial, reason: e.target.value})} />
                </div>
                
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', fontSize: '0.9rem' }}>
                    <input type="checkbox" checked={!newSpecial.is_closed} onChange={e => setNewSpecial({...newSpecial, is_closed: !e.target.checked})} />
                    Store is Open
                  </label>
                  
                  {!newSpecial.is_closed && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <input type="time" className="form-input" style={{padding:'0.4rem', width:'100px'}} value={newSpecial.open_time} onChange={e => setNewSpecial({...newSpecial, open_time: e.target.value})} required />
                      <span>-</span>
                      <input type="time" className="form-input" style={{padding:'0.4rem', width:'100px'}} value={newSpecial.close_time} onChange={e => setNewSpecial({...newSpecial, close_time: e.target.value})} required />
                    </div>
                  )}
                </div>
                <button type="submit" className="btn btn-outline btn-sm" style={{width: '100%'}}>+ Add Exception</button>
              </form>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              {hoursConfig.special.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textAlign: 'center', marginTop: '1rem' }}>No upcoming exceptions configured.</p>
              ) : (
                hoursConfig.special.map(ex => {
                  const dStr = new Date(ex.special_date).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
                  return (
                    <div key={ex.special_date} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '0.8rem', background: 'rgba(181, 154, 101, 0.05)', border: '1px solid rgba(181, 154, 101, 0.2)', borderRadius: '8px' }}>
                      <div>
                        <div style={{ fontWeight: 500, fontSize: '0.95rem' }}>{dStr} {ex.reason && <span style={{marginLeft:'0.5rem', fontWeight:'normal', color:'var(--text-secondary)'}}>({ex.reason})</span>}</div>
                        <div style={{ fontSize: '0.85rem', color: ex.is_closed ? 'var(--danger-color)' : 'var(--text-primary)' }}>
                          {ex.is_closed ? 'Closed' : `Open: ${ex.open_time.substring(0,5)} - ${ex.close_time.substring(0,5)}`}
                        </div>
                      </div>
                      <button onClick={() => handleRemoveSpecial(ex.special_date)} className="btn btn-outline btn-sm" style={{ border: 'none', color: 'var(--danger-color)' }}><Trash2 size={16} /></button>
                    </div>
                  );
                })
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}



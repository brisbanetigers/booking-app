import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import BookingForm from './pages/BookingForm';
import StaffDashboard from './pages/StaffDashboard';

function App() {
  return (
    <Router>
      <div className="app-container">
        <header className="glass-header">
          <div className="logo-container">
            <img src="/logo.png" alt="The Author Forestville" className="brand-logo" />
          </div>
        </header>

        <main className="main-content">
          <Routes>
            <Route path="/" element={<BookingForm />} />
            <Route path="/staff" element={<StaffDashboard />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

export default App;

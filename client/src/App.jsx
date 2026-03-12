import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import Landing from './pages/Landing';
import Login from './pages/Login';
import Signup from './pages/Signup';
import Dashboard from './pages/Dashboard';
import SessionSummary from './pages/SessionSummary';
import Settings from './pages/Settings';
import './App.css';

function App() {
  return (
    <div className="app">
      <Routes>
        <Route path="/" element={<><Navbar /><Landing /></>} />
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />

        {/* Keeping old routes accessible for the extension to use */}
        <Route path="/dashboard" element={<><Navbar /><div className="main-content"><Dashboard /></div></>} />
        <Route path="/summary/:sessionId" element={<><Navbar /><div className="main-content"><SessionSummary /></div></>} />
        <Route path="/settings" element={<><Navbar /><div className="main-content"><Settings /></div></>} />
      </Routes>
    </div>
  );
}

export default App;

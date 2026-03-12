import { Routes, Route } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProtectedRoute from './components/ProtectedRoute';
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

        {/* Protected routes — require authentication */}
        <Route path="/dashboard" element={<ProtectedRoute><Navbar /><div className="main-content"><Dashboard /></div></ProtectedRoute>} />
        <Route path="/summary/:sessionId" element={<ProtectedRoute><Navbar /><div className="main-content"><SessionSummary /></div></ProtectedRoute>} />
        <Route path="/settings" element={<ProtectedRoute><Navbar /><div className="main-content"><Settings /></div></ProtectedRoute>} />
      </Routes>
    </div>
  );
}

export default App;


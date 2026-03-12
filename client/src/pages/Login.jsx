import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const res = await loginUser(email, password);
      console.log('Login Success:', res);

      // Store token and user data
      if (res.data && res.data.token) {
        localStorage.setItem('voxpath_token', res.data.token);
        localStorage.setItem('voxpath_user', JSON.stringify(res.data.user));
      }

      // Navigate to dashboard automatically
      navigate('/dashboard');
    } catch (err) {
      console.error('Login Failed', err);
      const errorMsg = err.response && err.response.data && err.response.data.error
        ? err.response.data.error
        : 'Login failed. Ensure backend is running.';
      alert(errorMsg);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <Link to="/" style={{ display: 'inline-flex', alignItems: 'center', gap: '8px', fontSize: '1.5rem', fontWeight: 800, color: 'var(--color-text-primary)' }}>
            <span style={{ color: 'var(--color-accent-primary)' }}>🛡️</span>
            VoxPath
          </Link>
          <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>Log in to your account</p>
        </div>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="email">Email address</label>
            <input
              id="email"
              type="email"
              className="form-input"
              placeholder="name@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="password">Password</label>
            <input
              id="password"
              type="password"
              className="form-input"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>

          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-xl)', fontSize: 'var(--font-size-sm)' }}>
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
              <input type="checkbox" /> Remember me
            </label>
            <a href="#" style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>Forgot password?</a>
          </div>

          <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px' }}>
            Log in
          </button>
        </form>

        <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
          Don't have an account? <Link to="/signup" style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>Sign up</Link>
        </div>
      </div>
    </div>
  );
}

export default Login;

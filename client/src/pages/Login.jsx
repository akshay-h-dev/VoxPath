import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { loginUser } from '../services/api';
import { useAuth } from '../context/AuthContext';

function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  const navigate = useNavigate();
  const { login } = useAuth(); // get login function from AuthContext

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    try {
      const res = await loginUser(email, password);
      console.log('Login Success:', res);

      if (res.data && res.data.token) {
        login(res.data.token); // store token via AuthContext
      }

      navigate('/dashboard');
    } catch (err) {
      console.error('Login Failed', err);

      const errorMsg =
        err.response && err.response.data && err.response.data.error
          ? err.response.data.error
          : 'Login failed. Invalid email or password.';

      setError(errorMsg);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        <Link 
          to="/" 
          style={{ 
            display: 'inline-block',
            marginBottom: 'var(--space-lg)',
            color: 'var(--color-accent-primary)',
            textDecoration: 'none',
            fontSize: 'var(--font-size-sm)',
            fontWeight: 600
          }}
        >
          ← Back to Home
        </Link>

        <div style={{ textAlign: 'center', marginBottom: 'var(--space-2xl)' }}>
          <Link
            to="/"
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: '8px',
              fontSize: '1.5rem',
              fontWeight: 800,
              color: 'var(--color-text-primary)'
            }}
          >
            <span style={{ color: 'var(--color-accent-primary)' }}>🛡️</span>
            VoxPath
          </Link>

          <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>
            Log in to your account
          </p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && (
            <div
              className="error-message"
              style={{
                color: 'var(--color-error, #ff5f56)',
                background: 'rgba(255, 95, 86, 0.1)',
                padding: '10px',
                borderRadius: 'var(--radius-md)',
                marginBottom: 'var(--space-md)',
                textAlign: 'center',
                border: '1px solid var(--color-error, #ff5f56)'
              }}
            >
              {error}
            </div>
          )}

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

          <button
            type="submit"
            className="btn btn-primary"
            style={{ width: '100%', padding: '14px', marginTop: '16px' }}
          >
            Log in
          </button>
        </form>

        <div
          style={{
            textAlign: 'center',
            marginTop: 'var(--space-xl)',
            fontSize: 'var(--font-size-sm)',
            color: 'var(--color-text-secondary)'
          }}
        >
          Don't have an account?{" "}
          <Link to="/signup" style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>
            Sign up
          </Link>
        </div>

      </div>
    </div>
  );
}

export default Login;
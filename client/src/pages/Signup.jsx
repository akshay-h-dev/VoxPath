import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { registerUser } from '../services/api';

function Signup() {
    const [name, setName] = useState('');
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const navigate = useNavigate();

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const res = await registerUser(name, email, password);
            console.log('Signup Success:', res);

            // Store token and user data
            if (res.data && res.data.token) {
                localStorage.setItem('voxpath_token', res.data.token);
                localStorage.setItem('voxpath_user', JSON.stringify(res.data.user));
            }

            navigate('/dashboard');
        } catch (err) {
            console.error('Signup Failed', err);
            // Improved error message extraction
            const errorMsg = err.response && err.response.data && err.response.data.error
                ? err.response.data.error
                : 'Signup failed. Please try again.';
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
                    <p style={{ marginTop: 'var(--space-sm)', color: 'var(--color-text-secondary)' }}>Create your account</p>
                </div>

                <form onSubmit={handleSubmit}>
                    <div className="form-group">
                        <label className="form-label" htmlFor="name">Full Name</label>
                        <input
                            id="name"
                            type="text"
                            className="form-input"
                            placeholder="John Doe"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            required
                        />
                    </div>

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
                            minLength={6}
                        />
                    </div>

                    <button type="submit" className="btn btn-primary" style={{ width: '100%', padding: '14px', marginTop: 'var(--space-md)' }}>
                        Sign up
                    </button>
                </form>

                <div style={{ textAlign: 'center', marginTop: 'var(--space-xl)', fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
                    Already have an account? <Link to="/login" style={{ color: 'var(--color-accent-primary)', fontWeight: 600 }}>Log in</Link>
                </div>
            </div>
        </div>
    );
}

export default Signup;

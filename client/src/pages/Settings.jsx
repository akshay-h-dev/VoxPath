import { useState, useEffect } from 'react';
import { checkHealth } from '../services/api';

function Settings() {
  const [apiStatus, setApiStatus] = useState('checking');
  const [settings, setSettings] = useState({
    speechRate: 1,
    speechPitch: 1,
    speechVolume: 1,
    language: 'en-US',
  });

  useEffect(() => {
    checkHealth()
      .then(() => setApiStatus('connected'))
      .catch(() => setApiStatus('disconnected'));
  }, []);

  const handleChange = (field, value) => {
    setSettings((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="page">
      <div className="page-header">
        <h1><span className="gradient-text">Settings</span></h1>
        <p>Configure VoxPath preferences</p>
      </div>

      {/* API Status */}
      <div className="glass-card card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <span className="card-title">🔌 Backend Status</span>
          <span style={{
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
            background: apiStatus === 'connected' ? 'rgba(34, 197, 94, 0.15)' : 'rgba(239, 68, 68, 0.15)',
            color: apiStatus === 'connected' ? 'var(--color-success)' : 'var(--color-danger)',
          }}>
            {apiStatus === 'checking' ? '⏳ Checking...' : apiStatus === 'connected' ? '✅ Connected' : '❌ Disconnected'}
          </span>
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-muted)' }}>
          Backend API at <code>http://localhost:5000</code>
        </p>
      </div>

      {/* Voice Settings */}
      <div className="glass-card card" style={{ marginBottom: 'var(--space-xl)' }}>
        <div className="card-header">
          <span className="card-title">🔊 Voice Settings</span>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-lg)' }}>
          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              Speech Rate: {settings.speechRate.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speechRate}
              onChange={(e) => handleChange('speechRate', parseFloat(e.target.value))}
              style={{ width: '100%' }}
              aria-label="Speech rate"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              Speech Pitch: {settings.speechPitch.toFixed(1)}
            </label>
            <input
              type="range"
              min="0.5"
              max="2"
              step="0.1"
              value={settings.speechPitch}
              onChange={(e) => handleChange('speechPitch', parseFloat(e.target.value))}
              style={{ width: '100%' }}
              aria-label="Speech pitch"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              Volume: {settings.speechVolume.toFixed(1)}
            </label>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={settings.speechVolume}
              onChange={(e) => handleChange('speechVolume', parseFloat(e.target.value))}
              style={{ width: '100%' }}
              aria-label="Speech volume"
            />
          </div>

          <div>
            <label style={{ display: 'block', marginBottom: 'var(--space-sm)', fontSize: 'var(--font-size-sm)' }}>
              Language
            </label>
            <select
              value={settings.language}
              onChange={(e) => handleChange('language', e.target.value)}
              style={{
                width: '100%',
                padding: 'var(--space-sm) var(--space-md)',
                background: 'var(--color-bg-secondary)',
                color: 'var(--color-text-primary)',
                border: '1px solid var(--color-border)',
                borderRadius: 'var(--radius-md)',
                fontSize: 'var(--font-size-sm)',
              }}
              aria-label="Language selection"
            >
              <option value="en-US">English (US)</option>
              <option value="en-GB">English (UK)</option>
              <option value="en-IN">English (India)</option>
              <option value="hi-IN">Hindi</option>
            </select>
          </div>
        </div>
      </div>

      {/* About */}
      <div className="glass-card card">
        <div className="card-header">
          <span className="card-title">ℹ️ About VoxPath</span>
        </div>
        <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', lineHeight: 1.8 }}>
          VoxPath is an AI-powered voice interview system designed for accessibility.
          It enables visually impaired candidates to navigate job portals, answer questions,
          and receive real-time feedback — all through voice interaction.
        </p>
        <p style={{ marginTop: 'var(--space-sm)', fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
          Version 1.0.0 • SDG 4, 9, 10
        </p>
      </div>
    </div>
  );
}

export default Settings;

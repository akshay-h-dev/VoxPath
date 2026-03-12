import { PACE } from '../utils/constants';

function FillerStats({ fillerCount, fillersFound, wpm, paceAssessment, wordCount }) {
  const getPaceColor = () => {
    if (wpm >= PACE.MIN_IDEAL && wpm <= PACE.MAX_IDEAL) return 'var(--color-success)';
    if (wpm > PACE.MAX_IDEAL) return 'var(--color-warning)';
    return 'var(--color-accent-warm)';
  };

  return (
    <div className="glass-card card" role="region" aria-label="Communication statistics">
      <div className="card-header">
        <span className="card-title">📊 Communication</span>
      </div>

      <div className="stat-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-md)' }}>
        <div className="stat-item">
          <span className="stat-value" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: fillerCount > 3 ? 'var(--color-accent-warm)' : 'var(--color-success)' }}>
            {fillerCount}
          </span>
          <span className="stat-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Filler Words
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-value" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700, color: getPaceColor() }}>
            {wpm}
          </span>
          <span className="stat-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            WPM ({paceAssessment})
          </span>
        </div>

        <div className="stat-item">
          <span className="stat-value" style={{ fontSize: 'var(--font-size-2xl)', fontWeight: 700 }}>
            {wordCount}
          </span>
          <span className="stat-label" style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>
            Total Words
          </span>
        </div>
      </div>

      {fillersFound && fillersFound.length > 0 && (
        <div style={{ marginTop: 'var(--space-md)' }}>
          <span className="card-subtitle">Found: </span>
          {fillersFound.map((f, i) => (
            <span key={i} style={{
              display: 'inline-block',
              padding: '2px 8px',
              margin: '2px',
              borderRadius: 'var(--radius-sm)',
              background: 'rgba(255, 107, 107, 0.15)',
              fontSize: 'var(--font-size-xs)',
              color: 'var(--color-accent-warm)',
            }}>
              "{f.word}" ×{f.count}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

export default FillerStats;

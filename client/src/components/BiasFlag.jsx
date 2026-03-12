function BiasFlag({ questionIndex, questionText, biasType, reason, suggestion }) {
  return (
    <div className="glass-card card" role="alert" aria-label={`Bias flag for question ${questionIndex + 1}`}
      style={{ borderLeft: '3px solid var(--color-warning)' }}>
      <div className="card-header">
        <span className="card-title" style={{ color: 'var(--color-warning)' }}>
          ⚠️ Q{questionIndex + 1} — {biasType} bias
        </span>
      </div>

      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)', marginBottom: 'var(--space-sm)' }}>
        <strong>Question:</strong> "{questionText}"
      </p>

      <p style={{ fontSize: 'var(--font-size-sm)', marginBottom: 'var(--space-sm)' }}>
        <strong>Why:</strong> {reason}
      </p>

      <p style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-secondary)' }}>
        <strong>Suggestion:</strong> {suggestion}
      </p>
    </div>
  );
}

export default BiasFlag;

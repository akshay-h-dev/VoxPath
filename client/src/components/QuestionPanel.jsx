function QuestionPanel({ questionIndex, totalQuestions, questionText, isListening }) {
  return (
    <div className="glass-card card question-panel" role="region" aria-label="Current question">
      <div className="card-header">
        <span className="card-title">
          Question {questionIndex + 1} of {totalQuestions}
        </span>
        {isListening && (
          <span className="listening-badge" style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '6px',
            padding: '4px 12px',
            borderRadius: 'var(--radius-full)',
            background: 'rgba(239, 68, 68, 0.15)',
            color: 'var(--color-danger)',
            fontSize: 'var(--font-size-xs)',
            fontWeight: 600,
          }}>
            <span className="status-dot active" style={{ background: 'var(--color-danger)' }}></span>
            Recording
          </span>
        )}
      </div>

      <p style={{
        fontSize: 'var(--font-size-xl)',
        fontWeight: 500,
        lineHeight: 1.6,
        color: 'var(--color-text-primary)',
      }}>
        {questionText || 'No question loaded'}
      </p>

      <div style={{
        marginTop: 'var(--space-lg)',
        display: 'flex',
        gap: 'var(--space-sm)',
      }}>
        <div className="progress-bar" style={{
          flex: 1,
          height: '4px',
          background: 'var(--color-surface)',
          borderRadius: 'var(--radius-full)',
          overflow: 'hidden',
        }}>
          <div style={{
            width: `${((questionIndex + 1) / totalQuestions) * 100}%`,
            height: '100%',
            background: 'linear-gradient(90deg, var(--color-accent-primary), var(--color-accent-secondary))',
            borderRadius: 'var(--radius-full)',
            transition: 'width var(--transition-slow)',
          }} />
        </div>
      </div>
    </div>
  );
}

export default QuestionPanel;

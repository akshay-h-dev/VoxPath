import { SCORE_LEVELS } from '../utils/constants';

function ScoreCard({ questionIndex, questionText, scores, improvementTip }) {
  if (!scores) return null;

  const getScoreLevel = (score) => {
    if (score >= SCORE_LEVELS.HIGH) return 'high';
    if (score >= SCORE_LEVELS.MEDIUM) return 'medium';
    return 'low';
  };

  return (
    <div className="glass-card card" role="region" aria-label={`Score for question ${questionIndex + 1}`}>
      <div className="card-header">
        <span className="card-title">Q{questionIndex + 1}</span>
        <span className={`score-badge ${getScoreLevel(scores.overall)}`}>
          {scores.overall}
        </span>
      </div>

      <p className="card-subtitle" title={questionText}>
        {questionText?.length > 80 ? `${questionText.slice(0, 80)}...` : questionText}
      </p>

      <div className="score-breakdown" style={{ marginTop: 'var(--space-md)' }}>
        <div className="score-row">
          <span>Relevance</span>
          <span className={getScoreLevel(scores.relevance)}>{scores.relevance}/5</span>
        </div>
        <div className="score-row">
          <span>Completeness</span>
          <span className={getScoreLevel(scores.completeness)}>{scores.completeness}/5</span>
        </div>
        <div className="score-row">
          <span>Clarity</span>
          <span className={getScoreLevel(scores.clarity)}>{scores.clarity}/5</span>
        </div>
      </div>

      {improvementTip && (
        <p className="tip" style={{ marginTop: 'var(--space-md)', fontSize: 'var(--font-size-sm)', color: 'var(--color-accent-gold)' }}>
          💡 {improvementTip}
        </p>
      )}
    </div>
  );
}

export default ScoreCard;

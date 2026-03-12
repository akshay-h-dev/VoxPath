import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { getReport, getSession } from '../services/api';
import ScoreCard from '../components/ScoreCard';
import BiasFlag from '../components/BiasFlag';

function SessionSummary() {
  const { sessionId } = useParams();
  const [report, setReport] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        const [reportRes, sessionRes] = await Promise.all([
          getReport(sessionId),
          getSession(sessionId),
        ]);
        setReport(reportRes.data);
        setSession(sessionRes.data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load session data');
      } finally {
        setLoading(false);
      }
    };

    if (sessionId) fetchData();
  }, [sessionId]);

  if (loading) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 'var(--space-2xl)' }}>
        <p style={{ color: 'var(--color-text-muted)' }}>Loading session summary...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="page" style={{ textAlign: 'center', paddingTop: 'var(--space-2xl)' }}>
        <p style={{ color: 'var(--color-danger)' }}>❌ {error}</p>
        <Link to="/" className="btn btn-secondary" style={{ marginTop: 'var(--space-lg)' }}>
          ← Back to Dashboard
        </Link>
      </div>
    );
  }

  const summary = report?.candidateSummary;
  const comm = report?.communicationAnalysis;

  return (
    <div className="page">
      <div className="page-header">
        <h1><span className="gradient-text">Session Summary</span></h1>
        <p>Interview report and bias audit results</p>
      </div>

      {/* Overall Score */}
      {summary && (
        <div className="glass-card card" style={{ marginBottom: 'var(--space-2xl)', textAlign: 'center' }}>
          <h2 style={{ fontSize: 'var(--font-size-4xl)', fontWeight: 800 }}>
            <span className="gradient-text">{summary.overallScore ?? '—'}</span>
            <span style={{ fontSize: 'var(--font-size-lg)', color: 'var(--color-text-muted)' }}>/5</span>
          </h2>
          <p style={{ color: 'var(--color-text-secondary)' }}>Overall Score</p>

          {comm && (
            <div className="grid-3" style={{ marginTop: 'var(--space-lg)', textAlign: 'center' }}>
              <div>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{comm.avgWpm}</span>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Avg WPM</p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{comm.totalFillers}</span>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Total Fillers</p>
              </div>
              <div>
                <span style={{ fontSize: 'var(--font-size-xl)', fontWeight: 700 }}>{comm.paceAssessment}</span>
                <p style={{ fontSize: 'var(--font-size-xs)', color: 'var(--color-text-muted)' }}>Pace</p>
              </div>
            </div>
          )}

          {summary.topImprovementArea && (
            <p style={{ marginTop: 'var(--space-lg)', color: 'var(--color-accent-gold)' }}>
              💡 Top area for improvement: <strong>{summary.topImprovementArea}</strong>
            </p>
          )}
        </div>
      )}

      {/* Per-Answer Scores */}
      {session?.answers && session.answers.length > 0 && (
        <>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>Answer Breakdown</h2>
          <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
            {session.answers.map((ans, i) => (
              <ScoreCard
                key={i}
                questionIndex={ans.questionIndex}
                questionText={ans.questionText}
                scores={ans.scores}
                improvementTip={ans.improvementTip}
              />
            ))}
          </div>
        </>
      )}

      {/* Bias Flags */}
      {report?.biasFlags && report.biasFlags.length > 0 && (
        <>
          <h2 style={{ marginBottom: 'var(--space-lg)', color: 'var(--color-warning)' }}>
            ⚠️ Bias Flags ({report.biasFlags.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-md)', marginBottom: 'var(--space-2xl)' }}>
            {report.biasFlags.map((flag, i) => (
              <BiasFlag key={i} {...flag} />
            ))}
          </div>
        </>
      )}

      {/* Accommodation Suggestions */}
      {report?.accommodationSuggestions && report.accommodationSuggestions.length > 0 && (
        <>
          <h2 style={{ marginBottom: 'var(--space-lg)' }}>Accommodation Suggestions</h2>
          <div className="glass-card card" style={{ marginBottom: 'var(--space-2xl)' }}>
            <ul style={{ paddingLeft: 'var(--space-lg)', color: 'var(--color-text-secondary)' }}>
              {report.accommodationSuggestions.map((s, i) => (
                <li key={i} style={{ marginBottom: 'var(--space-sm)' }}>{s}</li>
              ))}
            </ul>
          </div>
        </>
      )}

      <Link to="/" className="btn btn-primary">← Back to Dashboard</Link>
    </div>
  );
}

export default SessionSummary;

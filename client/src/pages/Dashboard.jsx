import { useEffect, useMemo, useState } from 'react';
import useSession from '../hooks/useSession';
import QuestionPanel from '../components/QuestionPanel';
import ScoreCard from '../components/ScoreCard';
import FillerStats from '../components/FillerStats';
import { getUserExtensionData } from '../services/api';

function computeExtensionAnalysisFromPayload(payload) {
  if (!payload) return null;
  const { candidateName, questions = [], answers = [], biasFlags = [] } = payload;

  const totalQuestions = questions.length;
  const totalAnswers = answers.length;
  const answered = answers.filter((a) => a.transcript && a.transcript !== '[Skipped]').length;
  const skipped = answers.filter((a) => a.transcript === '[Skipped]').length;

  // Parse numeric scores from aiFeedback strings
  const scored = answers.filter((a) => a.aiFeedback && a.aiFeedback !== 'Question skipped.');
  const extractScore = (field, text) => {
    if (!text) return null;
    const re = new RegExp(field + '\\s+(\\d)', 'i');
    const m = text.match(re);
    return m ? parseInt(m[1], 10) : null;
  };
  const dims = ['Relevance', 'Completeness', 'Clarity'];
  const averages = {};
  dims.forEach((dim) => {
    const vals = scored
      .map((a) => extractScore(dim, a.aiFeedback))
      .filter((v) => typeof v === 'number');
    averages[dim.toLowerCase()] = vals.length
      ? (vals.reduce((sum, v) => sum + v, 0) / vals.length).toFixed(1)
      : null;
  });

  // Best / needs work questions based on relevance
  let bestQuestion = null;
  let needsWorkQuestion = null;
  const relevanceScores = scored.map((a, idx) => ({
    index: idx,
    value: extractScore('Relevance', a.aiFeedback) ?? 0,
  }));
  if (relevanceScores.length > 0) {
    const max = relevanceScores.reduce((a, b) => (b.value > a.value ? b : a));
    const min = relevanceScores.reduce((a, b) => (b.value < a.value ? b : a));
    bestQuestion = {
      index: max.index,
      question: answers[max.index]?.question || questions[max.index] || '',
    };
    needsWorkQuestion = {
      index: min.index,
      question: answers[min.index]?.question || questions[min.index] || '',
    };
  }

  return {
    candidateName: candidateName || 'Anonymous',
    totalQuestions,
    totalAnswers,
    answered,
    skipped,
    averages,
    biasFlags,
    bestQuestion,
    needsWorkQuestion,
  };
}

function Dashboard() {
  const {
    session,
    currentQuestion,
    isInterviewActive,
    isListening,
    scores,
    fillerStats,
  } = useSession();

  const [extensionSnapshot, setExtensionSnapshot] = useState(null);
  const [snapshotError, setSnapshotError] = useState('');

  useEffect(() => {
    let isMounted = true;
    getUserExtensionData()
      .then((res) => {
        if (!isMounted) return;
        if (res && res.success && res.data) {
          setExtensionSnapshot(res.data);
        } else {
          setExtensionSnapshot(null);
        }
      })
      .catch((err) => {
        if (!isMounted) return;
        console.error('Failed to load extension data snapshot', err);
        setSnapshotError('Could not load your latest VoxPath extension data.');
      });
    return () => { isMounted = false; };
  }, []);

  const historyItems = useMemo(() => {
    if (!extensionSnapshot) return [];
    // New format: { items: [{ createdAt, payload, id }] }
    if (Array.isArray(extensionSnapshot.items)) return extensionSnapshot.items;
    // Old format: { payload }
    if (extensionSnapshot.payload) return [{ id: 'legacy', createdAt: extensionSnapshot.updatedAt, payload: extensionSnapshot.payload }];
    return [];
  }, [extensionSnapshot]);

  const selectedItem = useMemo(() => {
    if (historyItems.length === 0) return null;
    // latest by createdAt
    return [...historyItems].sort((a, b) => String(b.createdAt || '').localeCompare(String(a.createdAt || '')))[0];
  }, [historyItems]);

  const extensionAnalysis = useMemo(
    () => computeExtensionAnalysisFromPayload(selectedItem?.payload),
    [selectedItem]
  );

  const questions = session?.questions || [];
  const currentQ = questions[currentQuestion] || '';
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const latestFiller = fillerStats.length > 0 ? fillerStats[fillerStats.length - 1] : null;

  return (
    <div className="page" style={{ maxWidth: "1200px", margin: "0 auto" }}>
      
      {/* HEADER */}
      <div className="page-header" style={{ marginBottom: "2.5rem" }}>
        <h1 style={{ fontSize: "2.2rem", fontWeight: 700 }}>
          <span className="gradient-text">Interview Dashboard</span>
        </h1>
  
        <p style={{ color: "var(--color-text-secondary)", marginTop: "6px" }}>
          {isInterviewActive
            ? `Interview in progress — Question ${currentQuestion + 1} of ${questions.length}`
            : ' '}
        </p>
      </div>
  
      {/* CURRENT QUESTION */}
      {isInterviewActive && questions.length > 0 && (
        <div style={{ marginBottom: "2.5rem" }}>
          <div className="glass-card card" style={{ padding: "1.5rem" }}>
            <QuestionPanel
              questionIndex={currentQuestion}
              totalQuestions={questions.length}
              questionText={currentQ}
              isListening={isListening}
            />
          </div>
        </div>
      )}
  
      {/* LIVE ANALYSIS */}
      {(latestScore || latestFiller) && (
        <div style={{ marginBottom: "2.5rem" }}>
          <h2 style={{ marginBottom: "1rem" }}>Live Interview Analysis</h2>
  
          <div
            className="grid-2"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2,1fr)",
              gap: "1.5rem",
            }}
          >
            {latestScore && (
              <div className="glass-card card" style={{ padding: "1.5rem" }}>
                <ScoreCard
                  questionIndex={latestScore.questionIndex ?? scores.length - 1}
                  questionText={latestScore.questionText ?? ""}
                  scores={latestScore.scores ?? latestScore}
                  improvementTip={latestScore.improvementTip ?? ""}
                />
              </div>
            )}
  
            {latestFiller && (
              <div className="glass-card card" style={{ padding: "1.5rem" }}>
                <FillerStats
                  fillerCount={latestFiller.fillerCount}
                  fillersFound={latestFiller.fillersFound}
                  wpm={latestFiller.wpm}
                  paceAssessment={latestFiller.paceAssessment}
                  wordCount={latestFiller.wordCount}
                />
              </div>
            )}
          </div>
        </div>
      )}
  
      {/* EXTENSION ANALYSIS */}
      <div style={{ marginTop: "2rem" }}>
        <h2 style={{ marginBottom: "1rem" }}>Latest Extension Analysis</h2>
  
        <div className="glass-card card" style={{ padding: "1.8rem" }}>
          
          {snapshotError && (
            <p style={{ color: "#ff5f56", marginBottom: "1rem" }}>
              {snapshotError}
            </p>
          )}
  
          {historyItems.length === 0 && !snapshotError && (
            <p style={{ color: "var(--color-text-muted)" }}>
              No extension data has been saved yet. Complete an interview using
              the browser extension to see your analysis here.
            </p>
          )}
  
          {extensionAnalysis && (
            <>
              <p
                style={{
                  marginBottom: "1.5rem",
                  fontSize: "1rem",
                  color: "var(--color-text-secondary)",
                }}
              >
                Candidate: <strong>{extensionAnalysis.candidateName}</strong>
              </p>
  
              {/* QUESTION STATS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <div className="stat-box">
                  <div className="stat-label">Total Questions</div>
                  <div className="stat-value">
                    {extensionAnalysis.totalQuestions}
                  </div>
                </div>
  
                <div className="stat-box">
                  <div className="stat-label">Answered</div>
                  <div className="stat-value">
                    {extensionAnalysis.answered}
                  </div>
                </div>
  
                <div className="stat-box">
                  <div className="stat-label">Skipped</div>
                  <div className="stat-value">
                    {extensionAnalysis.skipped}
                  </div>
                </div>
              </div>
  
              {/* SCORE STATS */}
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "repeat(3,1fr)",
                  gap: "1.5rem",
                  marginBottom: "2rem",
                }}
              >
                <div className="stat-box">
                  <div className="stat-label">Avg Relevance</div>
                  <div className="stat-value">
                    {extensionAnalysis.averages.relevance ?? "—"}
                  </div>
                </div>
  
                <div className="stat-box">
                  <div className="stat-label">Avg Completeness</div>
                  <div className="stat-value">
                    {extensionAnalysis.averages.completeness ?? "—"}
                  </div>
                </div>
  
                <div className="stat-box">
                  <div className="stat-label">Avg Clarity</div>
                  <div className="stat-value">
                    {extensionAnalysis.averages.clarity ?? "—"}
                  </div>
                </div>
              </div>
  
              {/* BEST / NEEDS IMPROVEMENT */}
              {(extensionAnalysis.bestQuestion ||
                extensionAnalysis.needsWorkQuestion) && (
                <div style={{ marginBottom: "1.5rem" }}>
                  {extensionAnalysis.bestQuestion && (
                    <p style={{ marginBottom: "6px" }}>
                      ⭐ <strong>Best answer:</strong>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        Q{extensionAnalysis.bestQuestion.index + 1} —{" "}
                        {extensionAnalysis.bestQuestion.question}
                      </span>
                    </p>
                  )}
  
                  {extensionAnalysis.needsWorkQuestion && (
                    <p>
                      ⚠ <strong>Needs improvement:</strong>{" "}
                      <span style={{ color: "var(--color-text-secondary)" }}>
                        Q{extensionAnalysis.needsWorkQuestion.index + 1} —{" "}
                        {extensionAnalysis.needsWorkQuestion.question}
                      </span>
                    </p>
                  )}
                </div>
              )}
  
              {/* BIAS AUDIT */}
              <div>
                <strong>Bias audit:</strong>
  
                {extensionAnalysis.biasFlags &&
                extensionAnalysis.biasFlags.length > 0 ? (
                  <ul
                    style={{
                      marginTop: "8px",
                      paddingLeft: "1.2rem",
                    }}
                  >
                    {extensionAnalysis.biasFlags.map((q, idx) => (
                      <li
                        key={idx}
                        style={{
                          fontSize: "0.9rem",
                          color: "var(--color-text-secondary)",
                        }}
                      >
                        {q}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <span
                    style={{
                      marginLeft: "6px",
                      color: "var(--color-text-secondary)",
                    }}
                  >
                    no biased questions flagged.
                  </span>
                )}
              </div>

              {/* History list */}
              {historyItems.length > 1 && (
                <div style={{ marginTop: "2rem" }}>
                  <h3 style={{ marginBottom: "0.75rem" }}>Previous Reports</h3>
                  <div style={{ display: "grid", gap: "0.75rem" }}>
                    {[...historyItems]
                      .sort((a, b) => String(b.createdAt || "").localeCompare(String(a.createdAt || "")))
                      .slice(1)
                      .slice(0, 10)
                      .map((item) => {
                        const analysis = computeExtensionAnalysisFromPayload(item.payload);
                        return (
                          <div
                            key={item.id}
                            className="glass-card card"
                            style={{ padding: "1rem", background: "rgba(255,255,255,0.03)" }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "1rem", flexWrap: "wrap" }}>
                              <div style={{ fontWeight: 700 }}>
                                {analysis?.candidateName || "Anonymous"}{" "}
                                <span style={{ fontWeight: 400, color: "var(--color-text-muted)" }}>
                                  ({new Date(item.createdAt).toLocaleString()})
                                </span>
                              </div>
                              <div style={{ color: "var(--color-text-secondary)", fontSize: "0.9rem" }}>
                                Avg Relevance: {analysis?.averages?.relevance ?? "—"} · Answered: {analysis?.answered ?? 0}/{analysis?.totalQuestions ?? 0}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}

export default Dashboard;

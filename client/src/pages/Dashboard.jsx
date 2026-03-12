import useSession from '../hooks/useSession';
import QuestionPanel from '../components/QuestionPanel';
import CommandHints from '../components/CommandHints';
import ScoreCard from '../components/ScoreCard';
import FillerStats from '../components/FillerStats';

function Dashboard() {
  const {
    session,
    currentQuestion,
    isInterviewActive,
    isListening,
    scores,
    fillerStats,
  } = useSession();

  const questions = session?.questions || [];
  const currentQ = questions[currentQuestion] || '';
  const latestScore = scores.length > 0 ? scores[scores.length - 1] : null;
  const latestFiller = fillerStats.length > 0 ? fillerStats[fillerStats.length - 1] : null;

  return (
    <div className="page">
      <div className="page-header">
        <h1>
          <span className="gradient-text">Dashboard</span>
        </h1>
        <p>
          {isInterviewActive
            ? `Interview in progress — Question ${currentQuestion + 1} of ${questions.length}`
            : 'Say "begin interview" to start a new session'}
        </p>
      </div>

      {/* Interview Area */}
      {isInterviewActive && questions.length > 0 && (
        <div style={{ marginBottom: 'var(--space-2xl)' }}>
          <QuestionPanel
            questionIndex={currentQuestion}
            totalQuestions={questions.length}
            questionText={currentQ}
            isListening={isListening}
          />
        </div>
      )}

      {/* Score + Communication Grid */}
      <div className="grid-2" style={{ marginBottom: 'var(--space-2xl)' }}>
        {latestScore ? (
          <ScoreCard
            questionIndex={latestScore.questionIndex ?? scores.length - 1}
            questionText={latestScore.questionText ?? ''}
            scores={latestScore.scores ?? latestScore}
            improvementTip={latestScore.improvementTip ?? ''}
          />
        ) : (
          <div className="glass-card card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Score will appear after your first answer
            </p>
          </div>
        )}

        {latestFiller ? (
          <FillerStats
            fillerCount={latestFiller.fillerCount}
            fillersFound={latestFiller.fillersFound}
            wpm={latestFiller.wpm}
            paceAssessment={latestFiller.paceAssessment}
            wordCount={latestFiller.wordCount}
          />
        ) : (
          <div className="glass-card card" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '180px' }}>
            <p style={{ color: 'var(--color-text-muted)' }}>
              Communication stats will appear after your first answer
            </p>
          </div>
        )}
      </div>

      {/* Voice Command Reference */}
      <CommandHints />
    </div>
  );
}

export default Dashboard;

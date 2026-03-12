import { VOICE_COMMANDS } from '../utils/constants';

function CommandHints() {
  const commands = [
    { cmd: VOICE_COMMANDS.BEGIN, desc: 'Start the interview' },
    { cmd: VOICE_COMMANDS.NEXT, desc: 'Go to next question' },
    { cmd: VOICE_COMMANDS.REPEAT, desc: 'Hear question again' },
    { cmd: VOICE_COMMANDS.SUBMIT, desc: 'Submit your answer' },
    { cmd: VOICE_COMMANDS.GO_BACK, desc: 'Previous question' },
    { cmd: VOICE_COMMANDS.END, desc: 'End interview & get report' },
    { cmd: VOICE_COMMANDS.HELP, desc: 'List all commands' },
  ];

  return (
    <div className="glass-card card" role="region" aria-label="Voice command reference">
      <div className="card-header">
        <span className="card-title">🎤 Voice Commands</span>
      </div>

      <ul style={{ listStyle: 'none', padding: 0 }}>
        {commands.map(({ cmd, desc }) => (
          <li key={cmd} style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            padding: 'var(--space-sm) 0',
            borderBottom: '1px solid var(--color-border)',
          }}>
            <code style={{
              padding: '2px 8px',
              borderRadius: 'var(--radius-sm)',
              background: 'var(--color-surface)',
              fontSize: 'var(--font-size-sm)',
              color: 'var(--color-accent-secondary)',
              fontWeight: 500,
            }}>
              "{cmd}"
            </code>
            <span style={{ fontSize: 'var(--font-size-sm)', color: 'var(--color-text-secondary)' }}>
              {desc}
            </span>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default CommandHints;

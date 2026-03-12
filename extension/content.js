// ════════════════════════════════════════════
//  VoxPath — Content Script v1.2
//  NEW: Groq AI classifies speech as command
//       vs answer in real time
// ════════════════════════════════════════════

(function () {
  'use strict';

  // ── State ────────────────────────────────────
  let sessionActive   = false;
  let questions       = [];
  let currentQIndex   = 0;
  let sessionAnswers  = [];
  let settings        = {};
  let recognitionCmd  = null;
  let recognitionAns  = null;
  let isListeningAns  = false;
  let answerTimer     = null;
  let sessionPaused   = false;        // pause/resume
  let answerStartTime = null;         // for "time left"
  let currentAnswerLimit = 120;       // mirrors settings.answerTime

  // ── Boot ─────────────────────────────────────
  loadSettings();

  function loadSettings() {
    chrome.storage.local.get(['voxpathSettings', 'voxpathPendingReport'], (result) => {
      settings = result.voxpathSettings || {};

      // ── Check if a report was saved before a form submit reload ──
      const pending = result.voxpathPendingReport;
      if (pending && pending.savedAt) {
        const ageMs = Date.now() - pending.savedAt;
        // Only act if saved within the last 5 minutes (avoids stale reports)
        if (ageMs < 5 * 60 * 1000) {
          logToPopup('📄 Pending report detected — generating…', 'score');
          // Clear it immediately so it doesn't re-trigger on next load
          chrome.storage.local.remove('voxpathPendingReport', () => {
            // Restore state from storage so generateReport works
            questions      = pending.questions      || [];
            sessionAnswers = pending.answers        || [];
            // Small delay so the page fully renders before PDF download
            setTimeout(() => {
              speak('Form submitted. Generating your interview report.');
              generateReportFromData(pending);
            }, 1500);
          });
          return;   // skip initVoiceCommandListener on post-submit pages
        } else {
          // Stale — clean up
          chrome.storage.local.remove('voxpathPendingReport');
        }
      }

      initVoiceCommandListener();
    });
  }

  // ── Message listener from popup ───────────────
  chrome.runtime.onMessage.addListener((msg, _sender, sendResponse) => {
    switch (msg.type) {
      case 'CMD_START':        startSession();   break;
      case 'CMD_NEXT':         nextQuestion();   break;
      case 'CMD_REPEAT':       repeatQuestion(); break;
      case 'CMD_END':          endSession();     break;
      case 'SETTINGS_UPDATED': settings = msg.settings; break;
    }
    sendResponse({ ok: true });
    return true;
  });

  // ════════════════════════════════════════════
  //  GROQ AI — Command vs Answer Classifier
  //
  //  Called on every FINAL speech chunk while
  //  the answer listener is active.
  //
  //  Returns one of:
  //    { type: 'command', command: 'NEXT' }
  //    { type: 'command', command: 'SUBMIT' }
  //    { type: 'command', command: 'REPEAT' }
  //    { type: 'command', command: 'BACK' }
  //    { type: 'command', command: 'END' }
  //    { type: 'command', command: 'HELP' }
  //    { type: 'answer' }
  // ════════════════════════════════════════════
  async function classifyWithGroq(spokenText, currentQuestion) {
    const lower = spokenText.trim().toLowerCase();
    const OBVIOUS_CMDS = {
      // Navigation
      'next question': 'NEXT',         'next': 'NEXT',
      'skip question': 'SKIP',         'skip': 'SKIP',
      'go back': 'BACK',               'previous question': 'BACK',
      'repeat question': 'REPEAT',     'repeat': 'REPEAT',
      'what question is this': 'WHERE', 'which question': 'WHERE',
      'start over': 'RESTART',         'restart': 'RESTART',
      // Answer control
      'submit answer': 'SUBMIT',       'submit': 'SUBMIT',
      'read answer': 'READ_ANSWER',    'what did i say': 'READ_ANSWER',
      'read my answer': 'READ_ANSWER',
      // Session
      'begin interview': 'START',      'start interview': 'START',
      'exit interview': 'END',         'quit interview': 'END',
      'exit session': 'END',           'quit session': 'END',
      'pause interview': 'PAUSE',      'pause': 'PAUSE',
      'resume interview': 'RESUME',    'resume': 'RESUME',
      // Feedback
      'summary': 'SUMMARY',           'how am i doing': 'SUMMARY',
      'my score': 'SUMMARY',          'give me a summary': 'SUMMARY',
      'time left': 'TIME',            'how much time': 'TIME',
      // Speed
      'speak slower': 'SLOWER',       'slower': 'SLOWER',
      'speak faster': 'FASTER',       'faster': 'FASTER',
      // Help
      'help': 'HELP',                 'what can i say': 'HELP',
    };

    for (const [phrase, cmd] of Object.entries(OBVIOUS_CMDS)) {
      if (lower === phrase) return { type: 'command', command: cmd };
    }

    if (!settings.apiKey) {
      const matched = Object.keys(OBVIOUS_CMDS).find(p => lower.includes(p));
      if (matched) return { type: 'command', command: OBVIOUS_CMDS[matched] };
      return { type: 'answer' };
    }

    const model  = settings.model || 'llama-3.1-8b-instant';
    const prompt = `You are a voice command classifier for an AI interview assistant.

The candidate is currently answering this interview question:
"${currentQuestion}"

They just said: "${spokenText}"

Decide if this is a NAVIGATION COMMAND (talking TO the app) or part of their ANSWER (talking about the question topic).

Commands to detect (intent matters, not exact words):
- NEXT        → move to next question ("next one", "move on", "go to next")
- SKIP        → skip without answering ("skip this", "pass", "I don't know this one")
- BACK        → go to previous question ("go back", "previous")
- REPEAT      → re-read the question ("say that again", "repeat", "what was the question")
- WHERE       → what question number am I on ("which question", "where am I")
- RESTART     → restart from question 1 ("start over", "restart", "from the beginning")
- SUBMIT      → done answering ("I'm done", "that's my answer", "submit", "finished")
- READ_ANSWER → read back what they said ("read my answer", "what did I say")
- END         → end the whole interview ("exit interview", "quit interview", "I want to quit", "stop the interview")
- PAUSE       → pause the session ("pause", "hold on", "wait a moment")
- RESUME      → resume after pause ("resume", "continue", "let's go")
- SUMMARY     → hear score summary ("how am I doing", "summary", "my scores")
- TIME        → how much time is left ("time left", "how long", "how much time do I have")
- SLOWER      → speak more slowly ("slower", "slow down", "speak slower")
- FASTER      → speak more quickly ("faster", "speed up", "speak faster")
- HELP        → list available commands ("help", "what can I say", "commands")

If the spoken text is clearly about the interview TOPIC (answering the question), return answer.
If it sounds like controlling the app, return the matching command.

Return ONLY valid JSON — no explanation:
{"type":"command","command":"NEXT"} or {"type":"answer"}`;

    try {
      const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': 'Bearer ' + settings.apiKey,
        },
        body: JSON.stringify({
          model,
          messages: [{ role: 'user', content: prompt }],
          max_tokens: 30,
          temperature: 0,
        }),
      });

      if (!res.ok) throw new Error('Groq error ' + res.status);
      const data   = await res.json();
      const raw    = data.choices?.[0]?.message?.content || '{"type":"answer"}';
      const clean  = raw.replace(/```json|```/g, '').trim();
      return JSON.parse(clean);

    } catch (e) {
      logToPopup('⚠ Classifier error: ' + e.message, 'warn');
      return { type: 'answer' };
    }
  }

  function executeCommand(command) {
    logToPopup('🤖 AI command: ' + command, 'score');
    switch (command) {
      case 'NEXT':        speak('Moving to next question.', nextQuestion);      break;
      case 'SKIP':        speak('Skipping question.',       skipQuestion);      break;
      case 'BACK':        speak('Going back.',              prevQuestion);      break;
      case 'REPEAT':                                        repeatQuestion();   break;
      case 'WHERE':                                         announcePosition(); break;
      case 'RESTART':     speak('Restarting from question 1.', restartSession); break;
      case 'SUBMIT': {
        const btn = findSubmitButton();
        if (btn) {
          confirmThen(
            'Submit button found. Do you want to submit the form now?',
            () => submitAndFinish(),
            () => speak('Submit cancelled. Continue your answer.')
          );
        } else {
          confirmThen(
            'No submit button found. End interview and generate report?',
            () => { stopAnswerCapture(); endSessionSilent(); },
            () => speak('Cancelled. Continue your answer.')
          );
        }
        break;
      }
      case 'READ_ANSWER':                                   readBackLastAnswer(); break;
      case 'START':                                         startSession();       break;
      case 'END':                                           endSession();         break;
      case 'PAUSE':                                         pauseSession();       break;
      case 'RESUME':                                        resumeSession();      break;
      case 'SUMMARY':                                       speakSummary();       break;
      case 'TIME':                                          announceTimeLeft();   break;
      case 'SLOWER':                                        adjustSpeed(-0.2);    break;
      case 'FASTER':                                        adjustSpeed(+0.2);    break;
      case 'HELP':                                          speakHelp();          break;
    }
  }

  // ════════════════════════════════════════════
  //  VOICE COMMAND LISTENER (always-on, no answer active)
  // ════════════════════════════════════════════
  function initVoiceCommandListener() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      logToPopup('⚠ Speech Recognition not supported.', 'warn');
      return;
    }

    recognitionCmd = new SR();
    recognitionCmd.continuous     = true;
    recognitionCmd.interimResults = false;
    recognitionCmd.lang           = settings.sttLang || 'en-IN';

    recognitionCmd.onresult = (event) => {
      if (isListeningAns) return;
      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map(r => r[0].transcript.trim().toLowerCase())
        .join(' ');
      handleSimpleCommand(transcript);
    };

    recognitionCmd.onerror = (e) => {
      if (e.error !== 'no-speech' && !isListeningAns && !awaitingConfirm) restartCmdListener();
    };

    recognitionCmd.onend = () => {
      if (!isListeningAns && !awaitingConfirm) restartCmdListener();
    };

    try {
      recognitionCmd.start();
      logToPopup('VoxPath active. Say "begin interview" to start.', 'default');
      speak('VoxPath active. Say begin interview to start.');
    } catch (_) {}
  }

  function restartCmdListener() {
    setTimeout(() => {
      if (!isListeningAns && !awaitingConfirm) {
        try { recognitionCmd.start(); } catch (_) {}
      }
    }, 600);
  }

  function handleSimpleCommand(text) {
    const t = text.toLowerCase();
    if (t.includes('begin interview') || t.includes('start interview'))    { startSession();        }
    else if (t.includes('next question') || t.includes('next'))            { nextQuestion();        }
    else if (t.includes('skip question') || t.includes('skip'))            { skipQuestion();        }
    else if (t.includes('repeat question') || t.includes('repeat'))        { repeatQuestion();      }
    else if (t.includes('go back') || t.includes('previous'))              { prevQuestion();        }
    else if (t.includes('read answer') || t.includes('what did i say'))    { readBackLastAnswer();  }
    else if (t.includes('exit interview') || t.includes('quit interview') ||
             t.includes('exit session')   || t.includes('quit session'))   { endSession();          }
    else if (t.includes('submit answer') || t.includes('submit interview') || t === 'submit') {
      const btn = findSubmitButton();
      if (btn) {
        confirmThen(
          'Submit button found. Do you want to submit the form now?',
          () => submitAndFinish(),
          () => speak('Submit cancelled.')
        );
      } else {
        // No submit button — just save the answer and end session
        confirmThen(
          'No submit button found. Do you want to end the interview and generate your report?',
          () => { stopAnswerCapture(); endSessionSilent(); },
          () => speak('Cancelled. Continue your answer.')
        );
      }
    }
    else if (t.includes('pause'))                                           { pauseSession();        }
    else if (t.includes('resume') || t.includes('continue'))               { resumeSession();       }
    else if (t.includes('summary') || t.includes('how am i doing'))        { speakSummary();        }
    else if (t.includes('time left') || t.includes('how much time'))       { announceTimeLeft();    }
    else if (t.includes('what question') || t.includes('which question'))  { announcePosition();    }
    else if (t.includes('start over') || t.includes('restart'))            { restartSession();      }
    else if (t.includes('slower') || t.includes('slow down'))              { adjustSpeed(-0.2);     }
    else if (t.includes('faster') || t.includes('speed up'))               { adjustSpeed(+0.2);     }
    else if (t.includes('help') || t.includes('what can i say'))           { speakHelp();           }
  }

  // ════════════════════════════════════════════
  //  SESSION MANAGEMENT
  // ════════════════════════════════════════════
  function startSession() {
    if (sessionActive) return;
    questions      = extractQuestions();
    currentQIndex  = 0;
    sessionAnswers = [];
    sessionActive  = true;

    chrome.runtime.sendMessage({ type: 'SESSION_STATUS', active: true });
    logToPopup('Session started. ' + questions.length + ' question(s) found.', 'default');

    if (questions.length === 0) {
      speak('No questions found on this page. Please open an interview or Google Form page.');
      return;
    }

    // ── Read page instructions first if present ──
    const instructions = extractPageInstructions();
    if (instructions) {
      logToPopup('📋 Instructions found — reading aloud.', 'default');
      speak(
        'Instructions: ' + instructions +
        ' Session started. ' + questions.length + ' questions found. Reading question 1.',
        () => setTimeout(() => readCurrentQuestion(), 800)
      );
    } else {
      speak('Session started. ' + questions.length + ' questions found. Reading question 1.');
      setTimeout(() => readCurrentQuestion(), 1800);
    }
  }

  function endSession() {
    const btn = findSubmitButton();

    const doEnd = () => {
      sessionActive = false;
      stopAnswerCapture();
      chrome.runtime.sendMessage({ type: 'SESSION_STATUS', active: false });
      logToPopup('Session ended. Generating report…', 'default');
      if (btn) {
        // Save to storage FIRST — page will reload after click
        saveReportDataThenClick(btn);
      } else {
        speak('Interview exited. Generating your report.', () => generateReport());
      }
    };

    if (btn) {
      confirmThen(
        'You are about to exit and submit the form.',
        doEnd,
        () => { speak('Exit cancelled. You can continue your interview.'); }
      );
    } else {
      confirmThen(
        'You are about to exit the interview.',
        doEnd,
        () => { speak('Exit cancelled. You can continue your interview.'); }
      );
    }
  }

  // ── Submit form + generate report (called by SUBMIT command) ──
  function submitAndFinish() {
    stopAnswerCapture();
    sessionActive = false;
    chrome.runtime.sendMessage({ type: 'SESSION_STATUS', active: false });

    const btn = findSubmitButton();
    if (btn) {
      saveReportDataThenClick(btn);
    } else {
      speak('Generating your report.', () => generateReport());
    }
    logToPopup('Generating report…', 'default');
  }

  // ── End session without confirmation prompt (called after confirm) ──
  function endSessionSilent() {
    sessionActive = false;
    chrome.runtime.sendMessage({ type: 'SESSION_STATUS', active: false });
    logToPopup('Session ended. Generating report…', 'default');
    speak('Interview ended. Generating your report.', () => generateReport());
  }

  // ─────────────────────────────────────────────
  //  Save all report data to chrome.storage.local
  //  THEN click the submit button.
  //  The page will reload — on the new page,
  //  loadSettings() detects the pending report
  //  and triggers generateReport() from storage.
  // ─────────────────────────────────────────────
  async function saveReportDataThenClick(btn) {
    // Wait for last answer to finish scoring before saving
    if (processingPromise) {
      logToPopup('⏳ Waiting for answer scoring…', 'default');
      speak('Please wait, saving your answers.');
      try { await processingPromise; } catch (_) {}
    }

    logToPopup('💾 Saving report data to storage…', 'default');

    const reportData = {
      candidateName: settings.candidateName || 'Anonymous',
      questions,
      answers:   sessionAnswers,
      biasFlags: [],   // bias audit runs after reload to avoid blocking
      savedAt:   Date.now(),
    };

    chrome.storage.local.set({ voxpathPendingReport: reportData }, () => {
      logToPopup('💾 Saved. Clicking submit…', 'default');
      speak('Answers saved. Submitting form.', () => {
        btn.focus();
        btn.click();   // page reloads here — content script will die
      });
    });
  }

  function nextQuestion() {
    if (!sessionActive) return;
    stopAnswerCapture();
    if (currentQIndex < questions.length - 1) {
      currentQIndex++;
      readCurrentQuestion();
    } else {
      speak('This is the last question. Say end interview to finish.');
    }
  }

  function prevQuestion() {
    if (!sessionActive) return;
    stopAnswerCapture();
    currentQIndex = Math.max(currentQIndex - 1, 0);
    readCurrentQuestion();
  }

  function repeatQuestion() {
    if (!sessionActive) return;
    readCurrentQuestion();
  }

  // ── Skip — records a blank answer and moves on ──
  function skipQuestion() {
    if (!sessionActive) return;
    stopAnswerCapture();
    sessionAnswers.push({
      question:       questions[currentQIndex] || '',
      transcript:     '[Skipped]',
      fillerFeedback: '',
      paceFeedback:   '',
      aiFeedback:     'Question skipped.',
    });
    logToPopup('Q' + (currentQIndex + 1) + ' skipped.', 'warn');
    nextQuestion();
  }

  // ── Pause — freezes session, stops listening ──
  function pauseSession() {
    if (!sessionActive || sessionPaused) return;
    sessionPaused = true;
    stopAnswerCapture();
    speak('Interview paused. Say resume interview to continue.');
    logToPopup('Session paused.', 'warn');
  }

  // ── Resume — restarts from current question ──
  function resumeSession() {
    if (!sessionActive || !sessionPaused) return;
    sessionPaused = false;
    speak('Resuming interview.', () => readCurrentQuestion());
    logToPopup('Session resumed.', 'default');
  }

  // ── Restart — go back to question 1 ──────────
  function restartSession() {
    if (!sessionActive) return;
    stopAnswerCapture();
    currentQIndex  = 0;
    sessionAnswers = [];
    sessionPaused  = false;
    logToPopup('Session restarted from Q1.', 'default');
    readCurrentQuestion();
  }

  // ── Summary — speak running score average ────
  function speakSummary() {
    if (sessionAnswers.length === 0) {
      speak('No answers recorded yet.');
      return;
    }

    const answered  = sessionAnswers.filter(a => a.transcript !== '[Skipped]');
    const skipped   = sessionAnswers.length - answered.length;
    const remaining = questions.length - currentQIndex - 1;

    // Pull numeric scores from aiFeedback strings e.g. "Relevance 4/5"
    const scores = answered
      .map(a => {
        const match = a.aiFeedback?.match(/Relevance (\d)/);
        return match ? parseInt(match[1]) : null;
      })
      .filter(Boolean);

    const avgScore = scores.length
      ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1)
      : null;

    let summary = 'Summary: You have answered ' + answered.length + ' question' +
      (answered.length !== 1 ? 's' : '') + '.';

    if (skipped > 0)   summary += ' ' + skipped + ' skipped.';
    if (avgScore)      summary += ' Average relevance score: ' + avgScore + ' out of 5.';
    if (remaining > 0) summary += ' ' + remaining + ' question' + (remaining !== 1 ? 's' : '') + ' remaining.';

    // Highlight strongest and weakest answers
    if (scores.length >= 2) {
      const maxIdx = scores.indexOf(Math.max(...scores));
      const minIdx = scores.indexOf(Math.min(...scores));
      summary += ' Best answer: question ' + (maxIdx + 1) + '.';
      summary += ' Needs work: question ' + (minIdx + 1) + '.';
    }

    speak(summary);
    logToPopup(summary, 'score');
  }

  // ── Read back last answer ─────────────────────
  function readBackLastAnswer() {
    const last = sessionAnswers[sessionAnswers.length - 1];
    if (!last || last.transcript === '[Skipped]') {
      speak('No answer to read back yet.');
      return;
    }
    speak('Your last answer was: ' + last.transcript);
    logToPopup('Reading back last answer.', 'default');
  }

  // ── Announce current position ─────────────────
  function announcePosition() {
    if (!sessionActive) {
      speak('No session is active.');
      return;
    }
    speak('You are on question ' + (currentQIndex + 1) + ' of ' + questions.length + '.');
  }

  // ── Time remaining ────────────────────────────
  function announceTimeLeft() {
    if (!isListeningAns || !answerStartTime) {
      speak('No answer timer is running.');
      return;
    }
    const elapsed  = Math.floor((Date.now() - answerStartTime) / 1000);
    const left     = Math.max(0, currentAnswerLimit - elapsed);
    speak(left + ' seconds remaining for this answer.');
  }

  // ── Speed adjustment ──────────────────────────
  function adjustSpeed(delta) {
    const current = parseFloat(settings.ttsSpeed) || 1.0;
    const next    = Math.min(2.0, Math.max(0.5, +(current + delta).toFixed(1)));
    settings.ttsSpeed = next;
    // Persist to storage
    chrome.storage.local.get('voxpathSettings', (result) => {
      const updated = Object.assign({}, result.voxpathSettings || {}, { ttsSpeed: next });
      chrome.storage.local.set({ voxpathSettings: updated });
    });
    speak('Speed set to ' + next + 'x.');
    logToPopup('TTS speed → ' + next + 'x', 'default');
  }

  function readCurrentQuestion() {
    const q = questions[currentQIndex];
    if (!q) return;
    stopSpeaking();

    const announcement = 'Question ' + (currentQIndex + 1) + ' of ' + questions.length + '. ' + q;
    logToPopup('Q' + (currentQIndex + 1) + ': ' + q.substring(0, 70) + (q.length > 70 ? '…' : ''), 'default');

    const field = getActiveField();
    if (field) field.focus();

    // ── Wait for TTS to fully finish, then add a small breath gap ──
    // No more timer guessing — STT starts exactly when the last word is spoken
    speak(announcement, () => {
      if (sessionActive) {
        setTimeout(() => startAnswerCapture(), 600); // 600ms breath gap feels natural
      }
    });
  }

  // ════════════════════════════════════════════
  //  ANSWER CAPTURE — AI classifies each chunk
  // ════════════════════════════════════════════
  function startAnswerCapture() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    isListeningAns      = true;
    answerStartTime     = Date.now();
    currentAnswerLimit  = settings.answerTime || 120;
    try { recognitionCmd.abort(); } catch (_) {}

    let finalTranscript = '';
    let classifying     = false;
    let gotResult       = false;

    // ── Build and start recognizer INSIDE the callback ──
    // Chrome marks a SpeechRecognition object stale if .start()
    // isn't called immediately after construction. By creating it
    // here we guarantee construction and start happen in the same
    // microtask tick with no async gap between them.
    const startRecognizer = () => {
      recognitionAns = new SR();
      recognitionAns.continuous      = true;
      recognitionAns.interimResults  = true;
      recognitionAns.lang            = settings.sttLang || 'en-IN';
      recognitionAns.maxAlternatives = 1;

      recognitionAns.onresult = async (event) => {
        gotResult = true;
        setTimeout(() => { gotResult = false; }, 300);
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk   = event.results[i][0].transcript;
        const isFinal = event.results[i].isFinal;

        if (isFinal) {
          // ── AI classification on every final chunk ──
          // We don't await here — we run it in parallel while
          // continuing to accept speech. If it's a command,
          // we stop capture; if answer, we commit the chunk.
          if (!classifying) {
            classifying = true;
            const currentQ = questions[currentQIndex] || '';

            classifyWithGroq(chunk, currentQ).then((result) => {
              classifying = false;

              if (result.type === 'command') {
                // Undo: remove any interim text that slipped into the field
                updateFieldLive(finalTranscript.trim());
                executeCommand(result.command);
              } else {
                // It's a real answer chunk — commit it
                finalTranscript += chunk + ' ';
                updateFieldLive(finalTranscript.trim());
              }
            });
          }

        } else {
          // Interim — show live preview (includes the unclassified chunk)
          interimTranscript += chunk;
        }
      }

      // Show live preview (interim only — finalTranscript updated async)
      if (interimTranscript) {
        updateFieldLive(finalTranscript + interimTranscript);
      }
    };

    recognitionAns.onend = () => {
      // ── Silent dropout detection ──────────────
      // onend fired but onresult never did = Chrome dropped the mic
      // without the user finishing. Restart STT and keep accumulating.
      if (gotResult === false && isListeningAns) {
        logToPopup('⚠ Mic dropped silently — restarting…', 'warn');
        try {
          // Reset flag and restart the same recognizer config
          recognitionAns.start();
          return;   // don't process answer yet — user is still speaking
        } catch (_) {
          // If restart fails, fall through to normal end handling
        }
      }

      // Normal end — user actually finished or stopAnswerCapture() was called
      isListeningAns = false;
      updateFieldLive(finalTranscript.trim());
      processAnswer(finalTranscript.trim());
      restartCmdListener();
    };

    recognitionAns.onerror = (e) => {
      if (e.error === 'no-speech') return;
      isListeningAns = false;
      restartCmdListener();
    };

    try {
      recognitionAns.start();
    } catch (e) {
      isListeningAns = false;
      restartCmdListener();
    }

    const limit = (settings.answerTime || 120) * 1000;
    answerTimer = setTimeout(() => stopAnswerCapture(), limit);
  }; // end startRecognizer

  // ── Speak prompt first, start recognizer only when fully done ──
  speak('Ready. Speak your answer now.', () => {
    setTimeout(startRecognizer, 300);
  });
}

  function stopAnswerCapture(andSubmit = false) {
    clearTimeout(answerTimer);
    try { recognitionAns?.stop(); } catch (_) {}
    if (andSubmit) {
      const submitted = clickSubmitButton();
      if (submitted) logToPopup('✓ Submit button clicked.', 'score');
    }
  }

  // ════════════════════════════════════════════
  //  FIELD HELPERS — Google Forms compatible
  // ════════════════════════════════════════════
  function getActiveField() {
    const fields = getVisibleFields();
    return fields[currentQIndex] || fields[0] || null;
  }

  function getVisibleFields() {
    const all = [
      ...document.querySelectorAll('[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('input[type="text"]'),
    ];
    return all.filter(el => {
      const rect = el.getBoundingClientRect();
      return rect.width > 50 && rect.height > 20 && rect.top >= 0;
    });
  }

  function updateFieldLive(text) {
    const field = getActiveField();
    if (!field || text === undefined) return;

    if (field.getAttribute('contenteditable') === 'true') {
      field.focus();
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(field);
      selection.removeAllRanges();
      selection.addRange(range);
      document.execCommand('insertText', false, text);
    } else {
      const proto = field instanceof HTMLTextAreaElement
        ? window.HTMLTextAreaElement.prototype
        : window.HTMLInputElement.prototype;
      const nativeSetter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
      if (nativeSetter) {
        nativeSetter.call(field, text);
      } else {
        field.value = text;
      }
      field.dispatchEvent(new Event('input',  { bubbles: true }));
      field.dispatchEvent(new Event('change', { bubbles: true }));
    }
  }

  // ════════════════════════════════════════════
  //  DOM PARSING — Extract Questions
  // ════════════════════════════════════════════
  function extractQuestions() {
    const candidates = [];

    // Google Forms — class M7eMe
    document.querySelectorAll('[class*="M7eMe"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 10 && text.length < 500) candidates.push(text);
    });

    // Google Forms fallback — role=heading inside role=listitem
    if (candidates.length === 0) {
      document.querySelectorAll('[role="listitem"]').forEach(item => {
        const heading = item.querySelector('[role="heading"]');
        if (heading) {
          const text = heading.textContent.trim();
          if (text.length > 10 && !candidates.includes(text)) candidates.push(text);
        }
      });
    }

    // Standard form labels
    if (candidates.length === 0) {
      document.querySelectorAll('label').forEach(el => {
        const text = el.textContent.trim();
        if (isQuestionText(text)) candidates.push(text);
      });
    }

    // Inputs with adjacent text
    if (candidates.length === 0) {
      document.querySelectorAll('textarea, input[type="text"]').forEach(input => {
        const prev = input.previousElementSibling;
        if (prev) {
          const text = prev.textContent.trim();
          if (isQuestionText(text) && !candidates.includes(text)) candidates.push(text);
        }
        if (input.id) {
          const label = document.querySelector(`label[for="${input.id}"]`);
          if (label) {
            const text = label.textContent.trim();
            if (isQuestionText(text) && !candidates.includes(text)) candidates.push(text);
          }
        }
      });
    }

    // Paragraphs and headings
    if (candidates.length === 0) {
      document.querySelectorAll('p, h2, h3, li').forEach(el => {
        const text = el.textContent.trim();
        if (isQuestionText(text) && !candidates.includes(text)) candidates.push(text);
      });
    }

    return [...new Set(candidates)].slice(0, 20);
  }

  function isQuestionText(text) {
    if (!text || text.length < 12 || text.length > 500) return false;
    const patterns = [
      /\?$/,
      /^(what|why|how|when|where|who|describe|explain|tell|give|list|share|walk|define)/i,
      /\d+[.)]\s+\w/,
      /^(q\d|question\s*\d)/i,
    ];
    return patterns.some(p => p.test(text));
  }

  // ════════════════════════════════════════════
  //  PAGE INSTRUCTIONS EXTRACTOR
  //  Reads any instruction/description text
  //  that appears before the first question
  // ════════════════════════════════════════════
  function extractPageInstructions() {
    const candidates = [];

    // Google Forms — description text uses class freebirdFormviewerViewHeaderDescription
    // or role="note" inside the form header
    document.querySelectorAll([
      '[class*="freebirdFormviewerViewHeaderDescription"]',
      '[class*="sketchyformDescription"]',
      '[role="note"]',
      '[class*="description"]',
      '[class*="instructions"]',
      '[class*="intro"]',
      '[class*="direction"]',
    ].join(',')).forEach(el => {
      const text = el.textContent.trim();
      // Must be substantial and not a question itself
      if (text.length > 20 && text.length < 1000 && !isQuestionText(text)) {
        candidates.push(text);
      }
    });

    // Fallback — first <p> on the page if it looks instructional
    if (candidates.length === 0) {
      const paras = document.querySelectorAll('p');
      for (const p of paras) {
        const text = p.textContent.trim();
        if (
          text.length > 40 && text.length < 800 &&
          !isQuestionText(text) &&
          /please|instruction|note|read|answer|complete|fill|this (form|test|interview)/i.test(text)
        ) {
          candidates.push(text);
          break;
        }
      }
    }

    // Return first match, capped at 400 chars so TTS doesn't read forever
    if (candidates.length === 0) return null;
    const raw = candidates[0];
    return raw.length > 400 ? raw.substring(0, 397) + '...' : raw;
  }

  // ════════════════════════════════════════════
  //  SUBMIT BUTTON FINDER & CLICKER
  // ════════════════════════════════════════════
  function findSubmitButton() {
    // Priority-ordered selectors — most specific first
    const selectors = [
      // Google Forms submit
      '[jsname="M2UYVd"]',
      '[data-id="submit-form"]',
      // Generic submit inputs
      'input[type="submit"]',
      // Buttons with submit-like text
      'button[type="submit"]',
      // Any visible button whose text matches submit keywords
    ];

    for (const sel of selectors) {
      const el = document.querySelector(sel);
      if (el && isVisible(el)) return el;
    }

    // Last resort — scan all buttons for submit-like text
    const submitKeywords = /^(submit|finish|done|send|complete|next\s*step|confirm)$/i;
    const allBtns = [
      ...document.querySelectorAll('button'),
      ...document.querySelectorAll('[role="button"]'),
    ];
    for (const btn of allBtns) {
      const text = btn.textContent.trim();
      if (submitKeywords.test(text) && isVisible(btn)) return btn;
    }

    return null;
  }

  function isVisible(el) {
    const rect = el.getBoundingClientRect();
    return rect.width > 0 && rect.height > 0 &&
           getComputedStyle(el).visibility !== 'hidden' &&
           getComputedStyle(el).display !== 'none';
  }

  function clickSubmitButton() {
    const btn = findSubmitButton();
    if (!btn) return false;
    btn.focus();
    btn.click();
    return true;
  }

  // ════════════════════════════════════════════
  //  CONFIRMATION HELPER
  //  Asks a yes/no question via voice then
  //  calls onConfirm() or onCancel()
  // ════════════════════════════════════════════
  let awaitingConfirm = false;

  function confirmThen(question, onConfirm, onCancel) {
    if (awaitingConfirm) return;
    awaitingConfirm = true;

    // Hard-stop everything that could fight the confirm listener
    try { recognitionCmd.abort(); } catch (_) {}
    stopAnswerCapture();

    // Speak the confirmation prompt via background TTS
    speak(question + ' Say yes to confirm, or no to cancel.', () => {

      // ── Audio pipeline settle delay ───────────────────────────────
      // chrome.tts fires onDone but the OS audio device is still
      // in "output" mode for ~400ms. Starting STT immediately causes
      // Chrome to silently kill the listener. Wait for the device to
      // switch back to input before opening the mic.
      setTimeout(() => startConfirmListener(), 500);

    });

    function startConfirmListener() {
      const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (!SR) {
        awaitingConfirm = false;
        onConfirm();
        return;
      }

      logToPopup('🎤 Listening for yes or no…', 'default');

      const listener = new SR();
      listener.lang            = settings.sttLang || 'en-IN';
      listener.continuous      = true;    // keep listening — don't auto-close
      listener.interimResults  = false;
      listener.maxAlternatives = 5;

      let gotAnswer  = false;
      let retries    = 0;
      const MAX_RETRY = 2;

      // Hard timeout — 10 seconds total from when we start listening
      const timeout = setTimeout(() => {
        if (gotAnswer) return;
        gotAnswer = true;
        try { listener.abort(); } catch (_) {}
        awaitingConfirm = false;
        logToPopup('Confirmation timed out.', 'warn');
        speak('No response — action cancelled.', () => {
          if (onCancel) onCancel();
          restartCmdListener();
        });
      }, 10000);

      function finish(confirmed) {
        if (gotAnswer) return;
        gotAnswer = true;
        clearTimeout(timeout);
        try { listener.abort(); } catch (_) {}
        awaitingConfirm = false;

        if (confirmed) {
          logToPopup('✓ Confirmed.', 'score');
          speak('Confirmed.', () => { onConfirm(); restartCmdListener(); });
        } else {
          logToPopup('Confirmation cancelled.', 'warn');
          speak('Cancelled.', () => { if (onCancel) onCancel(); restartCmdListener(); });
        }
      }

      listener.onresult = (event) => {
        const heard = Array.from(event.results)
          .slice(event.resultIndex)
          .flatMap(r => Array.from(r))
          .map(alt => alt.transcript.toLowerCase().trim())
          .join(' ');

        logToPopup('Heard: "' + heard + '"', 'default');

        const isYes = /\byes\b|\byeah\b|\byep\b|\bconfirm\b|\bdo it\b|\bsure\b|\bokay\b|\bok\b|\bgo ahead\b|\bproceed\b/.test(heard);
        const isNo  = /\bno\b|\bnope\b|\bcancel\b|\bstop\b|\bdon't\b|\bdo not\b/.test(heard);

        if (isYes) finish(true);
        else if (isNo) finish(false);
        // if neither matched, keep listening — user may still be speaking
      };

      listener.onerror = (e) => {
        if (gotAnswer) return;

        // no-speech = mic open but silence — just keep waiting, timeout will handle it
        if (e.error === 'no-speech') return;

        // audio-capture / not-allowed = mic unavailable
        if (e.error === 'audio-capture' || e.error === 'not-allowed') {
          logToPopup('⚠ Mic unavailable: ' + e.error, 'warn');
          finish(false);
          return;
        }

        // Other errors — retry up to MAX_RETRY times
        if (retries < MAX_RETRY) {
          retries++;
          logToPopup('⚠ STT error (' + e.error + ') — retrying ' + retries + '/' + MAX_RETRY, 'warn');
          setTimeout(() => {
            if (!gotAnswer) {
              try { listener.start(); } catch (_) { finish(false); }
            }
          }, 400);
        } else {
          finish(false);
        }
      };

      listener.onend = () => {
        if (gotAnswer) return;
        // Listener closed without a result — restart it (Chrome auto-closes continuous listeners on silence)
        if (retries < MAX_RETRY) {
          retries++;
          setTimeout(() => {
            if (!gotAnswer) {
              try { listener.start(); } catch (_) { finish(false); }
            }
          }, 300);
        }
        // If max retries hit, let the timeout handle it
      };

      try {
        listener.start();
      } catch (e) {
        awaitingConfirm = false;
        clearTimeout(timeout);
        logToPopup('⚠ Could not start confirm listener: ' + e.message, 'warn');
        speak('Microphone unavailable — action cancelled.', () => {
          if (onCancel) onCancel();
          restartCmdListener();
        });
      }
    }
  }

  // ════════════════════════════════════════════
  //  ANSWER PROCESSING — Filler + AI scoring
  // ════════════════════════════════════════════
  let processingPromise = null;   // track in-flight processAnswer so generateReport can wait

  async function processAnswer(transcript) {
    const run = async () => {
      if (!transcript || transcript.length < 3) {
        speak('No answer detected.');
        return;
      }

      const question = questions[currentQIndex] || '';

      let fillerFeedback = '';
      if (settings.fillerDetect !== false) {
        const result = detectFillers(transcript);
        fillerFeedback = result.feedback;
        if (result.count > 0) {
          logToPopup('⚠ ' + result.count + ' filler word(s): ' + result.found.join(', '), 'warn');
        }
      }

      const wordCount = transcript.split(/\s+/).filter(Boolean).length;
      let paceFeedback = '';
      if (wordCount < 10)  paceFeedback = 'Answer was very short.';
      if (wordCount > 250) paceFeedback = 'Answer was very long — try to be more concise.';

      let aiFeedback = '';
      if (settings.apiKey) {
        try {
          aiFeedback = await scoreWithGroq(question, transcript);
          logToPopup(aiFeedback, 'score');
        } catch (e) {
          logToPopup('AI scoring failed: ' + e.message, 'warn');
        }
      } else {
        logToPopup('No Groq API key — AI scoring skipped.', 'warn');
      }

      sessionAnswers.push({ question, transcript, fillerFeedback, paceFeedback, aiFeedback });

      const combined = [aiFeedback, fillerFeedback, paceFeedback].filter(Boolean).join('. ');
      if (settings.voiceFeedback !== false && combined) speak(combined);
    };

    processingPromise = run().finally(() => { processingPromise = null; });
    return processingPromise;
  }

  function detectFillers(text) {
    const fillers = ['um', 'uh', 'like', 'basically', 'you know', 'kind of', 'sort of', 'right', 'okay so'];
    const lower   = text.toLowerCase();
    const found   = fillers.filter(f => {
      const re = new RegExp('\\b' + f.replace(' ', '\\s+') + '\\b', 'gi');
      return re.test(lower);
    });
    const count = found.reduce((acc, f) => {
      const re = new RegExp('\\b' + f.replace(' ', '\\s+') + '\\b', 'gi');
      return acc + (lower.match(re) || []).length;
    }, 0);
    return {
      count,
      found: [...new Set(found)],
      feedback: count > 0
        ? count + ' filler word' + (count > 1 ? 's' : '') + ' detected: ' + found.slice(0, 3).join(', ') + '. Try pausing instead.'
        : '',
    };
  }

  async function scoreWithGroq(question, answer) {
    const model  = settings.model || 'llama-3.1-8b-instant';
    const prompt = `Score this interview answer:
1. Relevance to question (1-5)
2. Completeness (1-5)
3. Clarity (1-5)
Give one improvement tip in one sentence.
Question: ${question}
Answer: ${answer}
Return ONLY valid JSON: {"relevance":4,"completeness":3,"clarity":4,"tip":"Your tip here."}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 200,
        temperature: 0.3,
      }),
    });

    if (!res.ok) throw new Error('Groq API error ' + res.status);
    const data   = await res.json();
    const text   = data.choices?.[0]?.message?.content || '';
    const clean  = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return `Score — Relevance ${parsed.relevance}/5, Completeness ${parsed.completeness}/5, Clarity ${parsed.clarity}/5. Tip: ${parsed.tip}`;
  }

  // ════════════════════════════════════════════
  //  REPORT
  // ════════════════════════════════════════════
  async function generateReport() {
    logToPopup('📄 generateReport called.', 'default');

    // ── Wait for the last answer to finish scoring ──
    if (processingPromise) {
      logToPopup('⏳ Waiting for answer scoring to complete…', 'default');
      try { await processingPromise; } catch (_) {}
    }

    logToPopup('📄 sessionAnswers.length = ' + sessionAnswers.length, 'default');

    if (sessionAnswers.length === 0) {
      speak('No answers recorded. Cannot generate report.');
      logToPopup('⚠ No answers — report aborted.', 'warn');
      return;
    }

    logToPopup('📄 Running bias audit…', 'default');
    let biasFlags = [];
    if (settings.biasAudit !== false && settings.apiKey) {
      try { biasFlags = await auditBiasWithGroq(questions); } catch (_) {}
    }

    logToPopup('📄 Building report data…', 'default');

    speak('Report generated. ' + sessionAnswers.length + ' answers evaluated.' +
      (biasFlags.length > 0 ? ' ' + biasFlags.length + ' biased questions flagged.' : ''));

    logToPopup('Report ready — ' + sessionAnswers.length + ' answers, ' + biasFlags.length + ' bias flag(s).', 'score');

    logToPopup('📄 Calling downloadReport…', 'default');
    downloadReport({
      candidateName: settings.candidateName || 'Anonymous',
      questions,
      answers:   sessionAnswers,
      biasFlags,
    });
  }

  // ── Called on post-submit page from storage data ──────────────
  async function generateReportFromData(data) {
    logToPopup('📄 generateReportFromData — ' + (data.answers || []).length + ' answers.', 'default');

    if (!data.answers || data.answers.length === 0) {
      speak('No answers were recorded.');
      logToPopup('⚠ Pending report had no answers.', 'warn');
      return;
    }

    let biasFlags = data.biasFlags || [];
    if (settings.biasAudit !== false && settings.apiKey && biasFlags.length === 0) {
      try { biasFlags = await auditBiasWithGroq(data.questions || []); } catch (_) {}
    }

    speak('Interview report ready. ' + data.answers.length + ' answers evaluated.');
    logToPopup('✅ Report ready. Downloading PDF…', 'score');

    downloadReport({
      candidateName: data.candidateName || 'Anonymous',
      questions:     data.questions     || [],
      answers:       data.answers,
      biasFlags,
    });
  }

  async function auditBiasWithGroq(questionList) {
    const model  = settings.model || 'llama-3.1-8b-instant';
    const prompt = `Audit these interview questions for visual-ability bias.
Flag questions that assume the candidate can see.
Return ONLY a JSON array of biased question strings, or [].
Questions: ${JSON.stringify(questionList)}`;

    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + settings.apiKey,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: 'user', content: prompt }],
        max_tokens: 400,
      }),
    });
    if (!res.ok) return [];
    const data  = await res.json();
    const text  = data.choices?.[0]?.message?.content || '[]';
    const clean = text.replace(/```json|```/g, '').trim();
    return JSON.parse(clean);
  }

  function downloadReport(data) {
    // ── Safety check: jsPDF must be loaded via manifest before content.js ──
    if (!window.jspdf || !window.jspdf.jsPDF) {
      logToPopup('⚠ jsPDF not loaded — downloading plain text report instead.', 'warn');
      downloadPlainReport(data);
      return;
    }

    let doc;
    try {
      const { jsPDF } = window.jspdf;
      doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
    } catch (e) {
      logToPopup('⚠ jsPDF init failed: ' + e.message + ' — falling back to text.', 'warn');
      downloadPlainReport(data);
      return;
    }

    const PW  = 210;   // page width  (A4 mm)
    const PH  = 297;   // page height (A4 mm)
    const ML  = 18;    // margin left
    const MR  = 18;    // margin right
    const CW  = PW - ML - MR;   // content width
    let   Y   = 0;     // current Y cursor

    // ── Colours ──────────────────────────────────
    const C = {
      bg:       [9,  13,  20],
      surface:  [17, 24,  39],
      accent:   [0,  229, 192],
      accent2:  [0,  119, 255],
      white:    [255,255, 255],
      light:    [232,240, 254],
      muted:    [107,122, 153],
      warn:     [255,107,  53],
      border:   [30,  45,  64],
      good:     [34,  197, 94],
    };

    // ── Helpers ───────────────────────────────────
    function setFont(size, style = 'normal', color = C.white) {
      doc.setFontSize(size);
      doc.setFont('helvetica', style);
      doc.setTextColor(...color);
    }

    function fillRect(x, y, w, h, color) {
      doc.setFillColor(...color);
      doc.rect(x, y, w, h, 'F');
    }

    function drawLine(x1, y1, x2, y2, color = C.border, lw = 0.3) {
      doc.setDrawColor(...color);
      doc.setLineWidth(lw);
      doc.line(x1, y1, x2, y2);
    }

    function addPage() {
      doc.addPage();
      Y = 0;
      drawPageBg();
      Y = 14;
    }

    function checkPageBreak(needed = 20) {
      if (Y + needed > PH - 16) addPage();
    }

    function wrapText(text, maxW, fontSize, style = 'normal') {
      doc.setFontSize(fontSize);
      doc.setFont('helvetica', style);
      return doc.splitTextToSize(String(text), maxW);
    }

    // ── Full dark background on each page ─────────
    function drawPageBg() {
      fillRect(0, 0, PW, PH, C.bg);
    }

    // ── Gradient header bar ───────────────────────
    function drawHeader() {
      // Teal accent bar at very top
      fillRect(0, 0, PW, 2, C.accent);

      // Dark header area
      fillRect(0, 2, PW, 42, C.surface);

      // Logo circle
      doc.setFillColor(...C.accent);
      doc.circle(ML + 8, 23, 7, 'F');
      setFont(10, 'bold', C.surface);
      doc.text('V', ML + 5.5, 26.5);

      // Title
      setFont(22, 'bold', C.white);
      doc.text('VoxPath', ML + 20, 20);

      setFont(8, 'normal', C.muted);
      doc.text('AI Voice Interview System  ·  Evaluation Report', ML + 20, 27);

      // Right side — date badge
      const dateStr = new Date().toLocaleDateString('en-IN', {
        day: '2-digit', month: 'short', year: 'numeric'
      });
      fillRect(PW - MR - 38, 13, 38, 10, C.border);
      setFont(7.5, 'normal', C.muted);
      doc.text('Generated', PW - MR - 35, 19.5);
      setFont(8, 'bold', C.accent);
      doc.text(dateStr, PW - MR - 35, 24);

      // Bottom accent line
      fillRect(0, 44, PW, 1, C.accent2);
      Y = 54;
    }

    // ── Section heading ───────────────────────────
    function sectionHeading(title, icon = '') {
      checkPageBreak(16);
      fillRect(ML, Y, CW, 9, C.surface);
      fillRect(ML, Y, 3, 9, C.accent);
      setFont(9, 'bold', C.accent);
      doc.text((icon ? icon + '  ' : '') + title.toUpperCase(), ML + 7, Y + 6.2);
      Y += 13;
    }

    // ── Candidate info card ───────────────────────
    function candidateCard(name, totalQ, answered, skipped) {
      fillRect(ML, Y, CW, 28, C.surface);
      drawLine(ML, Y, ML + CW, Y, C.accent, 0.5);

      // Left column
      setFont(7.5, 'normal', C.muted);
      doc.text('CANDIDATE', ML + 6, Y + 7);
      setFont(13, 'bold', C.white);
      doc.text(name || 'Anonymous', ML + 6, Y + 14);

      // Stats row
      const stats = [
        { label: 'TOTAL QUESTIONS', val: String(totalQ)    },
        { label: 'ANSWERED',        val: String(answered)  },
        { label: 'SKIPPED',         val: String(skipped)   },
      ];
      const colW = CW / 3;
      stats.forEach((s, i) => {
        const x = ML + colW * i + colW * 0.3;
        if (i > 0) drawLine(ML + colW * i, Y + 4, ML + colW * i, Y + 26, C.border);
        setFont(7, 'normal', C.muted);
        doc.text(s.label, x, Y + 20);
        setFont(14, 'bold', s.val === '0' && s.label === 'SKIPPED' ? C.good : C.accent);
        doc.text(s.val, x, Y + 27.5);
      });

      Y += 34;
    }

    // ── Overall score bar chart ───────────────────
    function overallScoreChart(answers) {
      const scored = answers.filter(a => a.aiFeedback && a.aiFeedback !== 'Question skipped.');
      if (scored.length === 0) return;

      sectionHeading('Overall Performance', '◈');

      // Average scores
      const dims = ['relevance', 'completeness', 'clarity'];
      const avgs = dims.map(dim => {
        const vals = scored.map(a => {
          const m = a.aiFeedback?.match(new RegExp(dim.charAt(0).toUpperCase() + dim.slice(1) + '\\s+(\\d)', 'i'));
          return m ? parseInt(m[1]) : null;
        }).filter(Boolean);
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      });

      const barH   = 10;
      const barGap = 7;
      const labelW = 32;
      const barMaxW = CW - labelW - 22;

      dims.forEach((dim, i) => {
        const avg = avgs[i];
        const bx  = ML + labelW;
        const by  = Y + i * (barH + barGap);
        const bw  = (avg / 5) * barMaxW;

        // Label
        setFont(8.5, 'bold', C.muted);
        doc.text(dim.charAt(0).toUpperCase() + dim.slice(1), ML + 2, by + barH - 2);

        // Track
        fillRect(bx, by, barMaxW, barH, C.border);

        // Fill
        const fillColor = avg >= 4 ? C.good : avg >= 3 ? C.accent : C.warn;
        fillRect(bx, by, bw, barH, fillColor);

        // Score text
        setFont(8, 'bold', C.white);
        doc.text(avg.toFixed(1) + '/5', bx + barMaxW + 4, by + barH - 2);
      });

      Y += dims.length * (barH + barGap) + 8;
    }

    // ── Score pill badge ──────────────────────────
    function scorePill(x, y, label, value, maxVal, color) {
      const w = 28, h = 13;
      fillRect(x, y, w, h, C.border);
      setFont(6.5, 'normal', C.muted);
      doc.text(label, x + 2, y + 5);
      setFont(10, 'bold', color);
      doc.text(String(value) + '/' + String(maxVal), x + 2, y + 11.5);
    }

    // ── Single answer card ────────────────────────
    function answerCard(ans, index) {
      const isSkipped = ans.transcript === '[Skipped]';

      // Parse scores
      let rel = null, comp = null, clar = null, tip = '';
      if (ans.aiFeedback && !isSkipped) {
        const rm = ans.aiFeedback.match(/Relevance\s+(\d)/i);
        const cm = ans.aiFeedback.match(/Completeness\s+(\d)/i);
        const cl = ans.aiFeedback.match(/Clarity\s+(\d)/i);
        const tm = ans.aiFeedback.match(/Tip:\s*(.+)/i);
        rel  = rm ? parseInt(rm[1]) : null;
        comp = cm ? parseInt(cm[1]) : null;
        clar = cl ? parseInt(cl[1]) : null;
        tip  = tm ? tm[1] : '';
      }

      // Estimate card height
      const qLines  = wrapText(ans.question,  CW - 10, 8.5);
      const anLines = wrapText(ans.transcript, CW - 10, 8);
      const cardH   = 16 +
        qLines.length  * 5 + 4 +
        (isSkipped ? 0 : anLines.length * 4.5 + 4) +
        (rel !== null ? 20 : 0) +
        (tip ? 12 : 0) +
        (ans.fillerFeedback ? 8 : 0) +
        8;

      checkPageBreak(cardH);

      const cx  = ML;
      const cy  = Y;
      const cw  = CW;

      // Card background
      fillRect(cx, cy, cw, cardH, C.surface);

      // Left accent stripe — colour by score
      const avgScore = rel && comp && clar ? (rel + comp + clar) / 3 : null;
      const stripeColor = isSkipped ? C.warn :
        avgScore === null ? C.border :
        avgScore >= 4 ? C.good : avgScore >= 3 ? C.accent : C.warn;
      fillRect(cx, cy, 3, cardH, stripeColor);

      // Question number badge
      fillRect(cx + 5, cy + 5, 18, 9, stripeColor);
      setFont(7, 'bold', C.bg);
      doc.text('Q ' + String(index + 1), cx + 7, cy + 11);

      // Skipped badge
      if (isSkipped) {
        fillRect(cx + cw - 22, cy + 5, 18, 9, C.warn);
        setFont(6.5, 'bold', C.white);
        doc.text('SKIPPED', cx + cw - 21, cy + 11);
      }

      let iy = cy + 7;

      // Question text
      setFont(8.5, 'bold', C.light);
      const qWrapped = wrapText(ans.question, cw - 12, 8.5);
      doc.text(qWrapped, cx + 26, iy);
      iy += qWrapped.length * 5 + 5;

      drawLine(cx + 5, iy, cx + cw - 5, iy, C.border);
      iy += 4;

      if (!isSkipped) {
        // Answer text
        setFont(7.5, 'normal', C.muted);
        doc.text('ANSWER', cx + 6, iy + 4);
        iy += 6;

        setFont(8, 'normal', C.white);
        const anWrapped = wrapText(ans.transcript, cw - 12, 8);
        doc.text(anWrapped, cx + 6, iy);
        iy += anWrapped.length * 4.5 + 5;

        // Score pills
        if (rel !== null) {
          const pillColors = [
            rel  >= 4 ? C.good : rel  >= 3 ? C.accent : C.warn,
            comp >= 4 ? C.good : comp >= 3 ? C.accent : C.warn,
            clar >= 4 ? C.good : clar >= 3 ? C.accent : C.warn,
          ];
          scorePill(cx + 6,  iy, 'RELEVANCE',    rel,  5, pillColors[0]);
          scorePill(cx + 38, iy, 'COMPLETENESS', comp, 5, pillColors[1]);
          scorePill(cx + 70, iy, 'CLARITY',      clar, 5, pillColors[2]);
          iy += 17;
        }

        // Tip
        if (tip) {
          fillRect(cx + 5, iy, cw - 10, 10, C.bg);
          setFont(7, 'bold', C.accent2);
          doc.text('TIP  ', cx + 8, iy + 6.5);
          setFont(7, 'normal', C.light);
          const tipWrapped = wrapText(tip, cw - 30, 7);
          doc.text(tipWrapped[0], cx + 18, iy + 6.5);
          iy += 13;
        }

        // Filler words
        if (ans.fillerFeedback) {
          setFont(7, 'normal', C.warn);
          doc.text('⚠  ' + ans.fillerFeedback, cx + 6, iy + 5);
          iy += 8;
        }
      }

      Y += cardH + 5;
    }

    // ── Bias audit section ────────────────────────
    function biasSection(flags) {
      if (!flags || flags.length === 0) {
        sectionHeading('Bias Audit', '◎');
        fillRect(ML, Y, CW, 14, C.surface);
        fillRect(ML, Y, 3, 14, C.good);
        setFont(9, 'bold', C.good);
        doc.text('✓  No visual-ability bias detected in any question.', ML + 8, Y + 9);
        Y += 20;
        return;
      }

      sectionHeading('Bias Audit — Flags Found', '⚠');
      flags.forEach(flag => {
        checkPageBreak(16);
        fillRect(ML, Y, CW, 13, C.surface);
        fillRect(ML, Y, 3, 13, C.warn);
        setFont(7.5, 'bold', C.warn);
        doc.text('FLAGGED', ML + 6, Y + 5.5);
        setFont(7.5, 'normal', C.light);
        const wrapped = wrapText(flag, CW - 30, 7.5);
        doc.text(wrapped, ML + 6, Y + 10.5);
        Y += 16;
      });
    }

    // ── Footer on every page ──────────────────────
    function drawFooters(totalPages) {
      for (let p = 1; p <= totalPages; p++) {
        doc.setPage(p);
        fillRect(0, PH - 12, PW, 12, C.surface);
        drawLine(0, PH - 12, PW, PH - 12, C.accent2, 0.4);
        setFont(7, 'normal', C.muted);
        doc.text('VoxPath v1.3  ·  SDG 4 · 9 · 10  ·  AI Voice Interview System', ML, PH - 5);
        setFont(7, 'normal', C.muted);
        doc.text('Page ' + p + ' of ' + totalPages, PW - MR - 18, PH - 5);
      }
    }

    // ════════════════════════════════════════
    //  BUILD THE REPORT
    // ════════════════════════════════════════
    drawPageBg();
    drawHeader();

    // ── Candidate card ──────────────────────
    const answered = data.answers.filter(a => a.transcript !== '[Skipped]').length;
    const skipped  = data.answers.length - answered;
    candidateCard(data.candidateName, data.questions.length, answered, skipped);

    Y += 4;

    // ── Overall score chart ─────────────────
    overallScoreChart(data.answers);

    Y += 4;

    // ── Individual answers ──────────────────
    sectionHeading('Answer Breakdown', '▸');
    data.answers.forEach((ans, i) => answerCard(ans, i));

    Y += 4;

    // ── Bias audit ──────────────────────────
    biasSection(data.biasFlags);

    // ── Footers ─────────────────────────────
    drawFooters(doc.getNumberOfPages());

    // ── Export as base64 and download via background ──
    // Content script blob downloads are blocked by Chrome CSP.
    // background.js uses chrome.downloads which has no such restriction.
    try {
      const blob = doc.output('blob');
      const url = URL.createObjectURL(blob);

      chrome.runtime.sendMessage(
        { type: 'DOWNLOAD_PDF', dataUrl: url },
        (response) => {
          if (response && response.ok) {
            logToPopup('✓ PDF downloaded.', 'score');
          } else {
            logToPopup('⚠ PDF download failed — trying text fallback.', 'warn');
            downloadPlainReport(data);
          }
        }
      );
    } catch (e) {
      logToPopup('⚠ PDF export failed: ' + e.message, 'warn');
      downloadPlainReport(data);
    }
  }

  // ── Plain text fallback if jsPDF fails ───────
  function downloadPlainReport(data) {
    const lines = [
      'VOXPATH — INTERVIEW REPORT',
      '===========================',
      'Candidate : ' + (data.candidateName || 'Anonymous'),
      'Date      : ' + new Date().toLocaleDateString('en-IN'),
      'Questions : ' + data.answers.length,
      '',
    ];
    data.answers.forEach((a, i) => {
      lines.push('Q' + (i + 1) + ': ' + a.question);
      lines.push('Answer  : ' + (a.transcript || 'N/A'));
      lines.push('Score   : ' + (a.aiFeedback || 'N/A'));
      lines.push('Fillers : ' + (a.fillerFeedback || 'None'));
      lines.push('');
    });
    if (data.biasFlags && data.biasFlags.length > 0) {
      lines.push('BIAS FLAGS:');
      data.biasFlags.forEach(f => lines.push('  ⚠ ' + f));
    }
    lines.push('Generated by VoxPath v1.3');

    const blob = new Blob([lines.join('\n')], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'voxpath-report-' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    logToPopup('✓ Text report downloaded (PDF fallback).', 'score');
  }

  // ════════════════════════════════════════════
  //  TTS — routes through background.js
  //  Uses chrome.tts (reliable) not speechSynthesis
  //  (which breaks silently in content scripts)
  // ════════════════════════════════════════════
  let ttsQueue    = [];
  let ttsSpeaking = false;

  function speak(text, onDone) {
    if (!text) { if (onDone) onDone(); return; }
    ttsQueue.push({ text, onDone });
    if (!ttsSpeaking) processTTSQueue();
  }

  function processTTSQueue() {
    if (ttsQueue.length === 0) { ttsSpeaking = false; return; }
    ttsSpeaking = true;
    const { text, onDone } = ttsQueue.shift();

    chrome.runtime.sendMessage(
      { type: 'TTS_SPEAK', text, rate: parseFloat(settings.ttsSpeed) || 1.0 },
      () => {
        // onDone fires when background confirms speech finished
        ttsSpeaking = false;
        if (onDone) onDone();
        processTTSQueue();
      }
    );
  }

  function stopSpeaking() {
    ttsQueue    = [];
    ttsSpeaking = false;
    chrome.runtime.sendMessage({ type: 'TTS_STOP' });
  }

  function speakHelp() {
    speak(
      'Available commands: ' +
      'next question. Skip question. Go back. Repeat question. Submit answer. ' +
      'Read my answer. What question is this. Start over. ' +
      'Summary. Time left. ' +
      'Pause interview. Resume interview. Exit interview. ' +
      'Speak slower. Speak faster. Help.'
    );
  }

  function logToPopup(text, variant) {
    chrome.runtime.sendMessage({ type: 'LOG_UPDATE', text, variant });
  }

})();
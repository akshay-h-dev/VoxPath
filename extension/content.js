// ════════════════════════════════════════════
//  VoxPath — Content Script v1.1
//  Fixes: live typing, command bleed into answer
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

  // Commands to strip from answer transcript
  const CMD_WORDS = [
    'submit answer', 'next question', 'end interview',
    'go back', 'repeat question', 'begin interview',
    'previous question', 'help'
  ];

  // ── Boot ─────────────────────────────────────
  loadSettings();

  function loadSettings() {
    chrome.storage.local.get('voxpathSettings', (result) => {
      settings = result.voxpathSettings || {};
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
  //  VOICE COMMAND LISTENER (always-on)
  // ════════════════════════════════════════════
  function initVoiceCommandListener() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) {
      logToPopup('⚠ Speech Recognition not supported in this browser.', 'warn');
      return;
    }

    recognitionCmd = new SR();
    recognitionCmd.continuous     = true;
    recognitionCmd.interimResults = false;
    recognitionCmd.lang           = settings.sttLang || 'en-IN';

    recognitionCmd.onresult = (event) => {
      // Ignore while answer listener is active
      if (isListeningAns) return;

      const transcript = Array.from(event.results)
        .slice(event.resultIndex)
        .map(r => r[0].transcript.trim().toLowerCase())
        .join(' ');

      handleVoiceCommand(transcript);
    };

    recognitionCmd.onerror = (e) => {
      if (e.error !== 'no-speech' && !isListeningAns) restartCmdListener();
    };

    recognitionCmd.onend = () => {
      if (!isListeningAns) restartCmdListener();
    };

    try {
      recognitionCmd.start();
      logToPopup('VoxPath active. Say "begin interview" to start.', 'default');
      speak('VoxPath active. Say begin interview to start.');
    } catch (_) {}
  }

  function restartCmdListener() {
    setTimeout(() => {
      if (!isListeningAns) {
        try { recognitionCmd.start(); } catch (_) {}
      }
    }, 600);
  }

  function handleVoiceCommand(text) {
    if (text.includes('begin interview') || text.includes('start interview')) {
      startSession();
    } else if (text.includes('next question') || text.includes('next')) {
      nextQuestion();
    } else if (text.includes('repeat question') || text.includes('repeat')) {
      repeatQuestion();
    } else if (text.includes('submit answer') || text.includes('submit')) {
      stopAnswerCapture();
    } else if (text.includes('go back') || text.includes('previous')) {
      prevQuestion();
    } else if (text.includes('end interview') || text.includes('end session')) {
      endSession();
    } else if (text.includes('help')) {
      speakHelp();
    }
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

    speak('Session started. ' + questions.length + ' questions found. Reading question 1.');
    setTimeout(() => readCurrentQuestion(), 1800);
  }

  function endSession() {
    sessionActive = false;
    stopAnswerCapture();
    chrome.runtime.sendMessage({ type: 'SESSION_STATUS', active: false });
    speak('Interview ended. Generating your report.');
    logToPopup('Session ended. Generating report…', 'default');
    setTimeout(() => generateReport(), 1000);
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

  function readCurrentQuestion() {
    const q = questions[currentQIndex];
    if (!q) return;
    const announcement = 'Question ' + (currentQIndex + 1) + ' of ' + questions.length + '. ' + q;
    speak(announcement);
    logToPopup('Q' + (currentQIndex + 1) + ': ' + q.substring(0, 70) + (q.length > 70 ? '…' : ''), 'default');

    // Focus the matching answer field
    const field = getActiveField();
    if (field) field.focus();

    // Start listening after TTS finishes (rough estimate: 60ms per char)
    const delay = Math.max(1500, announcement.length * 55);
    setTimeout(() => {
      if (sessionActive) startAnswerCapture();
    }, delay);
  }

  // ════════════════════════════════════════════
  //  ANSWER CAPTURE — with live typing fix
  // ════════════════════════════════════════════
  function startAnswerCapture() {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    // ── Hard stop command listener first ──────
    isListeningAns = true;
    try { recognitionCmd.abort(); } catch (_) {}

    speak('Ready. Speak your answer now. Say submit answer when done.');

    recognitionAns = new SR();
    recognitionAns.continuous      = true;
    recognitionAns.interimResults  = true;   // ← key for live typing
    recognitionAns.lang            = settings.sttLang || 'en-IN';
    recognitionAns.maxAlternatives = 1;

    let finalTranscript = '';

    recognitionAns.onresult = (event) => {
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const chunk = event.results[i][0].transcript;

        // ── Strip command words — stop capture if detected ──
        const isCmd = CMD_WORDS.some(cmd =>
          chunk.trim().toLowerCase().includes(cmd)
        );
        if (isCmd) {
          stopAnswerCapture();
          return;
        }

        if (event.results[i].isFinal) {
          finalTranscript += chunk + ' ';
        } else {
          interimTranscript += chunk;
        }
      }

      // ── Live update the text field ──────────
      updateFieldLive(finalTranscript + interimTranscript);
    };

    recognitionAns.onend = () => {
      isListeningAns = false;
      // Write final clean version (no interim)
      updateFieldLive(finalTranscript.trim());
      processAnswer(finalTranscript.trim());
      // Restart command listener only after answer is done
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

    // Auto-stop at time limit
    const limit = (settings.answerTime || 120) * 1000;
    answerTimer = setTimeout(() => stopAnswerCapture(), limit);
  }

  function stopAnswerCapture() {
    clearTimeout(answerTimer);
    try { recognitionAns?.stop(); } catch (_) {}
  }

  // ════════════════════════════════════════════
  //  FIELD HELPERS — Google Forms compatible
  // ════════════════════════════════════════════

  // Returns the answer field for the current question index
  function getActiveField() {
    const editables = getVisibleFields();
    return editables[currentQIndex] || editables[0] || null;
  }

  // Collect all visible answer fields (Google Forms + standard)
  function getVisibleFields() {
    const all = [
      ...document.querySelectorAll('[contenteditable="true"]'),
      ...document.querySelectorAll('textarea'),
      ...document.querySelectorAll('input[type="text"]'),
    ];
    return all.filter(el => {
      const rect = el.getBoundingClientRect();
      // Must be visible and big enough to be an answer box
      return rect.width > 50 && rect.height > 20 && rect.top >= 0;
    });
  }

  // Live-update the field as speech comes in
  function updateFieldLive(text) {
    const field = getActiveField();
    if (!field || !text) return;

    if (field.getAttribute('contenteditable') === 'true') {
      // ── Google Forms uses contenteditable divs ──
      field.focus();

      // Select all existing content
      const selection = window.getSelection();
      const range = document.createRange();
      range.selectNodeContents(field);
      selection.removeAllRanges();
      selection.addRange(range);

      // execCommand is the only method Google Forms actually responds to
      document.execCommand('insertText', false, text);
    } else {
      // ── Standard textarea / input ──
      // Use React's native setter so React state updates properly
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

  // Final write after answer ends (same as live but ensures clean text)
  function injectAnswerToField(text) {
    updateFieldLive(text);
  }

  // ════════════════════════════════════════════
  //  DOM PARSING — Extract Questions
  // ════════════════════════════════════════════
  function extractQuestions() {
    const candidates = [];

    // ── Strategy 1: Google Forms ──────────────
    // Question titles live in elements with class containing "M7eMe"
    document.querySelectorAll('[class*="M7eMe"]').forEach(el => {
      const text = el.textContent.trim();
      if (text.length > 10 && text.length < 500) candidates.push(text);
    });

    // Google Forms fallback: role="heading" inside role="listitem"
    if (candidates.length === 0) {
      document.querySelectorAll('[role="listitem"]').forEach(item => {
        const heading = item.querySelector('[role="heading"]');
        if (heading) {
          const text = heading.textContent.trim();
          if (text.length > 10 && !candidates.includes(text)) candidates.push(text);
        }
      });
    }

    // ── Strategy 2: Standard form labels ─────
    if (candidates.length === 0) {
      document.querySelectorAll('label').forEach(el => {
        const text = el.textContent.trim();
        if (isQuestionText(text)) candidates.push(text);
      });
    }

    // ── Strategy 3: Inputs with adjacent text ─
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

    // ── Strategy 4: Paragraphs and headings ───
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
  //  ANSWER PROCESSING — Filler + AI scoring
  // ════════════════════════════════════════════
  async function processAnswer(transcript) {
    if (!transcript || transcript.length < 3) {
      speak('No answer detected.');
      return;
    }

    const question = questions[currentQIndex] || '';

    // Filler word detection
    let fillerFeedback = '';
    if (settings.fillerDetect !== false) {
      const result = detectFillers(transcript);
      fillerFeedback = result.feedback;
      if (result.count > 0) {
        logToPopup('⚠ ' + result.count + ' filler word(s): ' + result.found.join(', '), 'warn');
      }
    }

    // WPM
    const wordCount = transcript.split(/\s+/).filter(Boolean).length;
    let paceFeedback = '';
    if (wordCount > 5) {
      paceFeedback = wordCount < 30  ? 'Answer was very short.' :
                     wordCount > 200 ? 'Answer was very long — try to be concise.' : '';
    }

    // AI scoring
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
    if (settings.voiceFeedback !== false && combined) {
      speak(combined);
    }
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
    const data  = await res.json();
    const text  = data.choices?.[0]?.message?.content || '';
    const clean = text.replace(/```json|```/g, '').trim();
    const parsed = JSON.parse(clean);
    return `Score — Relevance ${parsed.relevance}/5, Completeness ${parsed.completeness}/5, Clarity ${parsed.clarity}/5. Tip: ${parsed.tip}`;
  }

  // ════════════════════════════════════════════
  //  REPORT
  // ════════════════════════════════════════════
  async function generateReport() {
    if (sessionAnswers.length === 0) {
      speak('No answers recorded. Cannot generate report.');
      return;
    }

    let biasFlags = [];
    if (settings.biasAudit !== false && settings.apiKey) {
      try { biasFlags = await auditBiasWithGroq(questions); } catch (_) {}
    }

    const lines = [
      '═══════════════════════════════════',
      '        VOXPATH — INTERVIEW REPORT',
      '═══════════════════════════════════',
      'Candidate : ' + (settings.candidateName || 'Unknown'),
      'Date      : ' + new Date().toLocaleDateString('en-IN'),
      'Questions : ' + sessionAnswers.length,
      '',
      '─── ANSWERS & SCORES ───',
    ];

    sessionAnswers.forEach((a, i) => {
      lines.push('');
      lines.push('Q' + (i + 1) + ': ' + a.question);
      lines.push('Answer  : ' + a.transcript.substring(0, 120) + (a.transcript.length > 120 ? '…' : ''));
      lines.push('Score   : ' + (a.aiFeedback    || 'N/A (no API key)'));
      lines.push('Fillers : ' + (a.fillerFeedback || 'None detected'));
    });

    if (biasFlags.length > 0) {
      lines.push('');
      lines.push('─── BIAS AUDIT ───');
      biasFlags.forEach(f => lines.push('⚠ ' + f));
    }

    lines.push('');
    lines.push('═══════════════════════════════════');
    lines.push('Generated by VoxPath v1.1');

    const report = lines.join('\n');
    logToPopup('Report ready — ' + sessionAnswers.length + ' answers, ' + biasFlags.length + ' bias flag(s).', 'score');
    speak('Report generated. ' + sessionAnswers.length + ' answers evaluated.' + (biasFlags.length > 0 ? ' ' + biasFlags.length + ' biased questions flagged.' : ''));

    if (settings.autoPdf !== false) downloadReport(report);
  }

  async function auditBiasWithGroq(questionList) {
    const model  = settings.model || 'llama-3.1-8b-instant';
    const prompt = `Audit these interview questions for visual-ability bias.
Flag questions that assume the candidate can see (e.g. "describe this chart").
Return ONLY a JSON array of biased question strings, or [] if none.
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

  function downloadReport(text) {
    const blob = new Blob([text], { type: 'text/plain' });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement('a');
    a.href     = url;
    a.download = 'voxpath-report-' + Date.now() + '.txt';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  // ════════════════════════════════════════════
  //  HELPERS
  // ════════════════════════════════════════════
  function speak(text) {
    if (!text) return;
    window.speechSynthesis.cancel();
    const utt  = new SpeechSynthesisUtterance(text);
    utt.rate   = parseFloat(settings.ttsSpeed) || 1.0;
    utt.lang   = settings.sttLang || 'en-IN';
    utt.volume = 1;
    window.speechSynthesis.speak(utt);
  }

  function speakHelp() {
    speak('Available commands: begin interview. Next question. Repeat question. Submit answer. Go back. End interview. Help.');
  }

  function logToPopup(text, variant) {
    chrome.runtime.sendMessage({ type: 'LOG_UPDATE', text, variant });
  }

})();

// ════════════════════════════════════════════
//  VoxPath — Popup Logic
//  Handles: page routing, settings persistence,
//           status sync, log updates
// ════════════════════════════════════════════

// ── Constants ────────────────────────────────
// Frontend home URL — update this when you deploy
const FRONTEND_HOME = 'http://localhost:5173/';
// Backend API — try 5000 first (.env.example), then 5001 (server.js default)
const BACKEND_PORTS = [5000, 5001];

// ── Page Router ──────────────────────────────
const pages = {
  landing:  document.getElementById('page-landing'),
  main:     document.getElementById('page-main'),
  settings: document.getElementById('page-settings'),
};

function showPage(name) {
  Object.values(pages).forEach(p => p.classList.remove('active'));
  pages[name].classList.add('active');
}

// ── Toast ─────────────────────────────────────
function showToast(msg, duration = 2200) {
  const t = document.getElementById('toast');
  t.textContent = msg;
  t.classList.add('show');
  setTimeout(() => t.classList.remove('show'), duration);
}

// ── Landing Page Buttons ──────────────────────
document.getElementById('btn-get-started').addEventListener('click', () => {
  // Open/redirect the current active tab to the VoxPath web app
  try {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs && tabs[0]) {
        chrome.tabs.update(tabs[0].id, { url: FRONTEND_HOME });
      } else {
        chrome.tabs.create({ url: FRONTEND_HOME });
      }
    });
  } catch (_) {
    // Fallback: do nothing special if chrome APIs are unavailable
  }

  // Mark as visited so subsequent opens can skip the landing page if desired
  chrome.storage.local.set({ voxpathVisited: true });

  // Close the popup after launching the web app
  window.close();
});

document.getElementById('btn-setup-api').addEventListener('click', () => {
  showPage('settings');
});

// ── Main Page: Settings icon ──────────────────
document.getElementById('btn-open-settings').addEventListener('click', () => {
  loadSettingsIntoForm();
  showPage('settings');
});

// ── Settings: Back button ─────────────────────
document.getElementById('btn-back').addEventListener('click', () => {
  showPage('main');
  syncStatusBadge();
});

// ── Settings: Toggle eye (show/hide API key) ──
document.getElementById('btn-toggle-eye').addEventListener('click', () => {
  const inp = document.getElementById('input-api-key');
  inp.type = inp.type === 'password' ? 'text' : 'password';
});

// ── Settings: Range sliders live update ──────
document.getElementById('range-tts-speed').addEventListener('input', function () {
  document.getElementById('range-tts-val').textContent = parseFloat(this.value).toFixed(1) + '×';
});

document.getElementById('range-time').addEventListener('input', function () {
  document.getElementById('range-time-val').textContent = this.value + 's';
});

// ── Settings: Save ────────────────────────────
document.getElementById('btn-save-settings').addEventListener('click', () => {
  const settings = {
    apiKey:        document.getElementById('input-api-key').value.trim(),
    model:         document.getElementById('select-model').value,
    voiceFeedback: document.getElementById('toggle-voice-feedback').checked,
    ttsSpeed:      parseFloat(document.getElementById('range-tts-speed').value),
    sttLang:       document.getElementById('select-lang').value,
    fillerDetect:  document.getElementById('toggle-filler').checked,
    biasAudit:     document.getElementById('toggle-bias').checked,
    answerTime:    parseInt(document.getElementById('range-time').value),
    autoPdf:       document.getElementById('toggle-autopdf').checked,
    candidateName: document.getElementById('input-name').value.trim(),
  };

  chrome.storage.local.set({ voxpathSettings: settings }, () => {
    showToast('✓ Settings saved');
    // Notify content script of updated settings
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(tabs[0].id, { type: 'SETTINGS_UPDATED', settings });
      }
    });
  });
});

// ── Settings: Reset ───────────────────────────
document.getElementById('btn-reset-settings').addEventListener('click', () => {
  chrome.storage.local.remove('voxpathSettings', () => {
    loadDefaultSettings();
    showToast('Settings reset to defaults');
  });
});

// ── Extension login (sync reports without opening frontend) ─
// Tries port 5000 then 5001 so it works with either .env PORT
document.getElementById('btn-extension-login').addEventListener('click', () => {
  const email = document.getElementById('input-account-email').value.trim();
  const password = document.getElementById('input-account-password').value;
  const statusEl = document.getElementById('extension-login-status');
  if (!email || !password) {
    statusEl.textContent = 'Enter email and password';
    return;
  }
  statusEl.textContent = 'Logging in…';

  function tryLogin(portIndex) {
    if (portIndex >= BACKEND_PORTS.length) {
      statusEl.textContent = 'Server not reachable. Try port 5000 or 5001.';
      return;
    }
    const base = 'http://localhost:' + BACKEND_PORTS[portIndex] + '/api';
    fetch(base + '/auth/login', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    })
      .then((res) => res.json())
      .then((data) => {
        if (data && data.success && data.data && data.data.token) {
          chrome.storage.local.set(
            { voxpathAuthToken: data.data.token, voxpathBackendApi: base },
            () => {
              statusEl.textContent = 'Logged in. Reports will sync to server.';
              showToast('✓ Logged in');
            }
          );
        } else {
          statusEl.textContent = (data && data.error) ? data.error : 'Login failed';
        }
      })
      .catch(() => tryLogin(portIndex + 1));
  }
  tryLogin(0);
});

// ── Populate form from storage ────────────────
function loadSettingsIntoForm() {
  chrome.storage.local.get(['voxpathSettings', 'voxpathAuthToken'], (result) => {
    if (result.voxpathSettings) {
      applySettingsToForm(result.voxpathSettings);
    } else {
      loadDefaultSettings();
    }
    const statusEl = document.getElementById('extension-login-status');
    if (statusEl) {
      statusEl.textContent = result.voxpathAuthToken ? 'Logged in' : '';
    }
  });
}

function applySettingsToForm(s) {
  if (s.apiKey)        document.getElementById('input-api-key').value     = s.apiKey;
  if (s.model)         document.getElementById('select-model').value       = s.model;
  if (s.sttLang)       document.getElementById('select-lang').value        = s.sttLang;
  if (s.candidateName) document.getElementById('input-name').value         = s.candidateName;

  document.getElementById('toggle-voice-feedback').checked = s.voiceFeedback ?? true;
  document.getElementById('toggle-filler').checked         = s.fillerDetect  ?? true;
  document.getElementById('toggle-bias').checked           = s.biasAudit     ?? true;
  document.getElementById('toggle-autopdf').checked        = s.autoPdf       ?? true;

  const spd = s.ttsSpeed ?? 1.0;
  document.getElementById('range-tts-speed').value = spd;
  document.getElementById('range-tts-val').textContent = parseFloat(spd).toFixed(1) + '×';

  const tm = s.answerTime ?? 120;
  document.getElementById('range-time').value = tm;
  document.getElementById('range-time-val').textContent = tm + 's';
}

function loadDefaultSettings() {
  applySettingsToForm({
    apiKey: '', model: 'llama-3.1-8b-instant',
    voiceFeedback: true, ttsSpeed: 1.0, sttLang: 'en-IN',
    fillerDetect: true, biasAudit: true,
    answerTime: 120, autoPdf: true, candidateName: '',
  });
}

// ── API Key badge on main page ────────────────
function syncStatusBadge() {
  chrome.storage.local.get('voxpathSettings', (result) => {
    const badge = document.getElementById('api-status-badge');
    const hasKey = result.voxpathSettings?.apiKey?.length > 0;
    badge.textContent = hasKey ? '✓ API Ready' : 'No API Key';
    badge.className   = 'api-badge ' + (hasKey ? 'ok' : 'missing');
  });
}

// ── Main Controls → send messages to content script ──
function sendCmd(type) {
  chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
    if (tabs[0]) {
      chrome.tabs.sendMessage(tabs[0].id, { type }, (response) => {
        if (chrome.runtime.lastError) {
          showToast('⚠ Page not supported yet');
        }
      });
    }
  });
}

document.getElementById('ctrl-start').addEventListener('click',  () => sendCmd('CMD_START'));
document.getElementById('ctrl-next').addEventListener('click',   () => sendCmd('CMD_NEXT'));
document.getElementById('ctrl-repeat').addEventListener('click', () => sendCmd('CMD_REPEAT'));
document.getElementById('ctrl-end').addEventListener('click',    () => sendCmd('CMD_END'));

// ── Clear log ─────────────────────────────────
document.getElementById('btn-clear-log').addEventListener('click', () => {
  const lb = document.getElementById('log-body');
  lb.innerHTML = '<span style="color:var(--muted); font-size:10px;">Log cleared.</span>';
});

// ── Listen for log updates from content script ──
chrome.runtime.onMessage.addListener((msg) => {
  if (msg.type === 'LOG_UPDATE') {
    appendLog(msg.text, msg.variant);
  }
  if (msg.type === 'SESSION_STATUS') {
    updateSessionIndicator(msg.active);
  }
});

function appendLog(text, variant = 'default') {
  const lb = document.getElementById('log-body');
  // Remove placeholder text on first entry
  if (lb.querySelector('span')) lb.innerHTML = '';

  const time = new Date().toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  const line = document.createElement('div');
  line.className = 'log-line';

  const colorMap = { score: 'var(--accent)', warn: 'var(--warn)', default: 'var(--text)' };
  const cls = variant === 'score' ? 'log-score' : variant === 'warn' ? 'log-warn' : '';

  line.innerHTML = `<span class="log-time">${time}</span><span class="${cls}">${text}</span>`;
  lb.appendChild(line);
  lb.scrollTop = lb.scrollHeight;
}

function updateSessionIndicator(active) {
  const dot    = document.getElementById('main-dot');
  const status = document.getElementById('ext-status');
  const ind    = document.getElementById('session-indicator');

  if (active) {
    dot.style.background   = 'var(--accent)';
    dot.style.animation    = '';
    status.textContent     = 'Session Active';
    ind.innerHTML          = '<span class="status-dot"></span> live';
    ind.style.color        = 'var(--accent)';
  } else {
    dot.style.background   = 'var(--muted)';
    dot.style.animation    = 'none';
    status.textContent     = 'Ready';
    ind.innerHTML          = '<span class="status-dot" style="background:var(--muted);animation:none;"></span> idle';
    ind.style.color        = 'var(--muted)';
  }
}

// ── Init ──────────────────────────────────────
(function init() {
  // Check if user has visited before → skip landing
  chrome.storage.local.get(['voxpathVisited', 'voxpathSettings'], (result) => {
    if (result.voxpathVisited) {
      showPage('main');
      syncStatusBadge();
    }
    // Mark visited for next open
    chrome.storage.local.set({ voxpathVisited: true });
    // Pre-load settings into form so it's ready when settings page opens
    if (result.voxpathSettings) {
      applySettingsToForm(result.voxpathSettings);
    }
  });
})();
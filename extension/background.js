// ════════════════════════════════════════════
//  VoxPath — Background Service Worker v1.3
//  Handles TTS via chrome.tts (reliable in
//  extensions unlike speechSynthesis)
// ════════════════════════════════════════════

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {

  // ── TTS: speak a string ───────────────────
  if (message.type === 'TTS_SPEAK') {

    chrome.tts.stop();

    chrome.tts.speak(message.text, {
      rate: message.rate || 1.0,
      volume: 1.0,
      lang: 'en-US',
      onEvent: (event) => {
        if (event.type === 'end' || event.type === 'error' || event.type === 'cancelled') {
          try { sendResponse({ done: true, event: event.type }); } catch (_) {}
        }
      }
    });

    return true;
  }


  // ── PDF DOWNLOAD ───────────────────────────
  if (message.type === 'DOWNLOAD_PDF') {

    console.log('VoxPath: DOWNLOAD_PDF received');

    chrome.downloads.download({
      url: message.dataUrl,
      filename: 'voxpath-report-' + Date.now() + '.pdf',
      saveAs: false
    }, (downloadId) => {

      if (chrome.runtime.lastError) {
        console.error('Download failed:', chrome.runtime.lastError);
        sendResponse({ ok: false });
      } else {
        console.log('Download started:', downloadId);
        sendResponse({ ok: true });
      }

    });

    return true;
  }


  // ── TTS: stop immediately ─────────────────
  if (message.type === 'TTS_STOP') {
    chrome.tts.stop();
    sendResponse({ ok: true });
    return false;
  }


  // ── Relay log/status from content → popup ─
  if (message.type === 'LOG_UPDATE' || message.type === 'SESSION_STATUS') {
    chrome.runtime.sendMessage(message).catch(() => {});
    sendResponse({ ok: true });
    return false;
  }

  sendResponse({ ok: true });
});

// ── Default settings on install ──────────────
chrome.runtime.onInstalled.addListener((details) => {
  if (details.reason === 'install') {
    chrome.storage.local.set({
      voxpathSettings: {
        apiKey:        '',
        model:         'llama-3.1-8b-instant',
        voiceFeedback: true,
        ttsSpeed:      1.0,
        sttLang:       'en-IN',
        fillerDetect:  true,
        biasAudit:     true,
        answerTime:    120,
        autoPdf:       true,
        candidateName: '',
      },
      voxpathVisited: false,
    });
  }
});
// ════════════════════════════════════════════
//  VoxPath — Background Service Worker
//  Handles: extension lifecycle, message relay
// ════════════════════════════════════════════

// Relay messages between content script and popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Forward log/status updates from content script to popup
  if (message.type === 'LOG_UPDATE' || message.type === 'SESSION_STATUS') {
    // Send to all extension views (popup if open)
    chrome.runtime.sendMessage(message).catch(() => {
      // Popup is closed — that's fine, just ignore
    });
  }
  sendResponse({ ok: true });
  return true;
});

// On extension install — set default settings
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
    console.log('VoxPath installed and defaults set.');
  }
});

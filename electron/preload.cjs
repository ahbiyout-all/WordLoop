const { contextBridge, ipcRenderer } = require('electron');

// Expose secure, sandboxed WordLoop Native Bridge to renderer (React UI)
contextBridge.exposeInMainWorld('WordLoopNative', {
  isNativeAvailable: true,
  platform: process.platform,
  arch: process.arch,
  electronVersion: process.versions.electron,
  nodeVersion: process.versions.node,

  // 1. Audio Engine DLL Interface Bridge
  audioEngine: {
    isAvailable: () => process.platform === 'win32',
    processVAD: (pcmData, threshold) =>
      ipcRenderer.invoke('native:audio:processVAD', { pcmData, threshold }),
    comparePronunciation: (nativePcm, userPcm) =>
      ipcRenderer.invoke('native:audio:comparePronunciation', { nativePcm, userPcm }),
  },

  // 2. FastDB In-Memory MMap DLL Interface Bridge
  fastDB: {
    isAvailable: () => process.platform === 'win32',
    searchWord: (query) =>
      ipcRenderer.invoke('native:db:searchWord', query),
  },

  // 3. SRS Neural Engine FSRS & Fuzzy Search DLL Bridge
  srsEngine: {
    isAvailable: () => process.platform === 'win32',
    calculateInterval: (record) =>
      ipcRenderer.invoke('native:srs:calculateInterval', record),
    fuzzySearch: (query, maxDistance) =>
      ipcRenderer.invoke('native:srs:fuzzySearch', { query, maxDistance }),
  },

  // 4. Morphological G2P IPA & Syllable Stress DLL Bridge
  morphEngine: {
    isAvailable: () => process.platform === 'win32',
    analyzeWord: (word) =>
      ipcRenderer.invoke('native:morph:analyzeWord', word),
    lemmatize: (inflectedWord) =>
      ipcRenderer.invoke('native:morph:lemmatize', inflectedWord),
  },

  // 5. Tray & Global Hook DLL Interface Bridge
  systemHook: {
    isAvailable: () => process.platform === 'win32',
    registerHotkey: (hotkey) =>
      ipcRenderer.invoke('native:hook:registerHotkey', hotkey),
    toggleFloatingWidget: () =>
      ipcRenderer.invoke('native:hook:toggleFloatingWidget'),
  },
});

window.addEventListener('DOMContentLoaded', () => {
  console.log('⚡ [WordLoop Native Bridge] Preload script and native IPC channels loaded.');
});

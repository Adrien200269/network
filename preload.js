const { contextBridge, ipcRenderer, clipboard } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  getSystemInfo: () => ipcRenderer.invoke('get-system-info'),
  copyToClipboard: (text) => clipboard.writeText(text)
});

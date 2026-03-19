const { contextBridge, ipcRenderer } = require('electron');

// Expose protected methods that allow the renderer process to use
// safe IPC capabilities without exposing the entire Node.js API
contextBridge.exposeInMainWorld('api', {
  windowMinimize: () => ipcRenderer.send('window-minimize'),
  windowMaximize: () => ipcRenderer.send('window-maximize'),
  windowClose: () => ipcRenderer.send('window-close'),
  isReady: true
});

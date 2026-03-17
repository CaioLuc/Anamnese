import { contextBridge } from 'electron';

// Expose protected methods that allow the renderer process to use
// safe IPC capabilities without exposing the entire Node.js API
contextBridge.exposeInMainWorld('api', {
  // Add methods here later such as:
  // send: (channel, data) => ipcRenderer.send(channel, data),
  // receive: (channel, func) => ipcRenderer.on(channel, (event, ...args) => func(...args))
  isReady: true
});

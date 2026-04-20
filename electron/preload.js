const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showUnreportedToday: () => ipcRenderer.invoke('app:showUnreportedToday'),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  exportBackup: () => ipcRenderer.invoke('file:exportBackup'),
  importBackup: () => ipcRenderer.invoke('file:importBackup'),
  apiBase: 'http://localhost:3899',
});

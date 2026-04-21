const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  showUnreportedToday: () => ipcRenderer.invoke('app:showUnreportedToday'),
  pickImage: () => ipcRenderer.invoke('file:pickImage'),
  exportBackup: () => ipcRenderer.invoke('file:exportBackup'),
  importBackup: () => ipcRenderer.invoke('file:importBackup'),
  apiBase: 'http://localhost:3899',

  // 自动更新
  getVersion: () => ipcRenderer.invoke('app:version'),
  checkUpdateNow: () => ipcRenderer.invoke('updater:checkNow'),
  quitAndInstall: () => ipcRenderer.invoke('updater:quitAndInstall'),
  onUpdaterState: (cb) => {
    const listener = (_e, state) => cb(state);
    ipcRenderer.on('updater:state', listener);
    return () => ipcRenderer.removeListener('updater:state', listener);
  },
});
